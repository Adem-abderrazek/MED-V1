/**
 * Authentication Service
 * 
 * Handles user authentication, registration, session management, and verification codes.
 * All business logic for authentication is contained here.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@config/database.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  JWTPayload 
} from '@types/auth.types.js';
import { 
  UnauthorizedError, 
  ConflictError, 
  BadRequestError,
  NotFoundError,
} from '@types/errors.js';
import { sendVerificationCode as sendVerificationCodeSMS } from './sms.service.js';
import { normalizePhoneNumber, normalizeEmail } from '@utils/phoneNormalizer.js';
import { PERMISSIONS, VERIFICATION_CODE, SESSION, MESSAGES } from '@utils/constants.js';
import { UserType } from '@utils/constants.js';

// In-memory storage for verification codes (TODO: Use Redis in production)
const verificationCodes = new Map<string, { code: string; timestamp: number }>();

/**
 * Clean up expired verification codes
 */
function cleanupExpiredCodes(): void {
  const now = Date.now();
  const expiryMs = VERIFICATION_CODE.EXPIRY_MINUTES * 60 * 1000;
  
  for (const [key, value] of verificationCodes.entries()) {
    if (now - value.timestamp > expiryMs) {
      verificationCodes.delete(key);
    }
  }
}

/**
 * Generate JWT token
 */
function generateToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
    return jwt.sign(payload, env.JWT_SECRET, { 
      expiresIn: env.JWT_EXPIRES_IN,
    });
}

/**
 * Get user permissions based on user type
 */
function getUserPermissions(userType: UserType): string[] {
    const permissions = {
      tuteur: [
        PERMISSIONS.READ_PATIENT,
        PERMISSIONS.READ_MEDICATION,
        PERMISSIONS.READ_REMINDER,
        PERMISSIONS.CREATE_REMINDER,
        PERMISSIONS.UPDATE_REMINDER,
        PERMISSIONS.READ_ALERT,
        PERMISSIONS.CREATE_ALERT,
        PERMISSIONS.READ_VOICE_MESSAGE,
        PERMISSIONS.CREATE_VOICE_MESSAGE,
      ],
      medecin: [
        PERMISSIONS.READ_PATIENT,
        PERMISSIONS.CREATE_PATIENT,
        PERMISSIONS.UPDATE_PATIENT,
        PERMISSIONS.READ_MEDICATION,
        PERMISSIONS.CREATE_MEDICATION,
        PERMISSIONS.UPDATE_MEDICATION,
        PERMISSIONS.DELETE_MEDICATION,
        PERMISSIONS.READ_PRESCRIPTION,
        PERMISSIONS.CREATE_PRESCRIPTION,
        PERMISSIONS.UPDATE_PRESCRIPTION,
        PERMISSIONS.DELETE_PRESCRIPTION,
        PERMISSIONS.READ_REMINDER,
        PERMISSIONS.CREATE_REMINDER,
        PERMISSIONS.UPDATE_REMINDER,
        PERMISSIONS.READ_ALERT,
        PERMISSIONS.CREATE_ALERT,
        PERMISSIONS.READ_VOICE_MESSAGE,
        PERMISSIONS.CREATE_VOICE_MESSAGE,
      ],
      patient: [
        PERMISSIONS.READ_OWN_MEDICATION,
        PERMISSIONS.READ_OWN_REMINDER,
        PERMISSIONS.UPDATE_OWN_REMINDER,
        PERMISSIONS.READ_OWN_ALERT,
        PERMISSIONS.READ_OWN_VOICE_MESSAGE,
        PERMISSIONS.CREATE_OWN_VOICE_MESSAGE,
      ],
    };

    return permissions[userType] || [];
}

/**
 * Create or update user session
 */
async function createUserSession(userId: string, deviceInfo?: string): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION.EXPIRY_HOURS);

    const existingSession = await prisma.userSession.findUnique({
      where: { userId },
    });

    if (existingSession) {
      // Update existing session - keep the same ID so existing tokens remain valid
      await prisma.userSession.update({
        where: { userId },
        data: {
          sessionToken: existingSession.id, // Keep same token
          deviceInfo: deviceInfo || existingSession.deviceInfo || 'Unknown device',
          expiresAt,
          lastActivity: new Date(),
        },
      });
      return existingSession.id; // Return existing session ID
    } else {
      // Create new session
      const sessionId = uuidv4();
      await prisma.userSession.create({
        data: {
          id: sessionId,
          userId,
          sessionToken: sessionId,
          deviceInfo: deviceInfo || 'Unknown device',
          expiresAt,
        },
      });
      return sessionId;
    }
}

