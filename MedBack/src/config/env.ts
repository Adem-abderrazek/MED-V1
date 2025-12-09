/**
 * Environment Configuration
 * 
 * Centralized environment variable management with validation and defaults.
 * All environment variables should be accessed through this module.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // Database
  DATABASE_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // SMS Services
  EDUCANET_SMS_URL?: string;
  EDUCANET_SMS_USERNAME?: string;
  EDUCANET_SMS_PASSWORD?: string;
  
  // File Uploads
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // CORS
  CORS_ORIGIN: string;
  
  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Validates and returns environment configuration
 */
function getEnvConfig(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  
  return {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '5000', 10),
    
    DATABASE_URL: process.env.DATABASE_URL || '',
    
    JWT_SECRET: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-secret-change-in-production'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    
    EDUCANET_SMS_URL: process.env.EDUCANET_SMS_URL,
    EDUCANET_SMS_USERNAME: process.env.EDUCANET_SMS_USERNAME,
    EDUCANET_SMS_PASSWORD: process.env.EDUCANET_SMS_PASSWORD,
    
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '26214400', 10), // 25MB default
    
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    
    LOG_LEVEL: (process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug')) as EnvConfig['LOG_LEVEL'],
  };
}

/**
 * Validates required environment variables
 */
function validateEnv(config: EnvConfig): void {
  // Skip validation in test environment
  if (config.NODE_ENV === 'test') {
    return;
  }

  const required: string[] = [];
  
  // DATABASE_URL is always required (except in test)
  if (!config.DATABASE_URL) {
    required.push('DATABASE_URL');
  }
  
  // JWT_SECRET validation
  if (config.NODE_ENV === 'production') {
    if (!config.JWT_SECRET || config.JWT_SECRET === 'dev-secret-change-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }
  }
  
  const missing = required.filter(key => {
    const value = config[key as keyof EnvConfig];
    return !value || (typeof value === 'string' && value.trim() === '');
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}\n\nPlease create a .env file in the root directory with the required variables.\nSee .env.example for reference.`);
  }
}

// Get and validate configuration
const envConfig = getEnvConfig();

// Only validate in production, allow missing vars in development (with warning)
if (envConfig.NODE_ENV === 'production') {
  validateEnv(envConfig);
} else if (envConfig.NODE_ENV === 'development') {
  // In development, warn but don't throw for missing DATABASE_URL
  if (!envConfig.DATABASE_URL) {
    console.warn('⚠️  WARNING: DATABASE_URL not set. Some features may not work.');
    console.warn('   Create a .env file with DATABASE_URL=postgresql://...');
  }
}

export const env = envConfig;

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';


