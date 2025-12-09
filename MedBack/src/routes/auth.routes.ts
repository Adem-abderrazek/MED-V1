/**
 * Authentication Routes
 * 
 * Defines all authentication-related endpoints.
 * Routes only map to controller methods - no business logic here.
 */

import { Router } from 'express';
import {
  login,
  register,
  logout,
  getProfile,
  sendVerificationCode,
  verifyCode,
  resetPasswordWithCode,
} from '@controllers/auth.controller.js';
import { validate } from '@middleware/validation.middleware.js';
import {
  loginSchema,
  registerSchema,
  sendVerificationCodeSchema,
  verifyCodeSchema,
  resetPasswordSchema,
} from '@validators/auth.validator.js';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email/phone and password
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate session)
 * @access  Public (requires token in header)
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Public (requires token in header)
 */
router.get('/profile', getProfile);

/**
 * @route   POST /api/auth/send-verification-code
 * @desc    Send verification code to phone number
 * @access  Public
 */
router.post(
  '/send-verification-code',
  validate(sendVerificationCodeSchema),
  sendVerificationCode
);

/**
 * @route   POST /api/auth/verify-code
 * @desc    Verify code
 * @access  Public
 */
router.post('/verify-code', validate(verifyCodeSchema), verifyCode);

/**
 * @route   POST /api/auth/reset-password-with-code
 * @desc    Reset password with verification code
 * @access  Public
 */
router.post(
  '/reset-password-with-code',
  validate(resetPasswordSchema),
  resetPasswordWithCode
);

export default router;