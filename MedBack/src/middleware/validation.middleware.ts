/**
 * Validation Middleware
 * 
 * Middleware for validating request data using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '@types/errors.js';

/**
 * Validate request data against a Zod schema
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.path.length > 0 ? (req.body as any)[err.path[0]] : undefined,
        }));

        // Log validation error details in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Validation failed:', {
            path: req.path,
            body: req.body,
            errors: error.errors,
          });
        }

        throw new ValidationError('Validation failed', errors);
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ValidationError('Query validation failed', errors);
      }
      next(error);
    }
  };
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ValidationError('Parameter validation failed', errors);
      }
      next(error);
    }
  };
};


