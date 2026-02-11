import Constants from 'expo-constants';
import { request } from './client';
import { AuthResponse, LoginCredentials, RegisterData } from '../../types/auth.types';

export async function login(credentials: LoginCredentials) {
  let pushToken = null;

  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    const isDevice =
      (Device as any)?.isDevice ??
      (Device as any)?.default?.isDevice ??
      false;

    if (!isDevice) {
      console.log('WARN Skipping push token (not a physical device)');
    } else {
      const existingPermissions = await (Notifications as any).getPermissionsAsync();
      let status = existingPermissions?.status;
      if (status !== 'granted') {
        const requested = await (Notifications as any).requestPermissionsAsync();
        status = requested?.status;
      }

      if (status === 'granted') {
        try {
          const projectId =
            (Constants as any).easConfig?.projectId ||
            (Constants as any).expoConfig?.extra?.eas?.projectId;
          const expoToken = await (Notifications as any).getExpoPushTokenAsync({
            projectId,
          });
          pushToken = expoToken.data;
          console.log('OK Real push token generated for login:', pushToken?.substring(0, 40) + '...');
        } catch (tokenError) {
          console.log('WARN Failed to get push token:', tokenError);
        }
      } else {
        console.log('WARN Push permission not granted');
      }
    }
  } catch (error) {
    console.log('WARN Push token generation failed:', error);
  }

  const loginData: any = { 
    emailOrPhone: credentials.emailOrPhone, 
    password: credentials.password 
  };
  if (pushToken) {
    loginData.pushToken = pushToken;
    console.log(
      'Sending push token with login:',
      pushToken.substring(0, 30) + '...'
    );
  } else {
    console.log('No push token available to send with login');
  }

  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginData),
  });
}

export async function register(userData: RegisterData) {
  return request<AuthResponse>('/auth/register', {
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

export async function unregisterPushToken(token: string) {
  return request('/notifications/unregister-token', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}





