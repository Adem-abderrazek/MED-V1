/**
 * User Controller
 * 
 * Handles HTTP requests for user profile operations.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@middleware/error.middleware.js';
import * as userService from '@services/user.service.js';
import { HTTP_STATUS } from '@utils/constants.js';

/**
 * Get user profile for any user type
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const profile = await userService.getUserProfile(userId);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: profile,
    message: 'Profile data retrieved successfully',
  });
});

/**
 * Update user profile for any user type
 */
export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const profileData = req.body;

  await userService.updateUserProfile(userId, profileData);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile updated successfully',
  });
});


