/**
 * Patient Controller
 * 
 * Handles HTTP requests/responses for patient endpoints.
 * Delegates business logic to patient service.
 * 
 * Uses individual function exports for optimal performance and tree-shaking.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@middleware/error.middleware.js';
import * as patientService from '@services/patient.service.js';
import { HTTP_STATUS } from '@utils/constants.js';

/**
 * Get dashboard data
 * GET /api/patient/dashboard
 */
export const getDashboardData = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const dashboardData = await patientService.getDashboardData(patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: dashboardData,
    message: 'Dashboard data retrieved successfully',
  });
});

/**
 * Get patient medications
 * GET /api/patient/medications
 */
export const getPatientMedications = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const medications = await patientService.getPatientMedications(patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: medications,
    message: `Found ${medications.length} medications`,
  });
});

/**
 * Get medications by date
 * GET /api/patient/medications/by-date?date=YYYY-MM-DD
 */
export const getMedicationsByDate = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const { date } = req.query;
  
  if (!date || typeof date !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Date parameter is required (format: YYYY-MM-DD)',
    });
  }
  
  const result = await patientService.getMedicationsByDate(patientId, date);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
    message: 'Medications retrieved successfully',
  });
});

/**
 * Get overdue medications
 * GET /api/patient/medications/overdue
 */
export const getOverdueMedications = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const overdueMedications = await patientService.getOverdueMedications(patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: overdueMedications,
    message: `Found ${overdueMedications.length} overdue medications`,
  });
});

/**
 * Get next medications
 * GET /api/patient/medications/next?limit=5
 */
export const getNextMedications = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 5;
  const nextMedications = await patientService.getNextMedications(patientId, limit);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: nextMedications,
    message: `Found ${nextMedications.length} upcoming medications`,
  });
});

/**
 * Get upcoming reminders
 * GET /api/patient/reminders/upcoming?days=30
 */
export const getUpcomingReminders = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const daysAhead = parseInt(req.query.days as string) || 30;
  const lastSync = req.query.lastSync 
    ? new Date(req.query.lastSync as string)
    : undefined;
  
  const reminders = await patientService.getUpcomingReminders(patientId, daysAhead);
  const deletedPrescriptions = lastSync 
    ? await patientService.getDeletedPrescriptions(patientId, lastSync)
    : [];
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: reminders,
    deletedPrescriptions,
    message: `Found ${reminders.length} upcoming reminders, ${deletedPrescriptions.length} deleted prescriptions`,
  });
});

/**
 * Confirm reminder
 * POST /api/patient/reminders/confirm
 */
export const confirmReminder = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  
  // Handle both array and single ID (for backwards compatibility)
  let ids: string[] = [];
  if (req.body.reminderIds && Array.isArray(req.body.reminderIds)) {
    ids = req.body.reminderIds;
  } else if (req.body.reminderId) {
    ids = [req.body.reminderId];
  } else if (req.body.reminderIds && typeof req.body.reminderIds === 'string') {
    ids = [req.body.reminderIds];
  }
  
  // Filter out empty strings and invalid IDs
  ids = ids.filter(id => id && typeof id === 'string' && id.trim().length > 0);
  
  // If no valid IDs after filtering, return success (no-op)
  // This handles cases where frontend sends empty arrays or arrays with empty strings
  if (ids.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: [],
      message: 'No valid reminder IDs to process',
    });
  }
  
  const results = [];
  for (const reminderId of ids) {
    try {
      await patientService.markMedicationTaken(patientId, reminderId);
      results.push({ reminderId, success: true });
    } catch (error: any) {
      results.push({ reminderId, success: false, error: error.message });
    }
  }
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: results,
    message: `Processed ${results.length} reminders`,
  });
});

/**
 * Snooze reminder
 * POST /api/patient/reminders/snooze
 */
export const snoozeReminder = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const { reminderId, snoozeDurationMinutes = 5 } = req.body;
  
  if (!reminderId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Reminder ID is required',
    });
  }
  
  await patientService.snoozeReminder(patientId, reminderId, snoozeDurationMinutes);
  
  const snoozedUntil = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { reminderId, snoozedUntil: snoozedUntil.toISOString() },
    message: `Reminder snoozed until ${snoozedUntil.toLocaleTimeString()}`,
  });
});

/**
 * Check for updates
 * GET /api/patient/check-updates?lastSync=ISO_DATE
 */
export const checkForUpdates = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const lastSyncTime = req.query.lastSync 
    ? new Date(req.query.lastSync as string)
    : undefined;
  
  const updateStatus = await patientService.checkForUpdates(patientId, lastSyncTime);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: updateStatus,
    message: updateStatus.hasUpdates 
      ? 'Updates available' 
      : 'No updates available',
  });
});

/**
 * Get patient messages
 * GET /api/patient/messages?limit=50
 */
export const getPatientMessages = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 50;
  const messages = await patientService.getPatientMessages(patientId, limit);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: messages,
    message: `Found ${messages.length} messages`,
  });
});

/**
 * Get tutor messages
 * GET /api/patient/messages/tutors?limit=10
 */
export const getTutorMessages = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 10;
  const tutorMessages = await patientService.getTutorMessages(patientId, limit);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: tutorMessages,
    message: `Found ${tutorMessages.length} messages`,
  });
});

/**
 * Mark message as read
 * POST /api/patient/messages/mark-read
 */
export const markMessageRead = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const { messageId } = req.body;
  
  if (!messageId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Message ID is required',
    });
  }
  
  await patientService.markMessageRead(patientId, messageId);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Message marked as read successfully',
  });
});

/**
 * Get patient profile
 * GET /api/patient/profile
 */
export const getPatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const profile = await patientService.getPatientProfile(patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: profile,
    message: 'Profile data retrieved successfully',
  });
});

/**
 * Update patient profile
 * PUT /api/patient/profile
 */
export const updatePatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.userId;
  const profileData = req.body;
  
  await patientService.updatePatientProfile(patientId, profileData);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile updated successfully',
  });
});
