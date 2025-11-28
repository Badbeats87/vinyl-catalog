/**
 * Authentication & Authorization Middleware
 * Provides JWT-based authentication and role-based access control
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'seller' | 'buyer';
  };
}

/**
 * Simple in-memory token store for development
 * In production, use Redis or similar persistent store
 */
const tokenStore = new Map<string, { userId: string; email: string; role: string; expiresAt: number }>();

/**
 * Generate a simple JWT-like token for development
 * In production, use proper JWT signing with RS256 or HS256
 */
export function generateToken(userId: string, email: string, role: 'admin' | 'seller' | 'buyer'): string {
  const token = Buffer.from(JSON.stringify({ userId, email, role, iat: Date.now() })).toString('base64');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  tokenStore.set(token, { userId, email, role, expiresAt });
  return token;
}

/**
 * Verify authentication token
 */
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  const data = tokenStore.get(token);
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return null;
  }
  return { userId: data.userId, email: data.email, role: data.role };
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware: Verify authentication
 * All protected endpoints must use this middleware
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header. Expected: Authorization: Bearer <token>',
      },
    });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
    return;
  }

  req.user = {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role as 'admin' | 'seller' | 'buyer',
  };

  next();
}

/**
 * Middleware: Verify admin role
 * Use after authenticate middleware
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required. This endpoint is restricted to administrators only.',
      },
    });
    return;
  }
  next();
}

/**
 * Middleware: Verify seller role
 * Use after authenticate middleware
 */
export function requireSeller(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'seller') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Seller access required. This endpoint is for sellers only.',
      },
    });
    return;
  }
  next();
}

/**
 * Middleware: Verify buyer role
 * Use after authenticate middleware
 */
export function requireBuyer(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'buyer') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Buyer access required. This endpoint is for buyers only.',
      },
    });
    return;
  }
  next();
}

/**
 * Middleware: Allow admin to impersonate other users (development only)
 * Extracts X-Impersonate-User header if present and user is admin
 */
export function allowImpersonation(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'development') {
    next();
    return;
  }

  const impersonateUser = req.headers['x-impersonate-user'] as string;
  if (impersonateUser && req.user?.role === 'admin') {
    // Parse impersonate user header: "userId:email:role"
    const [userId, email, role] = impersonateUser.split(':');
    if (userId && email && (role === 'admin' || role === 'seller' || role === 'buyer')) {
      req.user = { id: userId, email, role: role as 'admin' | 'seller' | 'buyer' };
    }
  }

  next();
}
