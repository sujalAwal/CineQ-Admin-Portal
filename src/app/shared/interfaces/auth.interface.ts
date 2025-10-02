// User Interface (like Laravel User Model)
export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at?: string;
  role?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

// Login Request Interface
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

// Login Response Interface (like Laravel API Resource)
export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  refresh_token?: string;
  expires_in: number;
}

// API Response Interface (like Laravel JsonResponse)
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

// Error Response Interface
export interface ErrorResponse {
  message: string;
  errors?: {
    [key: string]: string[];
  };
}