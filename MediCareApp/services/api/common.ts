import { getApiConfig } from '../../config/api';

export interface ApiResponse<T> {
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

const API_CONFIG = getApiConfig();

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
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
      url,
    });

    if (error.name === 'AbortError') {
      const timeoutError = new Error('La requête a expiré. Vérifiez votre connexion internet et réessayez.');
      (timeoutError as any).isTimeout = true;
      throw timeoutError;
    }

    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Network request failed'))) {
      const networkError = new Error('Erreur de connexion. Vérifiez que votre serveur backend est accessible et que vous êtes connecté à internet.');
      (networkError as any).isNetworkError = true;
      throw networkError;
    }

    if (error.response) {
      throw error;
    }

    const wrappedError = new Error(error.message || 'Une erreur réseau est survenue');
    (wrappedError as any).originalError = error;
    throw wrappedError;
  }
}

/* ========== Auth & Common endpoints ========== */

export async function login(emailOrPhone: string, password: string) {
  let pushToken = null;

  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if ((Device as any).default?.isDevice) {
      const { status } = await (Notifications as any).requestPermissionsAsync();
      if (status === 'granted') {
        try {
          const expoToken = await (Notifications as any).getExpoPushTokenAsync({
            projectId: '5a67e51b-1891-42f2-8512-c3316698f404',
          });
          pushToken = expoToken.data;
          console.log('✅ Real push token generated for login:', pushToken?.substring(0, 40) + '...');
        } catch (tokenError) {
          console.log('⚠️ Failed to get push token:', tokenError);
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

  const loginData: any = { emailOrPhone, password };
  if (pushToken) {
    loginData.pushToken = pushToken;
    console.log('📤 Sending login with push token');
  } else {
    console.log('📤 Sending login without push token (emulator or token unavailable)');
  }

  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginData),
  });
}

export async function register(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  userType: 'patient' | 'tuteur' | 'medecin';
}) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function requestPasswordReset(emailOrPhone: string) {
  return request('/auth/send-verification-code', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: emailOrPhone }),
  });
}

export async function verifyResetCode(emailOrPhone: string, code: string) {
  return request('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: emailOrPhone, code }),
  });
}

export async function resetPassword(emailOrPhone: string, code: string, newPassword: string) {
  return request('/auth/reset-password-with-code', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: emailOrPhone, code, newPassword }),
  });
}

export async function registerPushToken(token: string, pushToken: string) {
  return request('/notifications/register-token', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ pushToken }),
  });
}

export async function getNotificationHistory(token: string, limit: number = 50) {
  return request(`/notifications/history?limit=${limit}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function sendTestNotification(token: string) {
  return request('/notifications/test', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function getUserProfile(token: string) {
  return request('/user/profile', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function updateUserProfile(token: string, profileData: any) {
  return request('/user/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(profileData),
  });
}


