import { getApiConfig } from '../config/api';

const API_CONFIG = getApiConfig();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  token?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'tuteur' | 'medecin' | 'patient';
    phoneNumber: string;
  };
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`✅ API Response: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (!response.ok) {
        // Create detailed error with response data
        const detailedError = new Error(data.message || `HTTP error! status: ${response.status}`);
        (detailedError as any).response = { data, status: response.status };
        throw detailedError;
      }

      return data;
    } catch (error: any) {
      console.error(`❌ API Error (${endpoint}):`, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        url: url,
      });

      // Handle timeout
      if (error.name === 'AbortError') {
        const timeoutError = new Error('La requête a expiré. Vérifiez votre connexion internet et réessayez.');
        (timeoutError as any).isTimeout = true;
        throw timeoutError;
      }

      // If it's a fetch error (network), provide more helpful message
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network request failed'))) {
        const networkError = new Error('Erreur de connexion. Vérifiez que votre serveur backend est accessible et que vous êtes connecté à internet.');
        (networkError as any).isNetworkError = true;
        throw networkError;
      }

      // If it's our detailed error, preserve it
      if (error.response) {
        throw error;
      }

      // For other errors, wrap them
      const wrappedError = new Error(error.message || 'Une erreur réseau est survenue');
      (wrappedError as any).originalError = error;
      throw wrappedError;
    }
  }

  // Auth endpoints
  async login(emailOrPhone: string, password: string) {
    // 🔥 GENERATE PUSH TOKEN AUTOMATICALLY ON LOGIN
    let pushToken = null;

    try {
      // Import Notifications dynamically to avoid import issues
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      // Only try to get push token on physical devices
      if (Device.default.isDevice) {
        // Request permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          console.log('📱 Generating push token for login...');

          try {
            // Try to get real Expo push token
            const expoToken = await Notifications.getExpoPushTokenAsync({
              projectId: '5a67e51b-1891-42f2-8512-c3316698f404',
            });
            pushToken = expoToken.data;
            console.log('✅ Real push token generated for login:', pushToken?.substring(0, 40) + '...');
          } catch (tokenError) {
            console.log('⚠️ Failed to get push token:', tokenError);
            // Don't create a fallback token - just continue without it
          }
        } else {
          console.log('❌ Push notification permissions not granted');
        }
      } else {
        console.log('⚠️ Running on emulator/simulator - skipping push token generation');
      }
    } catch (error) {
      console.log('⚠️ Push token generation failed:', error);
    }

    // Send login request with push token (only if it's a real token)
    const loginData: any = { emailOrPhone, password };
    if (pushToken) {
      loginData.pushToken = pushToken;
      console.log('📤 Sending login with push token');
    } else {
      console.log('📤 Sending login without push token (emulator or token unavailable)');
    }

    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    userType: 'patient' | 'tuteur' | 'medecin';
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async requestPasswordReset(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // SMS Verification endpoints - now using backend
  async sendVerificationCode(phoneNumber: string) {
    console.log('📱 Sending verification code request to backend for:', phoneNumber);
    return this.request('/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async verifyCode(phoneNumber: string, code: string) {
    console.log('🔍 Verifying code for:', phoneNumber, 'with code:', code);
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    });
  }

  async resetPasswordWithCode(phoneNumber: string, code: string, newPassword: string) {
    console.log('🔑 Resetting password for:', phoneNumber, 'with code:', code);
    return this.request('/auth/reset-password-with-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code, newPassword }),
    });
  }

  // User profile endpoints
  async getUserProfile(token: string) {
    return this.request('/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateUserProfile(token: string, profileData: any) {
    return this.request('/user/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  }

  // Patient endpoints
  async getPatientDashboard(token: string) {
    return this.request('/patient/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getPatientMedications(token: string) {
    return this.request('/patient/medications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getPatientMessages(token: string, limit: number = 50) {
    return this.request(`/patient/messages?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async markMedicationTaken(token: string, reminderId: string) {
    return this.request('/patient/medications/mark-taken', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reminderId }),
    });
  }

  async getPatientMedicationsByDate(token: string, date: string) {
    return this.request(`/patient/medications/by-date?date=${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Tutor endpoints
  async getTutorDashboard(token: string) {
    return this.request('/tutor/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getTutorPatients(token: string) {
    return this.request('/tutor/patients', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async addPatient(token: string, patientData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  }) {
    return this.request('/tutor/patients', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(patientData),
    });
  }

  // Doctor endpoints (unified with tutor - uses tutor endpoint which supports both)
  async getDoctorDashboard(token: string) {
    return this.request('/tutor/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getDoctorPatients(token: string) {
    // Use unified tutor endpoint which supports both tuteur and medecin
    return this.request('/tutor/patients', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Voice message upload for doctors (using tutor endpoint)
  async uploadVoiceMessage(token: string, payload: {
    fileBase64: string;
    fileName?: string;
    mimeType?: string;
  }) {
    return this.request<{ fileUrl: string; path: string }>('/tutor/voice-messages/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  // Send patient invitation with SMS and optional audio (using tutor endpoint)
  async sendPatientInvitation(token: string, invitationData: {
    phoneNumber: string;
    audioMessage?: string;
    audioDuration?: number;
  }) {
    return this.request('/tutor/patients/invite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(invitationData),
    });
  }

  // Get specific patient details (unified for both doctor and tutor)
  async getPatientDetails(token: string, patientId: string) {
    return this.request(`/tutor/patients/${patientId}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Get patient adherence history (for doctors/tutors)
  async getPatientAdherenceHistory(token: string, patientId: string, daysBack: number = 30) {
    return this.request(`/tutor/patients/${patientId}/adherence-history?days=${daysBack}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Get specific patient medications (for doctors/tutors viewing a patient)
  async getDoctorPatientMedications(token: string, patientId: string) {
    return this.request(`/medecin/patients/${patientId}/medications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Delete patient relationship (works for both tutor and doctor)
  async deletePatient(token: string, patientId: string) {
    return this.request(`/tutor/patients/${patientId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Prescription management endpoints
  async createPrescription(token: string, patientId: string, prescriptionData: {
    medicationName: string;
    medicationGenericName?: string;
    medicationDosage?: string;
    medicationForm?: string;
    medicationDescription?: string;
    customDosage?: string;
    instructions?: string;
    schedules: Array<{ time: string; days: number[] }>;
    voiceMessageId?: string | null;
    isChronic?: boolean;
    endDate?: string;
    scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
    intervalHours?: number;
  }) {
    return this.request(`/tutor/patients/${patientId}/prescriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ patientId, ...prescriptionData }),
    });
  }

  async updatePrescription(token: string, prescriptionId: string, prescriptionData: {
    medicationName?: string;
    medicationGenericName?: string;
    medicationDosage?: string;
    medicationForm?: string;
    medicationDescription?: string;
    customDosage?: string;
    instructions?: string;
    schedules?: Array<{ time: string; days: number[] }>;
    voiceMessageId?: string | null;
    isChronic?: boolean;
    endDate?: string;
    scheduleType?: 'daily' | 'weekly' | 'interval' | 'monthly' | 'custom';
    intervalHours?: number;
  }) {
    return this.request(`/tutor/prescriptions/${prescriptionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(prescriptionData),
    });
  }

  async deletePrescription(token: string, prescriptionId: string) {
    return this.request(`/tutor/prescriptions/${prescriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Voice message endpoints
  async uploadVoiceMessage(token: string, payload: {
    fileBase64: string;
    fileName?: string;
    mimeType?: string;
  }) {
    return this.request<{ fileUrl: string; path: string }>('/tutor/voice-messages/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async getPatientVoiceMessages(token: string, patientId: string) {
    return this.request(`/tutor/voice-messages?patientId=${patientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async createVoiceMessage(token: string, payload: { 
    patientId: string; 
    fileUrl: string; 
    fileName?: string; 
    title?: string;
    durationSeconds?: number 
  }) {
    return this.request('/tutor/voice-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteVoiceMessage(token: string, id: string) {
    return this.request(`/tutor/voice-messages/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Notification endpoints
  async registerPushToken(token: string, pushToken: string) {
    return this.request('/notifications/register-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ pushToken }),
    });
  }

  async confirmMedicationTaken(token: string, reminderIds: string[]) {
    return this.request('/notifications/confirm-medication', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reminderIds }),
    });
  }

  async snoozeMedicationReminder(token: string, reminderIds: string[]) {
    return this.request('/notifications/snooze-reminder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reminderIds }),
    });
  }

  async syncOfflineActions(token: string, actions: Array<{ id: string; type: string; reminderId: string; timestamp: string }>) {
    return this.request('/notifications/sync-offline-actions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ actions }),
    });
  }

  async updateNotificationSettings(token: string, enabled: boolean) {
    return this.request('/notifications/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled }),
    });
  }

  async getNotificationHistory(token: string, limit: number = 50) {
    return this.request(`/notifications/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async sendTestNotification(token: string) {
    return this.request('/notifications/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Offline sync endpoints
  async getUpcomingReminders(token: string, daysAhead: number = 30) {
    return this.request(`/patient/reminders/upcoming?days=${daysAhead}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async checkForUpdates(token: string, lastSyncTime?: string) {
    const url = lastSyncTime 
      ? `/patient/check-updates?lastSync=${encodeURIComponent(lastSyncTime)}`
      : '/patient/check-updates';
    
    return this.request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}

export default new ApiService();
