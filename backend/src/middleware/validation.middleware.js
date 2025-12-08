import { validationResult } from 'express-validator';
import { ValidationError } from '../errors/AppError.js';

/**
 * Middleware to check validation results
 * Returns 422 if validation fails
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    
    return next(new ValidationError('Validation failed', formattedErrors));
  }
  
  next();
};
