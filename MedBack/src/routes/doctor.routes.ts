/**
 * Doctor Routes
 * 
 * Defines all doctor-related endpoints.
 * Routes only map to controller methods - no business logic here.
 */

import { Router } from 'express';
import {
  getDashboardData,
  getAllPatients,
  searchPatients,
  getPatientProfile,
  createPrescription,
  getPatientMedications,
  addPatientMedication,
  deletePatient,
} from '@controllers/doctor.controller.js';
import { authenticateToken, requireUserType } from '@middleware/auth.middleware.js';
import { validate, validateQuery, validateParams } from '@middleware/validation.middleware.js';
import {
  searchPatientsSchema,
  createPrescriptionSchema,
  addPatientMedicationSchema,
  patientIdParamSchema,
} from '@validators/doctor.validator.js';

const router = Router();

// Apply authentication - allow both doctors and tutors to access these routes
router.use(authenticateToken);
router.use(requireUserType(['medecin', 'tuteur']));

/**
 * @route   GET /api/medecin/dashboard
 * @desc    Get dashboard data for doctor
 * @access  Doctor/Tutor
 */
router.get('/dashboard', getDashboardData);

/**
 * @route   GET /api/medecin/patients
 * @desc    Get all patients for doctor
 * @access  Doctor/Tutor
 */
router.get('/patients', getAllPatients);

/**
 * @route   GET /api/medecin/patients/search
 * @desc    Search patients
 * @access  Doctor/Tutor
 */
router.get(
  '/patients/search',
  validateQuery(searchPatientsSchema),
  searchPatients
);

/**
 * @route   GET /api/medecin/patients/:patientId/profile
 * @desc    Get patient profile
 * @access  Doctor/Tutor
 */
router.get(
  '/patients/:patientId/profile',
  validateParams(patientIdParamSchema),
  getPatientProfile
);

/**
 * @route   POST /api/medecin/patients/:patientId/prescriptions
 * @desc    Create prescription for patient
 * @access  Doctor/Tutor
 */
router.post(
  '/patients/:patientId/prescriptions',
  validateParams(patientIdParamSchema),
  validate(createPrescriptionSchema),
  createPrescription
);

/**
 * @route   GET /api/medecin/patients/:patientId/medications
 * @desc    Get patient medications
 * @access  Doctor/Tutor
 */
router.get(
  '/patients/:patientId/medications',
  validateParams(patientIdParamSchema),
  getPatientMedications
);

/**
 * @route   POST /api/medecin/patients/:patientId/medications
 * @desc    Add patient medication
 * @access  Doctor/Tutor
 */
router.post(
  '/patients/:patientId/medications',
  validateParams(patientIdParamSchema),
  validate(addPatientMedicationSchema),
  addPatientMedication
);

/**
 * @route   DELETE /api/medecin/patients/:patientId
 * @desc    Delete patient relationship
 * @access  Doctor/Tutor
 */
router.delete(
  '/patients/:patientId',
  validateParams(patientIdParamSchema),
  deletePatient
);

export default router;
