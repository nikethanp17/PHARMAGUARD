// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone?: string;
  createdAt: string;
  lastLoginAt: string;
  analysisHistory: AnalysisHistoryEntry[];
}

export interface AnalysisHistoryEntry {
  id: string;
  timestamp: string;
  patientId: string;
  drugs: string[];
  vcfFileName: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  identifier: string; // email, username, or phone
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  username: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  hipaaConsent: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: number; // Unix timestamp
}

export interface RateLimitState {
  attempts: number;
  lockedUntil: number | null; // Unix timestamp
}

export type AuthPage = 'login' | 'register' | 'forgot' | 'reset';

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too Short' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}
