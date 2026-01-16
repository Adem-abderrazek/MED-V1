/**
 * Authentication-related types
 */

export interface LoginCredentials {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  userType: 'patient' | 'medecin' | 'tuteur';
  dateOfBirth?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
  };
}





