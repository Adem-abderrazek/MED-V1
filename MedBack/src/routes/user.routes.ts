/**
 * User Routes
 * 
 * Universal profile endpoints for all user types.
 */

import { Router } from 'express';
import { authenticateToken } from '@middleware/auth.middleware.js';
import { getUserProfile, updateUserProfile } from '@controllers/user.controller.js';
import { validate } from '@middleware/validation.middleware.js';
import { updateUserProfileSchema } from '@validators/user.validator.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Universal profile endpoints for all user types
router.get('/profile', getUserProfile);
router.put('/profile', validate({ body: updateUserProfileSchema }), updateUserProfile);

export default router;


