/**
 * Authentication Controller
 * 
 * Handles HTTP requests/responses for authentication endpoints.
 * Delegates business logic to auth service.
 * 
 * Uses individual function exports for optimal performance and tree-shaking.
 */

import { Request, Response } from 'express';
import * as authService from '@services/auth.service.js';
import { LoginRequest, RegisterRequest } from '@types/auth.types.js';
import { asyncHandler } from '@middleware/error.middleware.js';
import { HTTP_STATUS } from '@utils/constants.js';

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const loginData: LoginRequest = req.body;
  const deviceInfo = req.headers['user-agent'] || 'Unknown device';

  const result = await authService.login(loginData, deviceInfo);
  return res.status(HTTP_STATUS.OK).json(result);
});

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const registerData: RegisterRequest = req.body;

  const result = await authService.register(registerData);
  return res.status(HTTP_STATUS.CREATED).json(result);
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.headers.authorization;

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'No token provided',
    });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid token',
    });
  }

  const result = await authService.logout(payload.sessionId);
  return res.status(HTTP_STATUS.OK).json(result);
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.headers.authorization;

  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'No token provided',
    });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid token',
    });
  }

  const user = await authService.getUserById(payload.userId);
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'User not found',
    });
  }

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      phoneNumber: user.phoneNumber,
    },
  });
});

/**
 * Send verification code to phone number
 * POST /api/auth/send-verification-code
 */
export const sendVerificationCode = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Phone number is required',
    });
  }

  const result = await authService.sendVerificationCode(phoneNumber);
  return res.status(HTTP_STATUS.OK).json(result);
});

/**
 * Verify code
 * POST /api/auth/verify-code
 */
export const verifyCode = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, code } = req.body;

  if (!phoneNumber || !code) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Phone number and code are required',
    });
  }

  const result = await authService.verifyCode(phoneNumber, code);
  return res.status(HTTP_STATUS.OK).json(result);
});

/**
 * Reset password with verification code
 * POST /api/auth/reset-password-with-code
 */
export const resetPasswordWithCode = asyncHandler(async (req: Request, res: Response) => {
  const { phoneNumber, code, newPassword } = req.body;

  if (!phoneNumber || !code || !newPassword) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Phone number, code, and new password are required',
    });
  }

  const result = await authService.resetPasswordWithCode(phoneNumber, code, newPassword);
  return res.status(HTTP_STATUS.OK).json(result);
});