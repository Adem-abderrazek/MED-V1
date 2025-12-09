/**
 * Patient Routes
 * 
 * Defines all patient-related endpoints.
 * Routes only map to controller methods - no business logic here.
 */

import { Router } from 'express';
import {
  getDashboardData,
  getPatientMedications,
  getMedicationsByDate,
  getOverdueMedications,
  getNextMedications,
  getUpcomingReminders,
  confirmReminder,
  snoozeReminder,
  checkForUpdates,
  getPatientMessages,
  getTutorMessages,
  markMessageRead,
  getPatientProfile,
  updatePatientProfile,
} from '@controllers/patient.controller.js';
import { authenticateToken, requireUserType } from '@middleware/auth.middleware.js';
import { validate, validateQuery } from '@middleware/validation.middleware.js';
import {
  getMedicationsByDateSchema,
  getNextMedicationsSchema,
  getUpcomingRemindersSchema,
  checkForUpdatesSchema,
  confirmReminderSchema,
  snoozeReminderSchema,
  markMessageReadSchema,
  updatePatientProfileSchema,
  getMessagesSchema,
} from '@validators/patient.validator.js';

const router = Router();

// Apply authentication and patient-only access to all routes
router.use(authenticateToken);
router.use(requireUserType(['patient']));

/**
 * @route   GET /api/patient/dashboard
 * @desc    Get complete dashboard data for patient
 * @access  Patient
 */
router.get('/dashboard', getDashboardData);

/**
 * @route   GET /api/patient/medications
 * @desc    Get all medications for patient
 * @access  Patient
 */
router.get('/medications', getPatientMedications);

/**
 * @route   GET /api/patient/medications/by-date
 * @desc    Get medications for a specific date
 * @access  Patient
 */
router.get(
  '/medications/by-date',
  validateQuery(getMedicationsByDateSchema),
  getMedicationsByDate
);

/**
 * @route   GET /api/patient/medications/overdue
 * @desc    Get overdue medications
 * @access  Patient
 */
router.get('/medications/overdue', getOverdueMedications);

/**
 * @route   GET /api/patient/medications/next
 * @desc    Get next upcoming medications
 * @access  Patient
 */
router.get(
  '/medications/next',
  validateQuery(getNextMedicationsSchema),
  getNextMedications
);

/**
 * @route   GET /api/patient/reminders/upcoming
 * @desc    Get upcoming reminders for offline sync
 * @access  Patient
 */
router.get(
  '/reminders/upcoming',
  validateQuery(getUpcomingRemindersSchema),
  getUpcomingReminders
);

/**
 * @route   POST /api/patient/reminders/confirm
 * @desc    Confirm medication reminder (mark as taken)
 * @access  Patient
 */
router.post(
  '/reminders/confirm',
  validate(confirmReminderSchema),
  confirmReminder
);

/**
 * @route   POST /api/patient/reminders/snooze
 * @desc    Snooze a medication reminder
 * @access  Patient
 */
router.post(
  '/reminders/snooze',
  validate(snoozeReminderSchema),
  snoozeReminder
);

/**
 * @route   GET /api/patient/check-updates
 * @desc    Check if patient has updates since last sync
 * @access  Patient
 */
router.get(
  '/check-updates',
  validateQuery(checkForUpdatesSchema),
  checkForUpdates
);

/**
 * @route   GET /api/patient/messages
 * @desc    Get all messages for patient
 * @access  Patient
 */
router.get(
  '/messages',
  validateQuery(getMessagesSchema),
  getPatientMessages
);

/**
 * @route   GET /api/patient/messages/tutors
 * @desc    Get latest messages from tutors
 * @access  Patient
 */
router.get(
  '/messages/tutors',
  validateQuery(getMessagesSchema),
  getTutorMessages
);

/**
 * @route   POST /api/patient/messages/mark-read
 * @desc    Mark a message as read
 * @access  Patient
 */
router.post(
  '/messages/mark-read',
  validate(markMessageReadSchema),
  markMessageRead
);

/**
 * @route   GET /api/patient/profile
 * @desc    Get patient profile
 * @access  Patient
 */
router.get('/profile', getPatientProfile);

/**
 * @route   PUT /api/patient/profile
 * @desc    Update patient profile
 * @access  Patient
 */
router.put(
  '/profile',
  validate(updatePatientProfileSchema),
  updatePatientProfile
);

export default router;
