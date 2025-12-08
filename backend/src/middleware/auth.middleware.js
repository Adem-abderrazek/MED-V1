import authService from '../services/auth.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

/**
 * Middleware to authenticate JWT token
 * Attaches user payload to req.user if token is valid
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new UnauthorizedError('Access token required'));
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    // Verify session exists and is valid
    const session = await authService.getSessionById(payload.sessionId);
    if (!session || session.expiresAt < new Date()) {
      return next(new UnauthorizedError('Session expired'));
    }

    // Add user data to request
    req.user = payload;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    next(error);
  }
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Required permission
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!req.user.permissions.includes(permission)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissions - Array of allowed permissions
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasPermission = permissions.some(permission => 
      req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Middleware to check if user has specific user type
 * @param {string[]} userTypes - Array of allowed user types
 */
export const requireUserType = (userTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!userTypes.includes(req.user.userType)) {
      return next(new UnauthorizedError('Access denied for this user type'));
    }

    next();
  };
};
