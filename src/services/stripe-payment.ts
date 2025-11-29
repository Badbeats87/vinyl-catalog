/**
 * Stripe Payment Processing Service
 * Handles payment intent creation, processing, webhooks, and order management
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const prisma = new PrismaClient();

export interface CreatePaymentIntentInput {
  orderId: string;
  amount: number; // Amount in cents
  currency: string;
  description: string;
  customerId?: string;
  email: string;
}

export interface PaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

/**
 * Create a payment intent for an order
 */
export async function createPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<PaymentIntentResult> {
  try {
    // Get or create Stripe customer
    let customerId = input.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: input.email,
        description: `Customer for order ${input.orderId}`,
      });
      customerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency.toLowerCase(),
      customer: customerId,
      description: input.description,
      metadata: {
        orderId: input.orderId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save payment intent to database
    await prisma.payment.create({
      data: {
        orderId: input.orderId,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        amount: input.amount,
        currency: input.currency,
        status: 'pending',
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret || '',
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Confirm payment and complete order
 */
export async function confirmPayment(paymentIntentId: string): Promise<PaymentIntentResult> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update order status
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'completed' },
        });

        // Update order status
        await prisma.buyerOrder.update({
          where: { id: payment.orderId },
          data: {
            status: 'paid',
            paymentStatus: 'completed',
          },
        });
      }

      return {
        success: true,
        paymentIntentId: paymentIntentId,
      };
    }

    return {
      success: false,
      error: `Payment not completed. Status: ${paymentIntent.status}`,
    };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm payment',
    };
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: any): Promise<boolean> {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      case 'dispute.created':
        await handleDisputeCreated(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return true;
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return false;
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (payment && payment.status !== 'completed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'completed' },
    });

    await prisma.buyerOrder.update({
      where: { id: payment.orderId },
      data: {
        status: 'paid',
        paymentStatus: 'completed',
      },
    });

    console.log(`Payment completed for order: ${payment.orderId}`);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (payment && payment.status !== 'failed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });

    await prisma.buyerOrder.update({
      where: { id: payment.orderId },
      data: {
        status: 'payment_failed',
        paymentStatus: 'failed',
      },
    });

    console.log(`Payment failed for order: ${payment.orderId}`);
  }
}

/**
 * Handle charge refund
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: charge.payment_intent as string },
  });

  if (payment) {
    await prisma.refund.create({
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: charge.amount_refunded,
        reason: 'Refund processed',
        status: 'completed',
      },
    });

    console.log(`Refund processed for order: ${payment.orderId}`);
  }
}

/**
 * Handle dispute/chargeback
 */
async function handleDisputeCreated(dispute: any): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: dispute.payment_intent },
  });

  if (payment) {
    await prisma.buyerOrder.update({
      where: { id: payment.orderId },
      data: {
        status: 'disputed',
      },
    });

    console.log(`Dispute created for order: ${payment.orderId}`);
  }
}

/**
 * Process refund request
 */
export async function processRefund(
  paymentIntentId: string,
  reason: string
): Promise<PaymentIntentResult> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    // Update order status
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (payment) {
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          reason: reason,
          status: 'pending',
        },
      });
    }

    return {
      success: true,
      paymentIntentId: refund.id,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process refund',
    };
  }
}

/**
 * Get payment details
 */
export async function getPaymentDetails(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      data: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve payment',
    };
  }
}

export default {
  createPaymentIntent,
  confirmPayment,
  handleWebhookEvent,
  processRefund,
  getPaymentDetails,
};
