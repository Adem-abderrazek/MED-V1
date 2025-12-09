/**
 * Tutor Routes
 * 
 * Defines all tutor-related endpoints.
 * Routes only map to controller methods - no business logic here.
 */

import { Router } from 'express';
import { tutorController } from '@controllers/tutor.controller.js';
import { authenticateToken, requireUserType } from '@middleware/auth.middleware.js';
import { validate, validateQuery, validateParams } from '@middleware/validation.middleware.js';
import {
  sendPatientInvitationSchema,
  tutorSearchPatientsSchema,
  tutorPatientIdParamSchema,
  uploadVoiceMessageSchema,
  getVoiceMessagesSchema,
} from '@validators/tutor.validator.js';

const router = Router();

// Apply authentication and allow both tutor and doctor access
router.use(authenticateToken);
router.use(requireUserType(['tuteur', 'medecin']));

/**
 * @route   GET /api/tutor/dashboard
 * @desc    Get combined dashboard data
 * @access  Tutor/Doctor
 */
router.get('/dashboard', tutorController.getDashboardData);

/**
 * @route   GET /api/tutor/patients/nearest-medications
 * @desc    Get 3 patients with the nearest medication times
 * @access  Tutor/Doctor
 */
router.get('/patients/nearest-medications', tutorController.getPatientsWithNearestMedications);

/**
 * @route   GET /api/tutor/alerts/medications
 * @desc    Get medication alerts (missed medications and message count)
 * @access  Tutor/Doctor
 */
router.get('/alerts/medications', tutorController.getMedicationAlerts);

/**
 * @route   POST /api/tutor/patients/invite
 * @desc    Send SMS invitation to new patient
 * @access  Tutor/Doctor
 */
router.post(
  '/patients/invite',
  validate(sendPatientInvitationSchema),
  tutorController.sendPatientInvitation
);

/**
 * @route   GET /api/tutor/patients
 * @desc    Get all patients for the tutor
 * @access  Tutor/Doctor
 */
router.get('/patients', tutorController.getAllPatients);

/**
 * @route   GET /api/tutor/patients/search
 * @desc    Search tutor's patients
 * @access  Tutor/Doctor
 */
router.get(
  '/patients/search',
  validateQuery(tutorSearchPatientsSchema),
  tutorController.searchPatients
);

/**
 * @route   GET /api/tutor/patients/:patientId/profile
 * @desc    Get a patient's profile for this tutor
 * @access  Tutor/Doctor
 */
router.get(
  '/patients/:patientId/profile',
  validateParams(tutorPatientIdParamSchema),
  tutorController.getPatientProfile
);

/**
 * @route   DELETE /api/tutor/patients/:patientId
 * @desc    Delete patient relationship
 * @access  Tutor/Doctor
 */
router.delete(
  '/patients/:patientId',
  validateParams(tutorPatientIdParamSchema),
  tutorController.deletePatient
);

/**
 * @route   POST /api/tutor/voice-messages/upload
 * @desc    Upload a voice message audio file (base64)
 * @access  Tutor/Doctor
 */
router.post(
  '/voice-messages/upload',
  validate(uploadVoiceMessageSchema),
  tutorController.uploadVoiceMessage
);

/**
 * @route   GET /api/tutor/patients/:patientId/voice-messages
 * @desc    Get voice messages for a specific patient
 * @access  Tutor/Doctor
 */
router.get(
  '/patients/:patientId/voice-messages',
  validateParams(tutorPatientIdParamSchema),
  tutorController.getVoiceMessages
);

/**
 * @route   GET /api/tutor/voice-messages
 * @desc    Get all voice messages (optionally filtered by patientId query param)
 * @access  Tutor/Doctor
 */
router.get(
  '/voice-messages',
  validateQuery(getVoiceMessagesSchema),
  tutorController.getVoiceMessages
);

// Note: Additional routes (confirmMedicationManually, getPatientAdherenceHistory,
// createPrescription, updatePrescription, deletePrescription, createVoiceMessage, deleteVoiceMessage,
// reminder generation, etc.) should be added here following the same pattern.

export default router;


