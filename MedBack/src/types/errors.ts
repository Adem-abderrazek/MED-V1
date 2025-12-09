/**
 * Custom Error Types
 * 
 * Custom error classes for better error handling and HTTP status code management.
 */

import { HTTP_STATUS } from '@utils/constants.js';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code?: string) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, code);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, HTTP_STATUS.UNAUTHORIZED, true, code);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, HTTP_STATUS.FORBIDDEN, true, code);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, HTTP_STATUS.NOT_FOUND, true, code);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', code?: string) {
    super(message, HTTP_STATUS.CONFLICT, true, code);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;
  
  constructor(
    message: string = 'Validation failed',
    errors: Array<{ field: string; message: string }> = [],
    code?: string
  ) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, true, code);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', code?: string) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, code);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}


