import { prisma } from '../db/client';
import { ValidationError } from '../validation/inputs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BuyerProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  shippingAddress: Record<string, any> | null;
  billingAddress: Record<string, any> | null;
  notifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBuyerInput {
  email: string;
  name?: string;
  phone?: string;
}

export interface UpdateBuyerInput {
  buyerId: string;
  name?: string;
  phone?: string;
  shippingAddress?: Record<string, any>;
  billingAddress?: Record<string, any>;
  notifications?: boolean;
}

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Create a new buyer account or return existing one.
 */
export async function getOrCreateBuyer(
  input: CreateBuyerInput
): Promise<BuyerProfile> {
  if (!input.email) {
    throw new ValidationError('Email is required');
  }

  // Validate email format (simple check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new ValidationError('Invalid email format');
  }

  let buyer = await prisma.buyer.findUnique({
    where: { email: input.email },
  });

  if (!buyer) {
    buyer = await prisma.buyer.create({
      data: {
        email: input.email,
        name: input.name || null,
        phone: input.phone || null,
      },
    });
  }

  return formatBuyerProfile(buyer);
}

/**
 * Get buyer profile by email.
 */
export async function getBuyerByEmail(email: string): Promise<BuyerProfile> {
  if (!email) {
    throw new ValidationError('Email is required');
  }

  const buyer = await prisma.buyer.findUnique({
    where: { email },
  });

  if (!buyer) {
    throw new ValidationError('Buyer not found');
  }

  return formatBuyerProfile(buyer);
}

/**
 * Get buyer profile by ID.
 */
export async function getBuyerById(buyerId: string): Promise<BuyerProfile> {
  if (!buyerId) {
    throw new ValidationError('Buyer ID is required');
  }

  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
  });

  if (!buyer) {
    throw new ValidationError('Buyer not found');
  }

  return formatBuyerProfile(buyer);
}

/**
 * Update buyer profile.
 */
export async function updateBuyer(input: UpdateBuyerInput): Promise<BuyerProfile> {
  if (!input.buyerId) {
    throw new ValidationError('Buyer ID is required');
  }

  // Verify buyer exists
  const buyer = await prisma.buyer.findUnique({
    where: { id: input.buyerId },
  });

  if (!buyer) {
    throw new ValidationError('Buyer not found');
  }

  const updateData: any = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.phone !== undefined) {
    updateData.phone = input.phone;
  }

  if (input.shippingAddress !== undefined) {
    updateData.shippingAddress = JSON.stringify(input.shippingAddress);
  }

  if (input.billingAddress !== undefined) {
    updateData.billingAddress = JSON.stringify(input.billingAddress);
  }

  if (input.notifications !== undefined) {
    updateData.notifications = input.notifications;
  }

  const updated = await prisma.buyer.update({
    where: { id: input.buyerId },
    data: updateData,
  });

  return formatBuyerProfile(updated);
}

/**
 * Set shipping address.
 */
export interface ShippingAddressInput {
  buyerId: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export async function setShippingAddress(
  input: ShippingAddressInput
): Promise<BuyerProfile> {
  if (!input.buyerId) throw new ValidationError('Buyer ID is required');
  if (!input.name) throw new ValidationError('Name is required');
  if (!input.street) throw new ValidationError('Street address is required');
  if (!input.city) throw new ValidationError('City is required');
  if (!input.state) throw new ValidationError('State is required');
  if (!input.zip) throw new ValidationError('ZIP code is required');
  if (!input.country) throw new ValidationError('Country is required');

  const addressData = {
    name: input.name,
    phone: input.phone,
    street: input.street,
    city: input.city,
    state: input.state,
    zip: input.zip,
    country: input.country,
  };

  const buyer = await prisma.buyer.update({
    where: { id: input.buyerId },
    data: {
      shippingAddress: JSON.stringify(addressData),
    },
  });

  return formatBuyerProfile(buyer);
}

// ============================================================================
// HELPERS
// ============================================================================

function formatBuyerProfile(buyer: any): BuyerProfile {
  return {
    id: buyer.id,
    email: buyer.email,
    name: buyer.name,
    phone: buyer.phone,
    shippingAddress: buyer.shippingAddress ? JSON.parse(buyer.shippingAddress) : null,
    billingAddress: buyer.billingAddress ? JSON.parse(buyer.billingAddress) : null,
    notifications: buyer.notifications,
    createdAt: buyer.createdAt,
    updatedAt: buyer.updatedAt,
  };
}
