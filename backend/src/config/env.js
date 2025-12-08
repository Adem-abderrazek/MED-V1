import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration
 * Validates and exports all environment variables
 */
const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // SMS Service
  smsBaseUrl: process.env.SMS_BASE_URL || 'https://mon-compte.educanet.pro/mobile/notificationgeneral/sendsms/Medicare',
  
  // Firebase (Push Notifications)
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  
  // Timezone
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Africa/Tunis',
  
  // Upload
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: process.env.MAX_FILE_SIZE || '25mb',
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push('JWT_SECRET');
}

for (const envVar of requiredEnvVars) {
  if (!config[envVar.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
