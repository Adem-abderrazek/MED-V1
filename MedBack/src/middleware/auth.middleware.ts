/**
 * Authentication Middleware
 * 
 * Handles JWT token authentication and authorization checks.
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@types/errors.js';
import * as authService from '@services/auth.service.js';
import { logger } from '@utils/logger.js';
import { AuthenticatedRequest } from '@types/express.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : authHeader;

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Verify session exists and is valid
    const session = await authService.getSessionById(payload.sessionId);
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired');
    }

    // Add user data to request
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication middleware error', error);
    next(error);
  }
};

/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!req.user.permissions.includes(permission)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware to check if user has specific user type
 */
export const requireUserType = (
  userTypes: ('tuteur' | 'medecin' | 'patient')[]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!userTypes.includes(req.user.userType)) {
      throw new ForbiddenError('Access denied for this user type');
    }

    next();
  };
};


