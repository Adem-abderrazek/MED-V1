/**
 * Express Application Configuration
 * 
 * Sets up Express app with middleware, routes, and error handling.
 * Separated from server.ts for better testability.
 */

import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, isDevelopment } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { errorHandler, notFoundHandler } from '@middleware/error.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import tutorRoutes from './routes/tutor.routes.js';
import userRoutes from './routes/user.routes.js';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Trust proxy (for rate limiting, etc.)
  app.set('trust proxy', 1);

  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: `${env.MAX_FILE_SIZE}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.MAX_FILE_SIZE}mb` }));

  // Static file serving for uploads
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadsDir = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Health check endpoint
  app.get('/', (_req, res) => {
    res.json({
      message: 'MediCare Backend API',
      version: '2.0.0',
      status: 'running',
      environment: env.NODE_ENV,
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/patient', patientRoutes);
  app.use('/api/medecin', doctorRoutes);
  app.use('/api/tutor', tutorRoutes);
  app.use('/api/user', userRoutes);

  // Debug token endpoint (development only)
  if (isDevelopment) {
    app.get('/api/debug/token', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') 
          ? authHeader.split(' ')[1] 
          : authHeader;
        
        if (!token) {
          return res.json({
            success: false,
            message: 'No token provided',
            hasToken: false,
          });
        }
        
        const authService = await import('@services/auth.service.js');
        const payload = authService.verifyToken(token);
        
        if (!payload) {
          return res.json({
            success: false,
            message: 'Invalid token',
            hasToken: true,
            tokenValid: false,
          });
        }
        
        res.json({
          success: true,
          message: 'Token is valid',
          hasToken: true,
          tokenValid: true,
          userInfo: {
            userId: payload.userId,
            userType: payload.userType,
            sessionId: payload.sessionId,
            permissions: payload.permissions,
            exp: payload.exp,
            iat: payload.iat,
          },
        });
      } catch (error) {
        logger.error('Debug token endpoint error', error);
        res.json({
          success: false,
          message: 'Error processing token',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  // 404 handler (must be before error handler)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}


