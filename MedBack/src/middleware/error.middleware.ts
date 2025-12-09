/**
 * Error Handling Middleware
 * 
 * Centralized error handling for Express application.
 * Catches all errors and returns consistent error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '@types/errors.js';
import { HTTP_STATUS, MESSAGES } from '@utils/constants.js';
import { logger } from '@utils/logger.js';
import { env } from '@config/env.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error', err, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
    });
  }

  // Handle AppError instances (including ValidationError)
  if (err instanceof AppError) {
    const response: any = {
      success: false,
      message: err.message,
    };

    // Add error code if present
    if (err.code) {
      response.code = err.code;
    }

    // Add validation errors if present (for ValidationError)
    if ('errors' in err && Array.isArray(err.errors) && err.errors.length > 0) {
      response.errors = err.errors;
      // Include detailed validation messages in development
      if (env.isDevelopment) {
        response.validationDetails = err.errors;
      }
    }

    // Add stack trace in development
    if (env.isDevelopment) {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // Handle unique constraint violations
    if (prismaError.code === 'P2002') {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Resource already exists',
        code: 'DUPLICATE_ENTRY',
      });
      return;
    }

    // Handle record not found
    if (prismaError.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
        code: 'RECORD_NOT_FOUND',
      });
      return;
    }
  }


  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: MESSAGES.TOKEN_INVALID,
      code: 'INVALID_TOKEN',
    });
    return;
  }

  // Default error response
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: env.isProduction ? MESSAGES.INTERNAL_ERROR : err.message,
    ...(env.isDevelopment && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


