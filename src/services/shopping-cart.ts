import { prisma } from '../db/client.js';
import { ValidationError } from '../validation/inputs.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CartItemData {
  id: string;
  lotId: string;
  lotNumber: string;
  release: {
    title: string;
    artist: string;
  };
  conditionMedia: string;
  conditionSleeve: string;
  pricePerUnit: number;
  quantity: number;
  lineTotal: number;
}

export interface ShoppingCartData {
  id: string;
  buyerId: string;
  status: string;
  items: CartItemData[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  updatedAt: Date;
}

// ============================================================================
// CART MANAGEMENT
// ============================================================================

/**
 * Get or create a shopping cart for a buyer.
 */
export async function getOrCreateCart(buyerId: string): Promise<ShoppingCartData> {
  if (!buyerId) {
    throw new ValidationError('Buyer ID is required');
  }

  // Check if buyer exists
  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
  });

  if (!buyer) {
    throw new ValidationError('Buyer not found');
  }

  // Get active cart or create new one
  let cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId,
      status: 'active',
    },
  });

  if (!cart) {
    cart = await prisma.shoppingCart.create({
      data: {
        buyerId,
        status: 'active',
      },
    });
  }

  return formatCartResponse(cart, []);
}

/**
 * Add item to cart (or update quantity if already in cart).
 */
export interface AddToCartInput {
  buyerId: string;
  lotId: string;
  quantity: number;
}

export async function addToCart(input: AddToCartInput): Promise<ShoppingCartData> {
  if (!input.buyerId) throw new ValidationError('Buyer ID is required');
  if (!input.lotId) throw new ValidationError('Lot ID is required');
  if (!input.quantity || input.quantity < 1) {
    throw new ValidationError('Quantity must be at least 1');
  }

  // Verify inventory lot exists and is available
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: input.lotId },
    include: { release: true },
  });

  if (!lot) {
    throw new ValidationError('Inventory lot not found');
  }

  if (lot.status !== 'live' || lot.availableQuantity <= 0) {
    throw new ValidationError('This item is no longer available');
  }

  if (input.quantity > lot.availableQuantity) {
    throw new ValidationError(
      `Only ${lot.availableQuantity} item(s) available for purchase`
    );
  }

  // Get or create active cart
  let cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId: input.buyerId,
      status: 'active',
    },
  });

  if (!cart) {
    cart = await prisma.shoppingCart.create({
      data: {
        buyerId: input.buyerId,
        status: 'active',
      },
    });
  }

  // Check if item already in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_lotId: {
        cartId: cart.id,
        lotId: input.lotId,
      },
    },
  });

  const lineTotal = lot.listPrice * input.quantity;

  if (existingItem) {
    // Update quantity and line total
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: input.quantity, // Replace, not add
        lineTotal,
      },
    });
  } else {
    // Create new cart item
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        lotId: input.lotId,
        pricePerUnit: lot.listPrice,
        quantity: input.quantity,
        lineTotal,
      },
    });
  }

  // Recalculate cart totals
  return recalculateCartTotals(cart.id);
}

/**
 * Remove item from cart.
 */
export async function removeFromCart(
  buyerId: string,
  lotId: string
): Promise<ShoppingCartData> {
  if (!buyerId) throw new ValidationError('Buyer ID is required');
  if (!lotId) throw new ValidationError('Lot ID is required');

  // Get active cart
  const cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId,
      status: 'active',
    },
  });

  if (!cart) {
    throw new ValidationError('Cart not found');
  }

  // Remove item
  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      lotId,
    },
  });

  // Recalculate totals
  return recalculateCartTotals(cart.id);
}

/**
 * Update quantity of item in cart.
 */
export interface UpdateCartItemInput {
  buyerId: string;
  lotId: string;
  quantity: number;
}