/**
 * Login user with email/phone and password
 */
export async function login(loginData: LoginRequest, deviceInfo?: string): Promise<LoginResponse> {
    try {
      const { emailOrPhone, password, pushToken } = loginData;
      const cleanInput = emailOrPhone.trim();
      const isEmail = cleanInput.includes('@');
      const isPhone = /^\+?[0-9\s\-\(\)]+$/.test(cleanInput.replace(/\s/g, ''));

      logger.debug('Login attempt', { input: cleanInput, isEmail, isPhone });

      let user = null;

      if (isEmail) {
        const emailNormalized = normalizeEmail(cleanInput);
        user = await prisma.user.findUnique({
          where: { email: emailNormalized },
        });
      } else if (isPhone) {
        const phoneResult = normalizePhoneNumber(cleanInput);

        if (!phoneResult.isValid) {
          throw new BadRequestError('Format de numéro de téléphone invalide');
        }

        user = await prisma.user.findFirst({
          where: {
            OR: phoneResult.formats.map(phone => ({ phoneNumber: phone })),
          },
        });
      } else {
        throw new BadRequestError('Please provide a valid email or phone number');
      }

      if (!user) {
        const message = isEmail 
          ? 'Aucun compte trouvé avec cette adresse e-mail'
          : 'Aucun compte trouvé avec ce numéro de téléphone';
        throw new UnauthorizedError(message);
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Mot de passe incorrect');
      }

      // Create session
      const sessionId = await createUserSession(user.id, deviceInfo);

      // Update last login and push token
      const updateData: any = { lastLogin: new Date() };
      if (pushToken) {
        updateData.expoPushToken = pushToken;
        logger.debug('Auto-saving push token', { userId: user.id });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Generate token
      const permissions = getUserPermissions(user.userType);
      const tokenPayload: Omit<JWTPayload, 'exp' | 'iat'> = {
        userId: user.id,
        userType: user.userType,
        sessionId,
        permissions,
      };

      const token = generateToken(tokenPayload);

      logger.info('User logged in successfully', { userId: user.id, userType: user.userType });

      return {
        success: true,
        message: MESSAGES.LOGIN_SUCCESS,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          phoneNumber: user.phoneNumber,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Login error', error);
      throw new UnauthorizedError('Login failed');
    }
}

/**
 * Register new user
 */
export async function register(registerData: RegisterRequest): Promise<LoginResponse> {
    try {
      const { email, password, firstName, lastName, phoneNumber, userType } = registerData;

      const emailNormalized = normalizeEmail(email);
      const phoneResult = normalizePhoneNumber(phoneNumber);

      logger.debug('Registration attempt', {
        email: emailNormalized,
        phone: phoneResult.normalized,
      });

      if (!phoneResult.isValid) {
        throw new BadRequestError('Format de numéro de téléphone invalide');
      }

      // Check if email exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: emailNormalized },
      });

      if (existingEmail) {
        throw new ConflictError('Un compte existe déjà avec cet email');
      }

      // Check if phone exists
      const existingPhone = await prisma.user.findFirst({
        where: {
          OR: phoneResult.formats.map(phone => ({ phoneNumber: phone })),
        },
      });

      if (existingPhone) {
        throw new ConflictError('Un compte existe déjà avec ce numéro de téléphone');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: emailNormalized,
          passwordHash,
          firstName,
          lastName,
          phoneNumber: phoneResult.normalized,
          userType,
        },
      });

      // Create session
      const sessionId = await createUserSession(user.id);

      // Generate token
      const permissions = getUserPermissions(user.userType);
      const tokenPayload: Omit<JWTPayload, 'exp' | 'iat'> = {
        userId: user.id,
        userType: user.userType,
        sessionId,
        permissions,
      };

      const token = generateToken(tokenPayload);

      logger.info('User registered successfully', { userId: user.id, userType: user.userType });

      return {
        success: true,
        message: MESSAGES.REGISTER_SUCCESS,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          phoneNumber: user.phoneNumber,
        },
      };
    } catch (error) {
      if (error instanceof ConflictError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Registration error', error);
      throw new BadRequestError('Registration failed');
    }
}

/**
 * Logout user by invalidating session
 */
