/**
 * Database Configuration
 * 
 * Prisma client singleton instance for database operations.
 * Ensures only one instance is created and reused across the application.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@utils/logger.js';

// Configure Prisma logging based on environment
// Set PRISMA_LOG_QUERIES=true in .env to enable query logging (disabled by default)
const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

const prismaClientOptions = {
  log: shouldLogQueries
    ? ['query', 'error', 'warn'] as const
    : isDevelopment
    ? ['error', 'warn'] as const
    : ['error'] as const,
};

class Database {
  private static instance: PrismaClient | null = null;

  /**
   * Get Prisma client instance (singleton pattern)
   */
  static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient(prismaClientOptions);
      
      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await Database.disconnect();
      });
      
      logger.info('Database client initialized');
    }
    
    return Database.instance;
  }

  /**
   * Disconnect from database
   */
  static async disconnect(): Promise<void> {
    if (Database.instance) {
      await Database.instance.$disconnect();
      Database.instance = null;
      logger.info('Database disconnected');
    }
  }

  /**
   * Health check - test database connection
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = Database.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const prisma = Database.getInstance();

// Export database utilities
export default prisma;


