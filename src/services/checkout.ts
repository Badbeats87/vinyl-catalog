import { prisma } from '../db/client';
import { ValidationError } from '../validation/inputs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CheckoutRequest {
  buyerId: string;
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface CreatePayPalOrderRequest {
  buyerId: string;
  shippingAddressJson: string;
}

export interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  buyerId: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  paymentStatus: string;
  paypalOrderId: string | null;
  items: Array<{
    lotNumber: string;
    quantity: number;
    pricePerUnit: number;
    lineTotal: number;
  }>;
}

export interface CapturePaymentRequest {
  orderId: string;
  paypalOrderId: string;
}

export interface CapturePaymentResponse {
  orderId: string;
  paymentStatus: string;
  paidAt: Date;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORDER_NUMBER_PREFIX = 'ORD';

// ============================================================================
// CHECKOUT & ORDER CREATION
// ============================================================================

/**
 * Create an order from the current cart and reserve inventory.
 * Does NOT process payment yet - returns details needed for payment flow.
 */
export async function createOrderFromCart(
  input: CheckoutRequest
): Promise<CheckoutResponse> {
  if (!input.buyerId) throw new ValidationError('Buyer ID is required');
  if (!input.shippingAddress) throw new ValidationError('Shipping address is required');

  validateShippingAddress(input.shippingAddress);

  // Get buyer
  const buyer = await prisma.buyer.findUnique({
    where: { id: input.buyerId },
  });

  if (!buyer) {
    throw new ValidationError('Buyer not found');
  }

  // Get active cart with items
  const cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId: input.buyerId,
      status: 'active',
    },
    include: {
      items: {
        include: {
          lot: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Cart is empty');
  }

  // Verify all lots are still available and have sufficient quantity
  for (const cartItem of cart.items) {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id: cartItem.lotId },
    });

    if (!lot || lot.status !== 'live') {
      throw new ValidationError(
        `Item ${cartItem.lot.lotNumber} is no longer available`
      );
    }

