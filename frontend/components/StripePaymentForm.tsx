'use client';

import React, { useState, useCallback } from 'react';
import {
  CardElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useApiError } from '@/lib/use-api-error';

export interface PaymentFormData {
  email: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  orderId: string;
  formData: PaymentFormData;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#32325d',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  currency,
  orderId,
  formData,
  onSuccess,
  onError,
  isLoading = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { error, clearError, handleApiError } = useApiError();
  const [processing, setProcessing] = useState(false);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();

      if (!stripe || !elements) {
        handleApiError('Stripe is not loaded');
        return;
      }

      // Validate form data
      if (
        !formData.name ||
        !formData.email ||
        !formData.address ||
        !formData.city ||
        !formData.state ||
        !formData.zip
      ) {
        handleApiError('Please fill in all required fields');
        return;
      }

      setProcessing(true);

      try {
        // Create payment intent
        const paymentIntentResponse = await fetch(
          '/api/buyer/payment-intent',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(amount * 100), // Convert to cents
              currency: currency.toUpperCase(),
              orderId,
              email: formData.email,
              name: formData.name,
            }),
          }
        );

        if (!paymentIntentResponse.ok) {
          throw new Error('Failed to create payment intent');
        }

        const { clientSecret } = await paymentIntentResponse.json();

        // Confirm payment with Stripe
        const { error: stripeError, paymentIntent } =
          await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: elements.getElement(CardElement)!,
              billing_details: {
                name: formData.name,
                email: formData.email,
                address: {
                  line1: formData.address,
                  city: formData.city,
                  state: formData.state,
                  postal_code: formData.zip,
                },
              },
            },
          });

        if (stripeError) {
          handleApiError(stripeError.message || 'Payment failed');
          onError?.(stripeError.message || 'Payment failed');
        } else if (paymentIntent?.status === 'succeeded') {
          onSuccess(paymentIntent.id);
        } else {
          handleApiError(
            'Payment could not be completed. Please try again.'
          );
          onError?.('Payment could not be completed');
        }
      } catch (err) {
        handleApiError(err);
        onError?.(typeof err === 'string' ? err : 'Payment processing failed');
      } finally {
        setProcessing(false);
      }
    },
    [stripe, elements, amount, currency, orderId, formData, onSuccess, onError, clearError, handleApiError]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
          severity="error"
        />
      )}

      {/* Card Details Section */}
      <div className="border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>

        {/* Card Number Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number <span className="text-red-600">*</span>
          </label>
          <div
            className={`px-4 py-3 border rounded-lg bg-white transition ${
              focusedElement === 'card'
                ? 'border-blue-500 ring-1 ring-blue-500'
                : 'border-gray-300'
            }`}
          >
            <CardElement
              options={CARD_ELEMENT_OPTIONS}
              onFocus={() => setFocusedElement('card')}
              onBlur={() => setFocusedElement(null)}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Your card information is processed securely by Stripe
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Order Summary
        </h3>

        <div className="space-y-2 mb-4 pb-4 border-b border-gray-300">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${(amount * 0.9).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium">$10.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (10%)</span>
            <span className="font-medium">
              ${(amount * 0.1).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-between text-lg">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-green-600">
            ${amount.toFixed(2)} {currency}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={processing || isLoading || !stripe}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
      >
        {processing || isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Processing Payment...
          </span>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </button>

      {/* Security Info */}
      <div className="text-center text-xs text-gray-600 space-y-1">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p>Powered by Stripe - PCI DSS Level 1 compliant</p>
      </div>
    </form>
  );
};

export default StripePaymentForm;
