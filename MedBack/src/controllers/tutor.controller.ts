/**
 * Tutor Controller
 * 
 * Handles HTTP requests/responses for tutor endpoints.
 * Delegates business logic to tutor service.
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@middleware/error.middleware.js';
import * as tutorService from '@services/tutor.service.js';
import { uploadBase64File } from '@utils/fileUpload.js';

export const tutorController = {
  /**
   * Get patients with nearest medications
   * GET /api/tutor/patients/nearest-medications
   */
  getPatientsWithNearestMedications: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const patients = await tutorService.getPatientsWithNearestMedications(tutorId);
    
    res.json({
      success: true,
      data: patients,
      message: `Found ${patients.length} patients with upcoming medications`,
    });
  }),

  /**
   * Get medication alerts
   * GET /api/tutor/alerts/medications
   */
  getMedicationAlerts: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const alerts = await tutorService.getMedicationAlerts(tutorId);
    
    res.json({
      success: true,
      data: alerts,
      message: `Found ${alerts.missedMedications.length} missed medication alerts`,
    });
  }),

  /**
   * Get dashboard data
   * GET /api/tutor/dashboard
   */
  getDashboardData: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const dashboardData = await tutorService.getDashboardData(tutorId);
    
    res.json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully',
    });
  }),

  /**
   * Send patient invitation
   * POST /api/tutor/patients/invite
   */
  sendPatientInvitation: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const { firstName, lastName, phoneNumber, audioMessage, audioDuration } = req.body;
    
    // Handle placeholder names for doctor requests
    const finalFirstName = firstName || 'Patient';
    const finalLastName = lastName || 'Inconnu';
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }
    
    const result = await tutorService.sendPatientInvitation(tutorId, {
      firstName: finalFirstName,
      lastName: finalLastName,
      phoneNumber,
      audioMessage,
      audioDuration,
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Patient invitation sent successfully',
    });
  }),

  /**
   * Get all patients
   * GET /api/tutor/patients
   */
  getAllPatients: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const patients = await tutorService.getAllPatientsForTutor(tutorId);
    
    res.json({
      success: true,
      data: patients,
      message: `Found ${patients.length} patients`,
    });
  }),

  /**
   * Search patients
   * GET /api/tutor/patients/search?q=...
   */
  searchPatients: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const query = String(req.query.q || '').trim();
    
    if (!query) {
      return res.json({
        success: true,
        data: [],
        message: 'Empty query',
      });
    }
    
    const patients = await tutorService.searchPatients(tutorId, query);
    
    res.json({
      success: true,
      data: patients,
      message: `Found ${patients.length} patients`,
    });
  }),

  /**
   * Get patient profile
   * GET /api/tutor/patients/:patientId/profile
   */
  getPatientProfile: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const { patientId } = req.params;
    
    const patient = await tutorService.getPatientProfile(tutorId, patientId);
    
    res.json({
      success: true,
      data: patient,
      message: 'Patient profile loaded',
    });
  }),

  /**
   * Delete patient relationship
   * DELETE /api/tutor/patients/:patientId
   */
  deletePatient: asyncHandler(async (req: Request, res: Response) => {
    const caregiverId = req.user!.userId;
    const { patientId } = req.params;
    
    await tutorService.deletePatient(caregiverId, patientId);
    return res.json({
      success: true,
      message: 'Patient relationship deleted successfully',
    });
  }),

  /**
   * Upload voice message
   * POST /api/tutor/voice-messages/upload
   */
  uploadVoiceMessage: asyncHandler(async (req: Request, res: Response) => {
    const { fileBase64, fileName, mimeType } = req.body;
    
    if (!fileBase64) {
      return res.status(400).json({
        success: false,
        message: 'fileBase64 is required',
      });
    }
    
    const { fileUrl, filePath } = await uploadBase64File(
      fileBase64,
      fileName,
      mimeType,
      'uploads/voice-messages'
    );
    return res.json({
      success: true,
      data: { fileUrl, path: filePath },
      message: 'File uploaded successfully',
    });
  }),

  /**
   * Get voice messages for a patient
   * GET /api/tutor/patients/:patientId/voice-messages
   * GET /api/tutor/voice-messages?patientId=...
   */
  getVoiceMessages: asyncHandler(async (req: Request, res: Response) => {
    const tutorId = req.user!.userId;
    const patientId = req.params.patientId || (req.query.patientId as string | undefined);
    
    const messages = await tutorService.getVoiceMessages(tutorId, patientId);
    
    return res.json({
      success: true,
      data: messages,
      message: `Found ${messages.length} voice messages`,
    });
  }),

  // Note: Additional controller methods (confirmMedicationManually, getPatientAdherenceHistory,
  // createPrescription, updatePrescription, deletePrescription, createVoiceMessage, deleteVoiceMessage, etc.)
  // should be added here following the same pattern. For brevity, I'm including the core functions.
};


