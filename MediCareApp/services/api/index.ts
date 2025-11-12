export * from './common';
export * from './caregiver';
export * from './patient';

// Optional compatibility default export mirroring legacy apiService
import * as common from './common';
import * as caregiver from './caregiver';
import * as patient from './patient';

const apiService = {
  // core/request is not meant for external use but included for compatibility where used
  request: common.request,

  // common
  login: common.login,
  register: common.register,
  requestPasswordReset: common.requestPasswordReset,
  verifyResetCode: common.verifyResetCode,
  resetPassword: common.resetPassword,
  registerPushToken: common.registerPushToken,
  getNotificationHistory: common.getNotificationHistory,
  sendTestNotification: common.sendTestNotification,
  getUserProfile: common.getUserProfile,
  updateUserProfile: common.updateUserProfile,

  // caregiver (medecin/tuteur)
  getPatientDetails: caregiver.getPatientDetails,
  getDoctorPatientMedications: caregiver.getDoctorPatientMedications,
  deletePatient: caregiver.deletePatient,
  createPrescription: caregiver.createPrescription,
  updatePrescription: caregiver.updatePrescription,
  deletePrescription: caregiver.deletePrescription,
  uploadVoiceMessage: caregiver.uploadVoiceMessage,
  createVoiceMessage: caregiver.createVoiceMessage,
  getPatientVoiceMessages: caregiver.getPatientVoiceMessages,
  deleteVoiceMessage: caregiver.deleteVoiceMessage,
  getPatientAdherenceHistory: caregiver.getPatientAdherenceHistory,
  sendPatientInvitation: caregiver.sendPatientInvitation,

  // patient
  getPatientMedicationsByDate: patient.getPatientMedicationsByDate,
  confirmMedicationTaken: patient.confirmMedicationTaken,
  snoozeMedicationReminder: patient.snoozeMedicationReminder,
  getUpcomingReminders: patient.getUpcomingReminders,
  checkForUpdates: patient.checkForUpdates,
  syncOfflineActions: patient.syncOfflineActions,
};

export default apiService;


