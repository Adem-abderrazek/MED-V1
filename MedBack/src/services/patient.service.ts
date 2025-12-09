/**
 * Patient Service
 * 
 * Business logic for patient-related operations.
 * Handles medications, reminders, messages, and profile management.
 */

import { prisma } from '@config/database.js';
import { logger } from '@utils/logger.js';
import { NotFoundError, BadRequestError } from '@types/errors.js';

// Type definitions
export interface OverdueMedication {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledFor: Date;
  minutesOverdue: number;
  prescriptionId: string;
  reminderId: string;
}

export interface NextMedication {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledFor: Date;
  minutesUntil: number;
  prescriptionId: string;
  reminderId: string;
}

export interface PatientDashboardData {
  overdueMedications: OverdueMedication[];
  nextMedications: NextMedication[];
  tutorMessages: any[];
  totalMedicationsToday: number;
  takenToday: number;
  adherenceRate: number;
}

/**
 * Get dashboard data for patient
 */
export async function getDashboardData(patientId: string): Promise<PatientDashboardData> {
    try {
      const [overdueMedications, nextMedications, tutorMessages] = await Promise.all([
        getOverdueMedications(patientId),
        getNextMedications(patientId, 5),
        getTutorMessages(patientId, 10),
      ]);

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const todaysReminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: { gte: startOfDay, lte: endOfDay },
          prescription: {
            isActive: true,
            deletedAt: null,
          },
        },
      });

      const totalMedicationsToday = todaysReminders.length;
      const takenToday = todaysReminders.filter(
        r => r.status === 'confirmed' || r.status === 'manual_confirm'
      ).length;

      const adherenceRate = totalMedicationsToday > 0
        ? Math.round((takenToday / totalMedicationsToday) * 100)
        : 100;

      return {
        overdueMedications,
        nextMedications,
        tutorMessages,
        totalMedicationsToday,
        takenToday,
        adherenceRate,
      };
    } catch (error) {
      logger.error('Error getting patient dashboard data', error);
      throw new BadRequestError('Failed to get patient dashboard data');
    }
}

/**
 * Get overdue medications
 */
export async function getOverdueMedications(patientId: string): Promise<OverdueMedication[]> {
    try {
      const now = new Date();

      const overdueReminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: { lt: now },
          status: { in: ['scheduled', 'sent'] },
          prescription: {
            isActive: true,
            deletedAt: null,
          },
        },
        include: {
          prescription: {
            include: { medication: true },
          },
        },
        orderBy: { scheduledFor: 'desc' },
      });

      return overdueReminders.map(reminder => {
        const minutesOverdue = Math.floor(
          (now.getTime() - reminder.scheduledFor.getTime()) / (1000 * 60)
        );

        return {
          id: reminder.id,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dose non spécifiée',
          scheduledFor: reminder.scheduledFor,
          minutesOverdue,
          prescriptionId: reminder.prescriptionId,
          reminderId: reminder.id,
        };
      });
    } catch (error) {
      logger.error('Error getting overdue medications', error);
    throw new BadRequestError('Failed to get overdue medications');
  }
}

/**
 * Get next medications
 */
export async function getNextMedications(patientId: string, limit: number = 5): Promise<NextMedication[]> {
    try {
      const now = new Date();

      const upcomingReminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: { gte: now },
          status: { in: ['scheduled', 'sent'] },
          prescription: {
            isActive: true,
            deletedAt: null,
          },
        },
        include: {
          prescription: {
            include: { medication: true },
          },
        },
        orderBy: { scheduledFor: 'asc' },
        take: limit,
      });

      return upcomingReminders.map(reminder => {
        const minutesUntil = Math.floor(
          (reminder.scheduledFor.getTime() - now.getTime()) / (1000 * 60)
        );

        return {
          id: reminder.id,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dose non spécifiée',
          scheduledFor: reminder.scheduledFor,
          minutesUntil,
          prescriptionId: reminder.prescriptionId,
          reminderId: reminder.id,
        };
      });
    } catch (error) {
      logger.error('Error getting next medications', error);
      throw new BadRequestError('Failed to get next medications');
    }
}

/**
 * Get tutor messages
 */
