/**
 * Authentication Routes
 * Provides token generation for development and testing
 * In production, integrate with OAuth2/SAML provider
 */

import { generateToken } from '../middleware/auth.js';
import { AppError, createSuccessResponse } from '../services/error-handler.js';

export interface LoginRequest {
  email: string;
  password?: string;
  role: 'admin' | 'seller' | 'buyer';
}

export type LoginResponse = ReturnType<typeof login>;

/**
 * Development login - creates a token for the specified role
 * In production, this should verify credentials against an auth provider
 */
export async function login(input: LoginRequest) {
  try {
    // Development/testing - accept any email with valid role
    if (!input.email || !input.email.includes('@')) {
      return AppError.validation('email', 'Valid email address is required');
    }

    const validRoles = ['admin', 'seller', 'buyer'];
    if (!validRoles.includes(input.role)) {
      return AppError.validation(
        'role',
        `Must be one of: ${validRoles.join(', ')}`
      );
    }

    // Generate token
    const userId = input.email.split('@')[0]; // Simple user ID
    const token = generateToken(userId, input.email, input.role);

    return createSuccessResponse({
      token,
      user: {
        id: userId,
        email: input.email,
        role: input.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return AppError.internalError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
