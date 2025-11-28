import * as cartService from '../services/shopping-cart';
import * as checkoutService from '../services/checkout';
import * as buyerService from '../services/buyer-accounts';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface AddToCartInput {
  buyerId: string;
  lotId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  buyerId: string;
  lotId: string;
  quantity: number;
}

export interface CheckoutInput {
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

export interface CapturePaymentInput {
  orderId: string;
  paypalOrderId: string;
}

// ============================================================================
// CART ENDPOINTS
// ============================================================================

/**
 * Get buyer's shopping cart.
 */
export async function getCart(buyerId: string): Promise<cartService.ShoppingCartData> {
  return cartService.getCart(buyerId);
}

/**
 * Add item to cart.
 */
export async function addToCart(input: AddToCartInput): Promise<cartService.ShoppingCartData> {
  return cartService.addToCart(input);
}

/**
 * Update quantity of item in cart.
 */
export async function updateCartItemQuantity(
  input: UpdateCartItemInput
): Promise<cartService.ShoppingCartData> {
  return cartService.updateCartItemQuantity(input);
}

/**
 * Remove item from cart.
 */
export async function removeFromCart(
  buyerId: string,
  lotId: string
): Promise<cartService.ShoppingCartData> {
  return cartService.removeFromCart(buyerId, lotId);
}

/**
 * Clear all items from cart.
 */
export async function clearCart(buyerId: string): Promise<cartService.ShoppingCartData> {
  return cartService.clearCart(buyerId);
}

/**
 * Get or create cart for buyer.
 */
export async function getOrCreateCart(buyerId: string): Promise<cartService.ShoppingCartData> {
  return cartService.getOrCreateCart(buyerId);
}

// ============================================================================
// CHECKOUT ENDPOINTS
// ============================================================================

/**
 * Create order from cart and prepare for payment.
 */
export async function createOrder(input: CheckoutInput): Promise<checkoutService.CheckoutResponse> {
  return checkoutService.createOrderFromCart(input);
}

/**
 * Get order details.
 */
export async function getOrder(orderId: string): Promise<checkoutService.CheckoutResponse> {
  return checkoutService.getOrder(orderId);
}

/**
 * Get PayPal order preparation data.
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
  return checkoutService.preparePayPalOrder(orderId);
}

/**
 * Capture PayPal payment and complete order.
 * Called after PayPal authorization.
 */
export async function capturePayment(
  input: CapturePaymentInput
): Promise<checkoutService.CapturePaymentResponse> {
  return checkoutService.capturePayment(input);
}

/**
 * Get buyer's order history.
 */
export async function getBuyerOrders(
  buyerId: string,
  limit?: number,
  offset?: number
): Promise<{ orders: checkoutService.CheckoutResponse[]; total: number }> {
  return checkoutService.getBuyerOrders({ buyerId, limit, offset });
}

// ============================================================================
// BUYER ACCOUNT ENDPOINTS
// ============================================================================

/**
 * Get or create buyer account.
 */
export async function getOrCreateBuyer(
  input: buyerService.CreateBuyerInput
): Promise<buyerService.BuyerProfile> {
  return buyerService.getOrCreateBuyer(input);
}

/**
 * Get buyer profile.
 */
export async function getBuyerProfile(buyerId: string): Promise<buyerService.BuyerProfile> {
  return buyerService.getBuyerById(buyerId);
}

/**
 * Get buyer by email.
 */
export async function getBuyerByEmail(email: string): Promise<buyerService.BuyerProfile> {
  return buyerService.getBuyerByEmail(email);
}

/**
 * Update buyer profile.
 */
export async function updateBuyer(
  input: buyerService.UpdateBuyerInput
): Promise<buyerService.BuyerProfile> {
  return buyerService.updateBuyer(input);
}

/**
 * Set shipping address for buyer.
 */
export async function setShippingAddress(
  input: buyerService.ShippingAddressInput
): Promise<buyerService.BuyerProfile> {
  return buyerService.setShippingAddress(input);
}
