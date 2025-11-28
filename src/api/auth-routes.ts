/**
 * Authentication Routes
 * Provides token generation for development and testing
 * In production, integrate with OAuth2/SAML provider
 */

import { generateToken } from '../middleware/auth';

export interface LoginRequest {
  email: string;
  password?: string;
  role: 'admin' | 'seller' | 'buyer';
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Development login - creates a token for the specified role
 * In production, this should verify credentials against an auth provider
 */
export async function login(input: LoginRequest): Promise<LoginResponse> {
  try {
    // Development/testing - accept any email with valid role
    if (!input.email || !input.email.includes('@')) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Valid email address is required',
        },
      };
    }

    const validRoles = ['admin', 'seller', 'buyer'];
    if (!validRoles.includes(input.role)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Role must be one of: ${validRoles.join(', ')}`,
        },
      };
    }

    // Generate token
    const userId = input.email.split('@')[0]; // Simple user ID
    const token = generateToken(userId, input.email, input.role);

    return {
      success: true,
      token,
      user: {
        id: userId,
        email: input.email,
        role: input.role,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
      },
    };
  }
}
