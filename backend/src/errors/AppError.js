/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}
