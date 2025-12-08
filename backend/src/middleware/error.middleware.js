import { AppError } from '../errors/AppError.js';
import config from '../config/env.js';

/**
 * Global error handling middleware
 * Handles all errors and sends appropriate responses
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 409);
  }

  if (err.code === 'P2025') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    error = new AppError(message, 422);
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const response = {
    success: false,
    message,
  };

  // Include error details in development
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
    response.error = err;
  }

  // Include validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};
