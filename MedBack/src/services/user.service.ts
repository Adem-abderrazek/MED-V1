/**
 * User Service
 * 
 * Handles user profile operations for all user types.
 */

import { prisma } from '@config/database.js';
import { logger } from '@utils/logger.js';
import { NotFoundError, BadRequestError, ConflictError } from '@types/errors.js';
import { UserType } from '@utils/constants.js';

export interface UserProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  userType: UserType;
  notificationsEnabled?: boolean;
  expoPushToken?: string;
  timezone?: string;
  language?: string;
  appSettings?: any;
  dateOfBirth?: Date;
  address?: string;
  emergencyContact?: string;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  bio?: string;
  profilePicture?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  totalMedications?: number;
  adherenceRate?: number;
  totalPatients?: number;
  totalPrescriptions?: number;
  lastActivity: string;
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  notificationsEnabled?: boolean;
  dateOfBirth?: Date;
  address?: string;
  emergencyContact?: string;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  bio?: string;
  profilePicture?: string;
}

/**
 * Get patient-specific statistics
 */
async function getPatientStatistics(patientId: string) {
  const totalMedications = await prisma.prescription.count({
    where: {
      patientId,
      isActive: true,
    },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const totalReminders = await prisma.medicationReminder.count({
    where: {
      patientId,
      scheduledFor: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const takenReminders = await prisma.medicationReminder.count({
    where: {
      patientId,
      scheduledFor: {
        gte: thirtyDaysAgo,
      },
      status: {
        in: ['confirmed', 'manual_confirm'],
      },
    },
  });

  const adherenceRate = totalReminders > 0
    ? Math.round((takenReminders / totalReminders) * 100)
    : 0;

  return {
    totalMedications,
    adherenceRate,
  };
}

/**
 * Get tutor-specific statistics
 */
async function getTutorStatistics(tutorId: string) {
  const totalPatients = await prisma.userRelationship.count({
    where: {
      caregiverId: tutorId,
      isActive: true,
    },
  });

  return {
    totalPatients,
  };
}

/**
 * Get doctor-specific statistics
 */
async function getDoctorStatistics(doctorId: string) {
  const totalPatients = await prisma.prescription.groupBy({
    by: ['patientId'],
    where: {
      prescribedBy: doctorId,
      isActive: true,
    },
  });

  const totalPrescriptions = await prisma.prescription.count({
    where: {
      prescribedBy: doctorId,
      isActive: true,
    },
  });

  return {
    totalPatients: totalPatients.length,
    totalPrescriptions,
  };
}

/**
 * Calculate last activity based on user type
 */
async function calculateLastActivity(userId: string, userType: UserType): Promise<string> {
  let lastActivityTime: Date | null = null;

  switch (userType) {
    case 'patient': {
      const lastReminder = await prisma.medicationReminder.findFirst({
        where: { patientId: userId },
        orderBy: { createdAt: 'desc' },
      });
      const lastAlert = await prisma.alert.findFirst({
        where: { patientId: userId },
        orderBy: { createdAt: 'desc' },
      });

      const reminderTime = lastReminder?.createdAt || null;
      const alertTime = lastAlert?.createdAt || null;
      lastActivityTime = reminderTime && alertTime
        ? (reminderTime > alertTime ? reminderTime : alertTime)
        : (reminderTime || alertTime);
      break;
    }

    case 'tuteur': {
      const lastVoiceMessage = await prisma.voiceMessage.findFirst({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' },
      });
      const lastTutorAlert = await prisma.alert.findFirst({
        where: { tuteurId: userId },
        orderBy: { createdAt: 'desc' },
      });

      const voiceTime = lastVoiceMessage?.createdAt || null;
      const tutorAlertTime = lastTutorAlert?.createdAt || null;
      lastActivityTime = voiceTime && tutorAlertTime
        ? (voiceTime > tutorAlertTime ? voiceTime : tutorAlertTime)
        : (voiceTime || tutorAlertTime);
      break;
    }

    case 'medecin': {
      const lastPrescription = await prisma.prescription.findFirst({
        where: { prescribedBy: userId },
        orderBy: { createdAt: 'desc' },
      });
      lastActivityTime = lastPrescription?.createdAt || null;
      break;
    }
  }

  if (!lastActivityTime) {
    return 'Aucune activité';
  }

  const diffInHours = (new Date().getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    return `Il y a ${Math.floor(diffInHours * 60)} min`;
  } else if (diffInHours < 24) {
    return `Il y a ${Math.floor(diffInHours)}h`;
  } else {
    return `Il y a ${Math.floor(diffInHours / 24)} jour(s)`;
  }
}

/**
 * Get user profile data for any user type
 */
export async function getUserProfile(userId: string): Promise<UserProfileData> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        userType: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        notificationsEnabled: true,
        expoPushToken: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const userSettings = await prisma.userSetting.findUnique({
      where: { userId },
      select: {
        timezone: true,
        language: true,
        appSettings: true,
        notificationPreferences: true,
      },
    });

    const profileData = userSettings?.appSettings as any || {};

    let statistics = {};
    switch (user.userType) {
      case 'patient':
        statistics = await getPatientStatistics(userId);
        break;
      case 'tuteur':
        statistics = await getTutorStatistics(userId);
        break;
      case 'medecin':
        statistics = await getDoctorStatistics(userId);
        break;
    }

    const lastActivity = await calculateLastActivity(userId, user.userType);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      phone: user.phoneNumber,
      userType: user.userType,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || undefined,
      lastActivity,
      notificationsEnabled: user.notificationsEnabled,
      expoPushToken: user.expoPushToken || undefined,
      timezone: userSettings?.timezone || undefined,
      language: userSettings?.language || undefined,
      appSettings: {
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
        address: profileData.address,
        emergencyContact: profileData.emergencyContact,
        specialization: profileData.specialization,
        licenseNumber: profileData.licenseNumber,
        department: profileData.department,
        bio: profileData.bio,
        profilePicture: profileData.profilePicture,
      },
      dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
      address: profileData.address,
      emergencyContact: profileData.emergencyContact,
      specialization: profileData.specialization,
      licenseNumber: profileData.licenseNumber,
      department: profileData.department,
      bio: profileData.bio,
      profilePicture: profileData.profilePicture,
      ...statistics,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Error getting user profile', error);
    throw new BadRequestError('Failed to get user profile');
  }
}

/**
 * Update user profile data for any user type
 */
export async function updateUserProfile(userId: string, profileData: UpdateUserProfileData): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const basicUpdates: any = {};
    if (profileData.firstName) basicUpdates.firstName = profileData.firstName;
    if (profileData.lastName) basicUpdates.lastName = profileData.lastName;
    if (profileData.phone) basicUpdates.phoneNumber = profileData.phone;
    if (profileData.phoneNumber) basicUpdates.phoneNumber = profileData.phoneNumber;
    if (profileData.notificationsEnabled !== undefined) basicUpdates.notificationsEnabled = profileData.notificationsEnabled;

    if (profileData.email && profileData.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: profileData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('Cette adresse email est déjà utilisée');
      }

      basicUpdates.email = profileData.email;
    }

    if (Object.keys(basicUpdates).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: basicUpdates,
      });
    }

    const extendedData: any = {};
    if (profileData.dateOfBirth !== undefined) extendedData.dateOfBirth = profileData.dateOfBirth;
    if (profileData.address !== undefined) extendedData.address = profileData.address;
    if (profileData.emergencyContact !== undefined) extendedData.emergencyContact = profileData.emergencyContact;
    if (profileData.specialization !== undefined) extendedData.specialization = profileData.specialization;
    if (profileData.licenseNumber !== undefined) extendedData.licenseNumber = profileData.licenseNumber;
    if (profileData.department !== undefined) extendedData.department = profileData.department;
    if (profileData.bio !== undefined) extendedData.bio = profileData.bio;
    if (profileData.profilePicture !== undefined) extendedData.profilePicture = profileData.profilePicture;

    if (Object.keys(extendedData).length > 0) {
      const existingSettings = await prisma.userSetting.findUnique({
        where: { userId },
      });

      const currentAppSettings = (existingSettings?.appSettings as any) || {};
      const updatedAppSettings = { ...currentAppSettings, ...extendedData };

      await prisma.userSetting.upsert({
        where: { userId },
        update: {
          appSettings: updatedAppSettings,
        },
        create: {
          userId,
          appSettings: updatedAppSettings,
        },
      });
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    }
    logger.error('Error updating user profile', error);
    throw new BadRequestError('Failed to update user profile');
  }
}