export async function updateCartItemQuantity(
  input: UpdateCartItemInput
): Promise<ShoppingCartData> {
  if (!input.buyerId) throw new ValidationError('Buyer ID is required');
  if (!input.lotId) throw new ValidationError('Lot ID is required');
  if (!input.quantity) throw new ValidationError('Quantity is required');

  if (input.quantity < 0) {
    throw new ValidationError('Quantity cannot be negative');
  }

  // If quantity is 0, remove the item
  if (input.quantity === 0) {
    return removeFromCart(input.buyerId, input.lotId);
  }

  // Get active cart
  const cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId: input.buyerId,
      status: 'active',
    },
  });

  if (!cart) {
    throw new ValidationError('Cart not found');
  }

  // Verify lot and check availability
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: input.lotId },
  });

  if (!lot) {
    throw new ValidationError('Lot not found');
  }

  if (input.quantity > lot.availableQuantity) {
    throw new ValidationError(
      `Only ${lot.availableQuantity} item(s) available for purchase`
    );
  }

  // Update line total
  const lineTotal = lot.listPrice * input.quantity;

  await prisma.cartItem.update({
    where: {
      cartId_lotId: {
        cartId: cart.id,
        lotId: input.lotId,
      },
    },
    data: {
      quantity: input.quantity,
      lineTotal,
    },
  });

  // Recalculate totals
  return recalculateCartTotals(cart.id);
}

/**
 * Get current cart for buyer.
 */
export async function getCart(buyerId: string): Promise<ShoppingCartData> {
  if (!buyerId) throw new ValidationError('Buyer ID is required');

  const cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId,
      status: 'active',
    },
    include: {
      items: {
        include: {
          lot: {
            include: {
              release: {
                select: {
                  title: true,
                  artist: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    throw new ValidationError('Cart not found');
  }

  const items: CartItemData[] = cart.items.map((item) => ({
    id: item.id,
    lotId: item.lot.id,
    lotNumber: item.lot.lotNumber,
    release: {
      title: item.lot.release.title,
      artist: item.lot.release.artist,
    },
    conditionMedia: item.lot.conditionMedia,
    conditionSleeve: item.lot.conditionSleeve,
    pricePerUnit: item.pricePerUnit,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }));

  return formatCartResponse(cart, items);
}

/**
 * Clear all items from cart.
 */
export async function clearCart(buyerId: string): Promise<ShoppingCartData> {
  if (!buyerId) throw new ValidationError('Buyer ID is required');

  const cart = await prisma.shoppingCart.findFirst({
    where: {
      buyerId,
      status: 'active',
    },
  });

  if (!cart) {
    throw new ValidationError('Cart not found');
  }

  // Remove all items
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  // Reset totals
  await prisma.shoppingCart.update({
    where: { id: cart.id },
    data: {
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
    },
  });

  return formatCartResponse(cart, []);
}

// ============================================================================
// HELPERS
// ============================================================================

async function recalculateCartTotals(cartId: string): Promise<ShoppingCartData> {
  // Get all items in cart
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      lot: {
        include: {
          release: {
            select: {
              title: true,
              artist: true,
            },
          },
        },
      },
    },
  });

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  // Calculate tax (simple flat 10% for now - adjust based on actual business logic)
  const tax = subtotal * 0.1;

  // Calculate shipping (simple flat $5 for now - adjust based on actual business logic)
  const shipping = items.length > 0 ? 5 : 0;

  const total = subtotal + tax + shipping;

  // Update cart
  const cart = await prisma.shoppingCart.update({
    where: { id: cartId },
    data: {
      subtotal,
      tax,
      shipping,
      total,
    },
  });

  // Format items
  const formattedItems: CartItemData[] = items.map((item) => ({
    id: item.id,
    lotId: item.lot.id,
    lotNumber: item.lot.lotNumber,
    release: {
      title: item.lot.release.title,
      artist: item.lot.release.artist,
    },
    conditionMedia: item.lot.conditionMedia,
    conditionSleeve: item.lot.conditionSleeve,
    pricePerUnit: item.pricePerUnit,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }));

  return formatCartResponse(cart, formattedItems);
}

function formatCartResponse(
  cart: any,
  items: CartItemData[]
): ShoppingCartData {
  return {
    id: cart.id,
    buyerId: cart.buyerId,
    status: cart.status,
    items,
    subtotal: cart.subtotal,
    tax: cart.tax,
    shipping: cart.shipping,
    total: cart.total,
    updatedAt: cart.updatedAt,
  };
}
