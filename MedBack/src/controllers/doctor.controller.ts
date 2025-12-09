/**
 * Doctor Controller
 * 
 * Handles HTTP requests/responses for doctor endpoints.
 * Delegates business logic to doctor service.
 * 
 * Uses individual function exports for optimal performance and tree-shaking.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@middleware/error.middleware.js';
import * as doctorService from '@services/doctor.service.js';
import { HTTP_STATUS } from '@utils/constants.js';

/**
 * Get dashboard data
 * GET /api/medecin/dashboard
 */
export const getDashboardData = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const dashboardData = await doctorService.getDashboardData(doctorId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: dashboardData,
  });
});

/**
 * Get all patients
 * GET /api/medecin/patients
 */
export const getAllPatients = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const patients = await doctorService.getAllPatients(doctorId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: patients,
  });
});

/**
 * Search patients
 * GET /api/medecin/patients/search?query=...
 */
export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const { query } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Search query is required',
    });
  }
  
  const patients = await doctorService.searchPatients(doctorId, query);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: patients,
  });
});

/**
 * Get patient profile
 * GET /api/medecin/patients/:patientId/profile
 */
export const getPatientProfile = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const { patientId } = req.params;
  
  const patient = await doctorService.getPatientProfile(doctorId, patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: patient,
  });
});

/**
 * Create prescription
 * POST /api/medecin/patients/:patientId/prescriptions
 */
export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const { patientId } = req.params;
  const prescriptionData = { ...req.body, patientId };
  
  const prescription = await doctorService.createPrescription(doctorId, prescriptionData);
  
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: prescription,
  });
});

/**
 * Get patient medications
 * GET /api/medecin/patients/:patientId/medications
 */
export const getPatientMedications = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const { patientId } = req.params;
  
  const medications = await doctorService.getPatientMedications(doctorId, patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: medications,
  });
});

/**
 * Add patient medication
 * POST /api/medecin/patients/:patientId/medications
 */
export const addPatientMedication = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const { patientId } = req.params;
  const medicationData = req.body;
  
  const medication = await doctorService.addPatientMedication(doctorId, patientId, medicationData);
  
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: medication,
  });
});

/**
 * Delete patient relationship
 * DELETE /api/medecin/patients/:patientId
 */
export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.user!.userId;
  const { patientId } = req.params;
  
  await doctorService.deletePatient(doctorId, patientId);
  
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Patient relationship deleted successfully',
  });
});
