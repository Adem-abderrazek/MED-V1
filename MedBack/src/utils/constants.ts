/**
 * Application Constants
 * 
 * Centralized constants to replace magic strings and numbers throughout the codebase.
 */

// User Types
export const USER_TYPES = {
  TUTEUR: 'tuteur',
  MEDECIN: 'medecin',
  PATIENT: 'patient',
} as const;

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES];

// Relationship Types
export const RELATIONSHIP_TYPES = {
  TUTEUR: 'tuteur',
  MEDECIN: 'medecin',
} as const;

// Invitation Status
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
} as const;

// Reminder Status
export const REMINDER_STATUS = {
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  CONFIRMED: 'confirmed',
  MISSED: 'missed',
  MANUAL_CONFIRM: 'manual_confirm',
  CANCELLED: 'cancelled',
} as const;

// Confirmation Types
export const CONFIRMATION_TYPES = {
  PATIENT: 'patient',
  TUTEUR_MANUAL: 'tuteur_manual',
} as const;

// Alert Types
export const ALERT_TYPES = {
  MISSED_MEDICATION: 'missed_medication',
  NO_RESPONSE: 'no_response',
} as const;

// Alert Status
export const ALERT_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
} as const;

// Schedule Types
export const SCHEDULE_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  INTERVAL: 'interval',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// API Response Messages
export const MESSAGES = {
  // Success
  SUCCESS: 'Operation successful',
  LOGIN_SUCCESS: 'Login successful',
  REGISTER_SUCCESS: 'Registration successful',
  LOGOUT_SUCCESS: 'Logout successful',
  
  // Errors
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  CONFLICT: 'Resource already exists',
  
  // Auth
  INVALID_CREDENTIALS: 'Invalid email/phone or password',
  TOKEN_REQUIRED: 'Access token required',
  TOKEN_INVALID: 'Invalid or expired token',
  SESSION_EXPIRED: 'Session expired',
  
  // User
  USER_NOT_FOUND: 'User not found',
  USER_EXISTS: 'User already exists',
  ACCOUNT_DEACTIVATED: 'Account is deactivated',
  
  // Verification
  CODE_SENT: 'Verification code sent successfully',
  CODE_VERIFIED: 'Code verified successfully',
  CODE_INVALID: 'Invalid or expired verification code',
  PASSWORD_RESET: 'Password reset successfully',
} as const;

// Permissions
export const PERMISSIONS = {
  // Patient permissions
  READ_OWN_MEDICATION: 'read:own_medication',
  READ_OWN_REMINDER: 'read:own_reminder',
  UPDATE_OWN_REMINDER: 'update:own_reminder',
  READ_OWN_ALERT: 'read:own_alert',
  READ_OWN_VOICE_MESSAGE: 'read:own_voice_message',
  CREATE_OWN_VOICE_MESSAGE: 'create:own_voice_message',
  
  // Tutor permissions
  READ_PATIENT: 'read:patient',
  READ_MEDICATION: 'read:medication',
  READ_REMINDER: 'read:reminder',
  CREATE_REMINDER: 'create:reminder',
  UPDATE_REMINDER: 'update:reminder',
  READ_ALERT: 'read:alert',
  CREATE_ALERT: 'create:alert',
  READ_VOICE_MESSAGE: 'read:voice_message',
  CREATE_VOICE_MESSAGE: 'create:voice_message',
  
  // Doctor permissions
  CREATE_PATIENT: 'create:patient',
  UPDATE_PATIENT: 'update:patient',
  CREATE_MEDICATION: 'create:medication',
  UPDATE_MEDICATION: 'update:medication',
  DELETE_MEDICATION: 'delete:medication',
  READ_PRESCRIPTION: 'read:prescription',
  CREATE_PRESCRIPTION: 'create:prescription',
  UPDATE_PRESCRIPTION: 'update:prescription',
  DELETE_PRESCRIPTION: 'delete:prescription',
} as const;

// Verification Code Settings
export const VERIFICATION_CODE = {
  LENGTH: 4,
  MIN_VALUE: 1000,
  MAX_VALUE: 9999,
  EXPIRY_MINUTES: 10,
} as const;

// Session Settings
export const SESSION = {
  EXPIRY_HOURS: 24,
} as const;

// File Upload Settings
export const FILE_UPLOAD = {
  MAX_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_MIME_TYPES: ['audio/m4a', 'audio/mp3', 'audio/wav', 'audio/aac'],
  UPLOAD_DIR: './uploads',
} as const;

// Timezone
export const DEFAULT_TIMEZONE = 'Africa/Tunis';
export const DEFAULT_LANGUAGE = 'fr';


