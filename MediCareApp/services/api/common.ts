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

    // Try to parse JSON response, handle cases where response might be empty or not JSON
    let data: any = {};
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    try {
      // Read response body once (can only be read once)
      const text = await response.text();
      
      if (text) {
        if (isJson) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            // If JSON parsing fails, treat as plain text
            console.warn('Failed to parse JSON response:', parseError);
            data = { 
              message: text || `HTTP error! status: ${response.status}`,
              errors: [`Invalid JSON response: ${text.substring(0, 100)}`]
            };
          }
        } else {
          // Not JSON, treat as plain text error message
          data = { message: text || `HTTP error! status: ${response.status}` };
        }
      } else {
        // Empty response
        data = { message: `HTTP error! status: ${response.status}` };
      }
    } catch (readError) {
      // If reading response fails entirely
      console.warn('Failed to read response:', readError);
      data = { 
        message: `HTTP error! status: ${response.status}`,
        errors: [`Failed to read response: ${readError}`]
      };
    }

    if (!response.ok) {
      // Extract detailed error messages from validation errors
      let errorMessage = data?.message || data?.error;
      
      // If we have validation errors, use them to create a better error message
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validationMessages = data.errors.map((e: any) => {
          if (typeof e === 'string') {
            return e;
          }
          // Handle express-validator format: { msg, path, location, type, value }
          if (e?.msg) {
            return e.msg;
          }
          // Handle other error formats
          if (e?.message) {
            return e.message;
          }
          return JSON.stringify(e);
        }).filter(Boolean);
        
        // Use validation messages if available, otherwise fall back to general message
        if (validationMessages.length > 0) {
          errorMessage = validationMessages.join('. ');
        } else if (!errorMessage) {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
      } else if (!errorMessage) {
        errorMessage = `HTTP error! status: ${response.status}`;
      }
      
      const detailedError = new Error(errorMessage);
      (detailedError as any).response = { 
        data: data || {}, 
        status: response.status,
        statusText: response.statusText
      };
      (detailedError as any).errors = data?.errors || [];
      (detailedError as any).status = response.status;
      
      // Log detailed error information for debugging
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        errors: data?.errors,
        fullData: data
      });
      
      throw detailedError;
    }

    return data;
  } catch (error: any) {
    console.error(`❌ API Error (${endpoint}):`, error);
    
    // Enhanced error logging with all available details
    const errorDetails: any = {
      name: error.name,
      message: error.message,
      url,
    };
    
    // Include response details if available
    if (error.response) {
      errorDetails.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }
    
    // Include errors array if available
    if (error.errors) {
      errorDetails.errors = error.errors;
    }
    
    // Include status if available
    if (error.status) {
      errorDetails.status = error.status;
    }
    
    console.error('Error details:', errorDetails);

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

    // Handle 500/503 server errors (database connection issues, etc.)
    if (error.response?.status === 500 || error.status === 500) {
      const serverError = new Error('Erreur serveur. Le serveur rencontre un problème technique. Veuillez réessayer plus tard.');
      (serverError as any).isServerError = true;
      (serverError as any).status = 500;
      throw serverError;
    }

    if (error.response?.status === 503 || error.status === 503) {
      const serviceError = new Error('Service temporairement indisponible. Veuillez réessayer plus tard.');
      (serviceError as any).isServiceError = true;
      (serviceError as any).status = 503;
      throw serviceError;
    }

    // If error already has a response (from our error handling above), re-throw it
    if (error.response) {
      throw error;
    }

    // Handle JSON parsing errors
    if (error.message && (error.message.includes('JSON') || error.message.includes('parse'))) {
      const jsonError = new Error('Erreur de format de réponse. Le serveur a renvoyé une réponse invalide.');
      (jsonError as any).isParseError = true;
      (jsonError as any).originalError = error;
      throw jsonError;
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


