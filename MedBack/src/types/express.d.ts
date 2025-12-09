/**
 * Express Type Extensions
 * 
 * Extends Express Request interface to include user data from JWT.
 */

import { JWTPayload } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Express.Request {
  user: JWTPayload;
}