    if (cartItem.quantity > lot.availableQuantity) {
      throw new ValidationError(
        `Only ${lot.availableQuantity} of ${cartItem.lot.lotNumber} available`
      );
    }
  }

  // Generate unique order number
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  const orderNumber = `${ORDER_NUMBER_PREFIX}-${timestamp}-${random}`;

  const shippingAddressJson = JSON.stringify(input.shippingAddress);

  // Create order (status: pending_payment)
  const order = await prisma.buyerOrder.create({
    data: {
      orderNumber,
      buyerId: input.buyerId,
      status: 'pending_payment',
      paymentMethod: 'paypal',
      paymentStatus: 'pending',
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
      shippingAddress: shippingAddressJson,
      items: {
        create: cart.items.map((item) => ({
          lotId: item.lotId,
          pricePerUnit: item.pricePerUnit,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
      },
    },
    include: {
      items: {
        include: {
          lot: true,
        },
      },
    },
  });

  // Mark cart as checked out
  await prisma.shoppingCart.update({
    where: { id: cart.id },
    data: { status: 'checked_out' },
  });

  return formatCheckoutResponse(order);
}

/**
 * Create PayPal order payload for this order.
 * This would be called before redirecting to PayPal.
 */
export async function preparePayPalOrder(
  orderId: string
): Promise<{
  orderNumber: string;
  total: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    unitAmount: number;
  }>;
}> {
  if (!orderId) throw new ValidationError('Order ID is required');

  const order = await prisma.buyerOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          lot: {
            include: {
              release: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new ValidationError('Order not found');
  }

  // Build PayPal item list
  const items = order.items.map((item) => ({
    name: `${item.lot.release.artist} - ${item.lot.release.title} (${item.lot.conditionMedia}/${item.lot.conditionSleeve})`,
    quantity: item.quantity,
    unitAmount: item.pricePerUnit,
  }));

  return {
    orderNumber: order.orderNumber,
    total: order.total,
    currency: 'USD',
    items,
  };
}

/**
 * Capture PayPal payment and mark order as paid.
 * This should be called after PayPal payment authorization.
 */
export async function capturePayment(
  input: CapturePaymentRequest
): Promise<CapturePaymentResponse> {
  if (!input.orderId) throw new ValidationError('Order ID is required');
  if (!input.paypalOrderId) throw new ValidationError('PayPal Order ID is required');

  const order = await prisma.buyerOrder.findUnique({
    where: { id: input.orderId },
    include: {
      items: {
        include: {
          lot: true,
        },
      },
    },
  });

  if (!order) {
    throw new ValidationError('Order not found');
  }

  if (order.status !== 'pending_payment') {
    throw new ValidationError('Order is not pending payment');
  }

  // NOTE: In production, verify PayPal order details before capturing
  // This is a simplified implementation

  // Update order with PayPal details and mark as paid
  const updatedOrder = await prisma.buyerOrder.update({
    where: { id: input.orderId },
    data: {
      paypalOrderId: input.paypalOrderId,
      paymentStatus: 'captured',
      status: 'paid',
      paidAt: new Date(),
    },
  });

  // Reserve inventory (atomic operation)
  // Using a transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Update lot statuses to reserved and decrement availability
    for (const orderItem of order.items) {
      const lot = await tx.inventoryLot.findUnique({
        where: { id: orderItem.lotId },
      });

      if (!lot) {
        throw new ValidationError(`Lot ${orderItem.lotId} not found`);
      }

      if (orderItem.quantity > lot.availableQuantity) {
        throw new ValidationError(
          `Insufficient inventory for lot ${lot.lotNumber}`
        );
      }

      // Decrement available quantity
      const newAvailableQty = lot.availableQuantity - orderItem.quantity;

      // Determine new status
      let newStatus = lot.status;
      if (newAvailableQty === 0) {
        newStatus = 'sold';
      } else {
        newStatus = 'reserved';
      }

      await tx.inventoryLot.update({
        where: { id: orderItem.lotId },
        data: {
          availableQuantity: newAvailableQty,
          status: newStatus,
        },
      });
    }
  });

  return {
    orderId: updatedOrder.id,
    paymentStatus: updatedOrder.paymentStatus || 'captured',
    paidAt: updatedOrder.paidAt || new Date(),
  };
}

/**
 * Get order details.
 */
export async function getOrder(orderId: string): Promise<CheckoutResponse> {
  if (!orderId) throw new ValidationError('Order ID is required');

  const order = await prisma.buyerOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          lot: true,
        },
      },
    },
  });

  if (!order) {
    throw new ValidationError('Order not found');
  }

  return formatCheckoutResponse(order);
}

/**
 * Get buyer's order history.
 */
export interface GetOrdersInput {
  buyerId: string;
  limit?: number;
  offset?: number;
}

export async function getBuyerOrders(
  input: GetOrdersInput
): Promise<{ orders: CheckoutResponse[]; total: number }> {
  if (!input.buyerId) throw new ValidationError('Buyer ID is required');

  const limit = Math.min(input.limit || 20, 100);
  const offset = input.offset || 0;

  const total = await prisma.buyerOrder.count({
    where: { buyerId: input.buyerId },
  });

  const orders = await prisma.buyerOrder.findMany({
    where: { buyerId: input.buyerId },
    include: {
      items: {
        include: {
          lot: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return {
    orders: orders.map(formatCheckoutResponse),
    total,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function validateShippingAddress(address: any): void {
  if (!address.name) throw new ValidationError('Name is required');
  if (!address.phone) throw new ValidationError('Phone is required');
  if (!address.street) throw new ValidationError('Street is required');
  if (!address.city) throw new ValidationError('City is required');
  if (!address.state) throw new ValidationError('State is required');
  if (!address.zip) throw new ValidationError('ZIP code is required');
  if (!address.country) throw new ValidationError('Country is required');
}

function formatCheckoutResponse(order: any): CheckoutResponse {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    buyerId: order.buyerId,
    status: order.status,
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    paymentStatus: order.paymentStatus || 'pending',
    paypalOrderId: order.paypalOrderId,
    items: order.items.map((item: any) => ({
      lotNumber: item.lot.lotNumber,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      lineTotal: item.lineTotal,
    })),
  };
}