export async function logout(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.userSession.delete({
        where: { id: sessionId },
      });

      logger.info('User logged out', { sessionId });
      return {
        success: true,
        message: MESSAGES.LOGOUT_SUCCESS,
      };
    } catch (error) {
      logger.error('Logout error', error);
      throw new BadRequestError('Logout failed');
    }
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      logger.debug('Token verification failed', { error });
      return null;
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      logger.error('Get user by ID error', error);
      return null;
    }
}

/**
 * Get session by ID
 */
export async function getSessionById(sessionId: string) {
    try {
      return await prisma.userSession.findUnique({
        where: { id: sessionId },
      });
    } catch (error) {
      logger.error('Get session by ID error', error);
      return null;
    }
}

/**
 * Send verification code via SMS
 */
export async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.debug('Sending verification code', { phoneNumber });

      const phoneResult = normalizePhoneNumber(phoneNumber);
      
      if (!phoneResult.isValid) {
        throw new BadRequestError('Format de numéro de téléphone invalide');
      }
      
      // Generate 4-digit code
      const verificationCode = Math.floor(
        VERIFICATION_CODE.MIN_VALUE + 
        Math.random() * (VERIFICATION_CODE.MAX_VALUE - VERIFICATION_CODE.MIN_VALUE)
      ).toString();
      
      // Store code with normalized phone
      verificationCodes.set(phoneResult.normalized, {
        code: verificationCode,
        timestamp: Date.now(),
      });
      
      cleanupExpiredCodes();
      
      // Send SMS using normalized phone number
      const smsResult = await sendVerificationCodeSMS(
        phoneResult.normalized, 
        verificationCode
      );
      
      if (smsResult.success) {
        logger.info('Verification code sent', { phoneNumber: phoneResult.normalized });
        return {
          success: true,
          message: MESSAGES.CODE_SENT,
        };
      } else {
        logger.error('SMS send failed', new Error(smsResult.error || 'Unknown error'));
        throw new BadRequestError(`Erreur lors de l'envoi du SMS: ${smsResult.error}`);
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error sending verification code', error);
      throw new BadRequestError("Erreur lors de l'envoi du code de vérification");
    }
}

/**
 * Verify code
 */
export async function verifyCode(phoneNumber: string, code: string): Promise<{ 
  success: boolean; 
  message: string;
  data?: { verified: boolean };
}> {
    try {
      logger.debug('Verifying code', { phoneNumber });

      const phoneResult = normalizePhoneNumber(phoneNumber);
      
      if (!phoneResult.isValid) {
        throw new BadRequestError('Format de numéro de téléphone invalide');
      }
      
      cleanupExpiredCodes();
      
      const storedCodeData = verificationCodes.get(phoneResult.normalized);
      
      if (!storedCodeData) {
        throw new BadRequestError(
          'Code de vérification expiré ou introuvable. Veuillez demander un nouveau code.'
        );
      }
      
      if (storedCodeData.code === code) {
        logger.info('Code verified successfully', { phoneNumber: phoneResult.normalized });
        return {
          success: true,
          message: MESSAGES.CODE_VERIFIED,
          data: { verified: true },
        };
      } else {
        throw new BadRequestError('Code de vérification incorrect');
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error verifying code', error);
      throw new BadRequestError('Code verification failed');
    }
}

/**
 * Reset password with verification code
 */
export async function resetPasswordWithCode(
  phoneNumber: string, 
  code: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> {
    try {
      logger.debug('Resetting password with code', { phoneNumber });

      const phoneResult = normalizePhoneNumber(phoneNumber);
      
      if (!phoneResult.isValid) {
        throw new BadRequestError('Format de numéro de téléphone invalide');
      }
      
      cleanupExpiredCodes();
      
      const storedCodeData = verificationCodes.get(phoneResult.normalized);
      
      if (!storedCodeData) {
        throw new BadRequestError(
          'Code de vérification expiré ou introuvable. Veuillez demander un nouveau code.'
        );
      }
      
      if (storedCodeData.code !== code) {
        throw new BadRequestError('Code de vérification incorrect');
      }
      
      // Find user
      const user = await prisma.user.findFirst({
        where: {
          OR: phoneResult.formats.map(phone => ({ phoneNumber: phone })),
        },
      });

      if (!user) {
        throw new NotFoundError('Utilisateur non trouvé');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      
      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Delete verification code
      verificationCodes.delete(phoneResult.normalized);

      logger.info('Password reset successfully', { userId: user.id });
      
      return {
        success: true,
        message: MESSAGES.PASSWORD_RESET,
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error resetting password', error);
      throw new BadRequestError('Erreur lors de la réinitialisation du mot de passe');
    }
}


