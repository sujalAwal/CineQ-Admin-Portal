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

// Paginated API Response Interface
export interface PaginatedApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Genre Page Request Interface
export interface GenrePageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}

// Error Response Interface
export interface ErrorResponse {
  message: string;
  errors?: {
    [key: string]: string[];
  };
}