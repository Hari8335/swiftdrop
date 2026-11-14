export type AuthRole = 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | 'DISPATCHER' | 'COURIER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | string;
  merchantId?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
  mustChangePassword?: boolean;
}

export interface TokenRefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user?: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface VerifyResetCodeRequest {
  email: string;
  token: string;
}

export interface AuthError {
  code: string;
  message: string;
  correlationId?: string;
  timestamp?: string;
}
