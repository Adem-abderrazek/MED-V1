/**
 * Authentication Types
 */

import { UserType } from '@utils/constants.js';

export interface JWTPayload {
  userId: string;
  userType: UserType;
  sessionId: string;
  permissions: string[];
  exp: number;
  iat: number;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
  pushToken?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    phoneNumber: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  userType: UserType;
}

export interface AuthError {
  success: false;
  message: string;
  field?: string;
}


