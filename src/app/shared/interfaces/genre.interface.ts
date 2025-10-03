// Genre Interface 
export interface Genre {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;

}
// Genre Request Interface
export interface GenreRequest {
  id?: string;
  name: string;
  description?: string;
  is_active: boolean;
}

// Genre Response Interface 
export interface GenreResponse {
  message: string;
  genre: Genre;
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