// Permission Interface
export interface Permission {
  code: number;
  actionName: string;
  readOnly: boolean;
  writeAction: boolean;
  requiresId: boolean;
}

// Module Interface
export interface Module {
  id: string;
  code: number;
  name: string;
  displayName: string;
  api: string;
  description: string;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
  is_enabled: boolean;
}

// Role Interface
export interface Role {
  id?: string;
  name: string;
  permissions: {
    [moduleCode: number]: number[]; // module code -> array of permission codes
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Role Request Interface for API submission
export interface RoleRequest {
  id?: string;
  stepSlug: string;
  action: string;
  formData: {
    id?: string;
    name: string;
    permissions: {
      [moduleCode: number]: number[];
    };
    isActive: boolean;
  };
}

// Role Response Interface
export interface RoleResponse {
  message: string;
  role: Role;
}

// API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  timestamp?: string;
  path?: string;
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

// Role List Response (for table display)
export interface RoleListItem {
  id: string;
  name: string;
  permissionCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role Detail Response (for view/edit)
export interface RoleDetailResponse {
  id: string;
  name: string;
  permissions: {
    [moduleCode: number]: number[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role Page Request Interface
export interface RolePageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}

// Role option from master-data
export interface RoleOptionData {
  key: string;
  value: string;
}

// Master Data Response Interface
export interface MasterDataResponse {
  success: boolean;
  message: string;
  data: {
    permission: Permission[];
    role?: RoleOptionData[];
    additionalData?: any;
  };
  timestamp: string;
  path: string | null;
}
