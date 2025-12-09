/**
 * Server Entry Point
 * 
 * Starts the Express server.
 * Separated from app.ts for better testability.
 */

import { createApp } from './app.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { prisma } from '@config/database.js';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Create Express app
    const app = createApp();

    // Test database connection
    const dbHealthy = await prisma.$queryRaw`SELECT 1`;
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connection established');

    // Start server
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server running on http://localhost:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      
      // Log network IP if available (development)
      if (env.isDevelopment) {
        logger.info(`Server accessible on network: http://0.0.0.0:${env.PORT}`);
      }
    });


    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connection
        await prisma.$disconnect();
        logger.info('Database disconnected');
        
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason as Error, { promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();


