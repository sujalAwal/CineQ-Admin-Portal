/**
 * Artist Interface Definitions
 * Based on the genre pattern but adapted for artists
 */

// Core Artist Interface
export interface Artist {
  id?: string;
  full_name: string;
  email?: string;
  avatar?: string;
  artist_type_id?: string;
  artist_type_name?: string;
  bio?: string;
  birth_date?: string;
  nationality?: string;
  movies_count?: number;
  rating?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// API Request/Response Types
export interface ArtistRequest {
  id?: string;
  full_name: string;
  email?: string;
  avatar?: string;
  artist_type_id?: string;
  bio?: string;
  birth_date?: string;
  nationality?: string;
  is_active: boolean;
}

export interface ArtistResponse {
  id: string;
  full_name: string;
  email?: string;
  avatar?: string;
  artist_type_id?: string;
  artist_type_name?: string;
  bio?: string;
  birth_date?: string;
  nationality?: string;
  movies_count?: number;
  rating?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Pagination Request for Artists
export interface ArtistPageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
  artist_type_id?: string;
}

// Generic API Response Structure
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

// Paginated API Response
export interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  errors?: any;
}

// Bulk Operation Types
export interface ArtistBulkOperation {
  action: 'enable' | 'disable' | 'delete';
  artistIds: string[];
}

export interface ArtistBulkResponse {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  errors?: string[];
}