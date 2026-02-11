// Export all functions from each module
export * from './client';
export * from './auth';
export * from './caregiver';
export * from './patient';
export * from './common';

// Create default export apiService for compatibility
import * as client from './client';
import * as auth from './auth';
import * as caregiver from './caregiver';
import * as patient from './patient';
import * as common from './common';

const apiService = {
  // Core request function
  request: client.request,

  // Auth functions
  login: auth.login,
  register: auth.register,
  requestPasswordReset: auth.requestPasswordReset,
  verifyResetCode: auth.verifyResetCode,
  resetPassword: auth.resetPassword,
  registerPushToken: auth.registerPushToken,
  unregisterPushToken: auth.unregisterPushToken,

  // Caregiver/Doctor functions
  getDoctorPatients: caregiver.getDoctorPatients,
  getDoctorDashboard: caregiver.getDoctorDashboard,
  getPatientDetails: caregiver.getPatientDetails,
  deletePatient: caregiver.deletePatient,
  createPrescription: caregiver.createPrescription,
  updatePrescription: caregiver.updatePrescription,
  deletePrescription: caregiver.deletePrescription,
  getPatientMedications: caregiver.getPatientMedications,
  uploadVoiceMessage: caregiver.uploadVoiceMessage,
  createVoiceMessage: caregiver.createVoiceMessage,
  getPatientVoiceMessages: caregiver.getPatientVoiceMessages,
  sendPatientInvitation: caregiver.sendPatientInvitation,

  // Common functions
  getUserProfile: common.getUserProfile,
  updateUserProfile: common.updateUserProfile,

  // Patient functions
  getPatientMedicationsByDate: patient.getPatientMedicationsByDate,
  confirmMedicationTaken: patient.confirmMedicationTaken,
  snoozeMedicationReminder: patient.snoozeMedicationReminder,
  getUpcomingReminders: patient.getUpcomingReminders,
  checkForUpdates: patient.checkForUpdates,
  syncOfflineActions: patient.syncOfflineActions,
};

export default apiService;
