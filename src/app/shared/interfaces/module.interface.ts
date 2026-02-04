// Request DTOs
export interface ModuleRequestDTO {
  id?: string; // Optional for create operations
  name: string;
  displayName?: string;
  api?: string;
  description?: string;
  icon?: string | null;
  is_enabled?: boolean;
  parentId?: string;
}

export interface BulkModuleStatusUpdateRequest {
  ids: string[];
}

export interface ModulePageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

// Response DTOs
export interface ModuleResponseDTO {
  id: string;
  code: number;
  name: string;
  displayName?: string | null;
  api?: string | null;
  description: string | null;
  icon?: string | null;
  is_enabled: boolean;
  parentId?: string | null;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface PaginationResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  timestamp: string;
  path: string;
}