export async function getTutorMessages(patientId: string, limit: number = 10): Promise<any[]> {
    try {
      const alerts = await prisma.alert.findMany({
        where: { patientId },
        include: {
          tuteur: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return alerts.map(alert => ({
        id: alert.id,
        message: alert.message,
        timestamp: alert.createdAt,
        isRead: alert.isRead,
        tutorName: `${alert.tuteur.firstName} ${alert.tuteur.lastName}`,
        tutorId: alert.tuteurId,
      }));
    } catch (error) {
      logger.error('Error getting tutor messages', error);
      throw new BadRequestError('Failed to get tutor messages');
    }
}

/**
 * Mark medication as taken
 */
export async function markMedicationTaken(patientId: string, reminderId: string): Promise<void> {
    try {
      const reminder = await prisma.medicationReminder.findFirst({
        where: { id: reminderId, patientId },
      });

      if (!reminder) {
        throw new NotFoundError('Reminder not found or does not belong to this patient');
      }

      const now = new Date();
      const scheduledTime = new Date(reminder.scheduledFor);
      const gracePeriodMinutes = 5;
      const earliestAllowedTime = new Date(
        scheduledTime.getTime() - (gracePeriodMinutes * 60 * 1000)
      );

      if (now < earliestAllowedTime) {
        const timeUntilAllowedMs = earliestAllowedTime.getTime() - now.getTime();
        const timeUntilAllowedMinutes = Math.ceil(timeUntilAllowedMs / (1000 * 60));
        const hours = Math.floor(timeUntilAllowedMinutes / 60);
        const minutes = timeUntilAllowedMinutes % 60;
        const timeDisplay = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
        
        throw new BadRequestError(
          `Vous ne pouvez pas marquer ce médicament comme pris avant ${timeDisplay} de l'heure prévue.`
        );
      }

      if (reminder.status === 'manual_confirm' || reminder.status === 'confirmed') {
        throw new BadRequestError('Ce médicament a déjà été marqué comme pris.');
      }

      await prisma.medicationReminder.update({
        where: { id: reminderId },
        data: {
          status: 'manual_confirm',
          confirmedAt: new Date(),
          confirmedBy: patientId,
        },
      });

      await prisma.medicationConfirmation.create({
        data: {
          reminderId,
          confirmedBy: patientId,
          confirmationType: 'patient',
          confirmedAt: new Date(),
        },
      });

      logger.info('Medication marked as taken', { patientId, reminderId });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error marking medication as taken', error);
      throw new BadRequestError('Failed to mark medication as taken');
    }
}

/**
 * Mark message as read
 */
export async function markMessageRead(patientId: string, messageId: string): Promise<void> {
    try {
      const alert = await prisma.alert.findFirst({
        where: { id: messageId, patientId },
      });

      if (alert) {
        await prisma.alert.update({
          where: { id: messageId },
          data: { isRead: true, readAt: new Date() },
        });
        return;
      }

      // Voice messages don't have read status - just return success
      const voiceMessage = await prisma.voiceMessage.findFirst({
        where: { id: messageId, patientId },
      });

      if (voiceMessage || messageId.startsWith('prescription-instruction-')) {
        logger.debug('Message marked as read (no DB update needed)', { messageId });
        return;
      }

      throw new NotFoundError('Message not found or does not belong to this patient');
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error marking message as read', error);
      throw new BadRequestError('Failed to mark message as read');
    }
}

/**
 * Get patient medications
 */
export async function getPatientMedications(patientId: string): Promise<any[]> {
    try {
      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId,
          isActive: true,
          deletedAt: null,
        },
        include: {
          medication: true,
          doctor: {
            select: { firstName: true, lastName: true },
          },
          schedules: {
            where: { isActive: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate adherence for each prescription
      const medicationsWithAdherence = await Promise.all(
        prescriptions.map(async (prescription) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const [totalReminders, takenReminders] = await Promise.all([
            prisma.medicationReminder.count({
              where: {
                prescriptionId: prescription.id,
                patientId,
                scheduledFor: { gte: thirtyDaysAgo },
              },
            }),
            prisma.medicationReminder.count({
              where: {
                prescriptionId: prescription.id,
                patientId,
                scheduledFor: { gte: thirtyDaysAgo },
                status: { in: ['confirmed', 'manual_confirm'] },
              },
            }),
          ]);

          const adherenceRate = totalReminders > 0
            ? Math.round((takenReminders / totalReminders) * 100)
            : 0;

          return {
            id: prescription.id,
            medicationName: prescription.medication.name,
            dosage: prescription.customDosage || prescription.medication.dosage || 'Dose non spécifiée',
            prescribedBy: `${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
            startDate: prescription.startDate,
            endDate: prescription.endDate,
            isChronic: prescription.isChronic,
            isActive: prescription.isActive,
            schedules: prescription.schedules.map((schedule: any) => ({
              id: schedule.id,
              scheduledTime: schedule.scheduledTime,
              daysOfWeek: schedule.daysOfWeek,
              scheduleType: schedule.scheduleType,
              isActive: schedule.isActive,
            })),
            adherenceRate,
            totalDoses: totalReminders,
            takenDoses: takenReminders,
          };
        })
      );

      return medicationsWithAdherence;
    } catch (error) {
      logger.error('Error getting patient medications', error);
      throw new BadRequestError('Failed to get patient medications');
    }
}

/**
 * Get patient messages
 */
export async function getPatientMessages(patientId: string, limit: number = 50): Promise<any[]> {
    try {
      const alerts = await prisma.alert.findMany({
        where: { patientId },
        include: {
          tuteur: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const voiceMessages = await prisma.voiceMessage.findMany({
        where: { patientId, isActive: true },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const messages = [
        ...alerts.map(alert => ({
          id: alert.id,
          message: alert.message,
          timestamp: alert.createdAt,
          isRead: alert.isRead,
          senderName: `${alert.tuteur.firstName} ${alert.tuteur.lastName}`,
          senderId: alert.tuteurId,
          senderType: 'tutor' as const,
          messageType: 'alert' as const,
        })),
        ...voiceMessages.map(vm => ({
          id: vm.id,
          message: vm.title || 'Voice message',
          timestamp: vm.createdAt,
          isRead: false,
          senderName: `${vm.creator.firstName} ${vm.creator.lastName}`,
          senderId: vm.creatorId,
          senderType: vm.creator.userType === 'medecin' ? 'doctor' : 'tutor',
          messageType: 'voice' as const,
          fileUrl: vm.fileUrl,
          durationSeconds: vm.durationSeconds,
        })),
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return messages.slice(0, limit);
    } catch (error) {
      logger.error('Error getting patient messages', error);
      throw new BadRequestError('Failed to get patient messages');
    }
}

/**
 * Get patient profile
 */
export async function getPatientProfile(patientId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: patientId },
        include: {
          prescriptionsAsPatient: {
            where: { isActive: true, deletedAt: null },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('Patient not found');
      }

      // Calculate adherence rate
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalReminders, takenReminders] = await Promise.all([
        prisma.medicationReminder.count({
          where: {
            patientId,
            scheduledFor: { gte: thirtyDaysAgo },
          },
        }),
        prisma.medicationReminder.count({
          where: {
            patientId,
            scheduledFor: { gte: thirtyDaysAgo },
            status: { in: ['confirmed', 'manual_confirm'] },
          },
        }),
      ]);

      const adherenceRate = totalReminders > 0
        ? Math.round((takenReminders / totalReminders) * 100)
        : 0;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phoneNumber,
        totalMedications: user.prescriptionsAsPatient.length,
        adherenceRate,
        lastActivity: user.lastLogin || user.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error getting patient profile', error);
      throw new BadRequestError('Failed to get patient profile');
    }
}

/**
 * Update patient profile
 */
export async function updatePatientProfile(patientId: string, profileData: any): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: patientId },
        data: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phoneNumber: profileData.phoneNumber,
          updatedAt: new Date(),
        },
      });

      logger.info('Patient profile updated', { patientId });
    } catch (error) {
      logger.error('Error updating patient profile', error);
      throw new BadRequestError('Failed to update patient profile');
    }
}

/**
 * Get medications by date
 */
export async function getMedicationsByDate(patientId: string, dateStr: string): Promise<any> {
    try {
      // Parse the date string (format: YYYY-MM-DD)
      // IMPORTANT: Parse as local date in Tunisia timezone to match how reminders are stored
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Create start of day in Tunisia timezone (UTC+1)
      // When user requests "2025-12-05", they mean Dec 5 in Tunisia time
      // CRITICAL FIX: Times 00:00-00:59 in Tunisia are stored as 23:00-23:59 UTC of the PREVIOUS day
      // So for Dec 5, 2025, we need to include:
      // - Dec 4, 2025 23:00:00 UTC (Dec 5, 2025 00:00:00 Tunisia) 
      // - Dec 5, 2025 22:59:59 UTC (Dec 5, 2025 23:59:59 Tunisia)
      const tunisiaOffset = 1; // UTC+1
      
      // Start: Previous day 23:00:00 UTC = Today 00:00:00 Tunisia
      const startOfDay = new Date(Date.UTC(year, month - 1, day - 1, 23, 0, 0, 0));
      
      // End: Today 22:59:59 UTC = Today 23:59:59 Tunisia
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 22, 59, 59, 999));

      logger.debug('Fetching medications for patient', { patientId, dateStr, startOfDay, endOfDay });

      // Check if reminders exist for this date
      const existingRemindersCount = await prisma.medicationReminder.count({
        where: {
          patientId,
          scheduledFor: { gte: startOfDay, lte: endOfDay },
          prescription: {
            isActive: true,
            deletedAt: null,
          },
        },
      });

      // If no reminders found, try to generate them (if service exists)
      if (existingRemindersCount === 0) {
        logger.debug('No reminders found for this date, attempting to generate them');
        try {
          // Try to import reminder generator if it exists
          const reminderGeneratorModule = await import('./reminder-generator.service.js').catch(() => null);
          if (reminderGeneratorModule?.reminderGeneratorService) {
            const requestedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
            await reminderGeneratorModule.reminderGeneratorService.generateRemindersForDate(requestedDate);
            logger.debug('Generated reminders for requested date');
          }
        } catch (genError) {
          logger.warn('Could not generate reminders for requested date', genError);
        }
      }

      // Get all medication reminders for this date
      // IMPORTANT: Filter out reminders for deleted/inactive prescriptions
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: { gte: startOfDay, lte: endOfDay },
          status: { not: 'cancelled' }, // Don't show cancelled reminders
          prescription: {
            isActive: true, // Only show reminders for active prescriptions
            deletedAt: null, // Don't show deleted prescriptions
          },
        },
        include: {
          prescription: {
            include: {
              medication: true,
              voiceMessage: true,
            },
          },
          voiceMessage: true,
          standardVoiceMessage: true,
        },
        orderBy: { scheduledFor: 'asc' },
      });

      // Transform to medications format
      const medications = reminders.map(reminder => {
        // Map database status to frontend status
        let frontendStatus: 'pending' | 'taken' | 'missed' | 'scheduled' = 'pending';
        if (reminder.status === 'confirmed' || reminder.status === 'manual_confirm') {
          frontendStatus = 'taken';
        } else if (reminder.status === 'missed') {
          frontendStatus = 'missed';
        } else if (reminder.status === 'sent') {
          frontendStatus = 'pending';
        } else if (reminder.status === 'scheduled') {
          frontendStatus = 'scheduled';
        }

        // Determine voice message URL
        let voiceUrl: string | undefined;
        if (reminder.voiceMessage?.fileUrl) {
          voiceUrl = reminder.voiceMessage.fileUrl;
        } else if (reminder.prescription.voiceMessage?.fileUrl) {
          voiceUrl = reminder.prescription.voiceMessage.fileUrl;
        } else if (reminder.standardVoiceMessage?.fileUrl) {
          voiceUrl = reminder.standardVoiceMessage.fileUrl;
        }

        return {
          id: reminder.id,
          reminderId: reminder.id,
          prescriptionId: reminder.prescriptionId,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Non spécifié',
          scheduledFor: reminder.scheduledFor.toISOString(),
          status: frontendStatus,
          voiceMessageUrl: voiceUrl,
          confirmedAt: reminder.confirmedAt?.toISOString() || null,
          snoozedUntil: reminder.snoozedUntil?.toISOString() || null,
        };
      });

      // Calculate stats for the day
      const total = medications.length;
      const taken = reminders.filter(r => 
        r.status === 'confirmed' || r.status === 'manual_confirm'
      ).length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

      return {
        medications,
        total,
        taken,
        adherenceRate,
      };
    } catch (error) {
      logger.error('Error getting medications by date', error);
      throw new BadRequestError('Failed to get medications for date');
    }
}

/**
 * Get upcoming reminders
 */
export async function getUpcomingReminders(patientId: string, daysAhead: number = 30): Promise<any[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const reminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: { gte: now, lte: futureDate },
          status: { in: ['scheduled', 'sent'] },
          prescription: {
            isActive: true,
            deletedAt: null,
          },
        },
        include: {
          prescription: {
            include: {
              medication: true,
              voiceMessage: true,
            },
          },
          voiceMessage: true,
          standardVoiceMessage: true,
        },
        orderBy: { scheduledFor: 'asc' },
      });

      return transformRemindersToMedications(reminders);
    } catch (error) {
      logger.error('Error getting upcoming reminders', error);
      throw new BadRequestError('Failed to get upcoming reminders');
    }
}

/**
 * Check for updates
 */
export async function checkForUpdates(patientId: string, lastSyncTime?: Date): Promise<{ hasUpdates: boolean; lastModified?: Date }> {
    try {
      const lastModified = await prisma.prescription.findFirst({
        where: { patientId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });

      if (!lastSyncTime) {
        return { hasUpdates: true, lastModified: lastModified?.updatedAt };
      }

      const hasUpdates = lastModified && lastModified.updatedAt > lastSyncTime;
      return { hasUpdates: !!hasUpdates, lastModified: lastModified?.updatedAt };
    } catch (error) {
      logger.error('Error checking for updates', error);
      throw new BadRequestError('Failed to check for updates');
    }
}

/**
 * Get deleted prescriptions since last sync
 */
export async function getDeletedPrescriptions(patientId: string, since: Date): Promise<string[]> {
    try {
      const deleted = await prisma.prescription.findMany({
        where: {
          patientId,
          deletedAt: { gte: since, not: null },
        },
        select: { id: true },
      });

      return deleted.map(p => p.id);
    } catch (error) {
      logger.error('Error getting deleted prescriptions', error);
      return [];
    }
}

/**
 * Snooze reminder
 */
export async function snoozeReminder(patientId: string, reminderId: string, snoozeDurationMinutes: number): Promise<void> {
    try {
      const reminder = await prisma.medicationReminder.findFirst({
        where: { id: reminderId, patientId },
      });

      if (!reminder) {
        throw new NotFoundError('Reminder not found');
      }

      const snoozedUntil = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000);

      await prisma.medicationReminder.update({
        where: { id: reminderId },
        data: {
          status: 'scheduled',
          snoozedUntil,
        },
      });

      logger.info('Reminder snoozed', { patientId, reminderId, snoozedUntil });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error snoozing reminder', error);
      throw new BadRequestError('Failed to snooze reminder');
    }
}

/**
 * Transform reminders to medication format
 */
function transformRemindersToMedications(reminders: any[]): any[] {
    return reminders.map(reminder => {
      // Determine voice message URL
      let voiceUrl: string | undefined;
      if (reminder.voiceMessage?.fileUrl) {
        voiceUrl = reminder.voiceMessage.fileUrl;
      } else if (reminder.prescription.voiceMessage?.fileUrl) {
        voiceUrl = reminder.prescription.voiceMessage.fileUrl;
      } else if (reminder.standardVoiceMessage?.fileUrl) {
        voiceUrl = reminder.standardVoiceMessage.fileUrl;
      }

      return {
        reminderId: reminder.id,
        prescriptionId: reminder.prescriptionId,
        medicationName: reminder.prescription.medication.name,
        dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dose non spécifiée',
        scheduledFor: reminder.scheduledFor,
        status: reminder.status,
        voiceMessageUrl: voiceUrl,
        confirmedAt: reminder.confirmedAt,
        snoozedUntil: reminder.snoozedUntil,
      };
    });
}


