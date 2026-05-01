// Setting Group Interface
export interface SettingGroup {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Setting Group Request Interface (for CREATE/UPDATE)
export interface SettingGroupRequest {
  id?: string;
  title: string;
  slug?: string;
  isActive: boolean;
}

// Setting Group Response Interface
export interface SettingGroupResponse {
  success: boolean;
  message: string;
  data: SettingGroup;
  timestamp: string;
  path: string;
}

// Setting Group List Response Interface
// Note: API returns data as [{ 'settings-groups': SettingGroup[] }]
export interface SettingGroupListResponse {
  success: boolean;
  message: string;
  data: Array<{ [key: string]: SettingGroup[] }>;
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  timestamp?: string;
  path?: string;
}

// Bulk Status Update Request
export interface SettingGroupBulkStatusRequest {
  ids: string[];
  formSlug: string;
  isActive: boolean;
}

// Bulk Status Update Response
export interface SettingGroupBulkStatusResponse {
  success: boolean;
  message: string;
  data: {
    updated: number;
    failed: number;
    results: Array<{
      id: string;
      slug: string;
      isActive?: boolean;
      updatedAt?: string;
      error?: string;
    }>;
  };
  timestamp: string;
  path: string;
}

// Bulk Delete Request
export interface SettingGroupBulkDeleteRequest {
  formSlug: string;
  ids: string[];
}

// Bulk Delete Response
export interface SettingGroupBulkDeleteResponse {
  success: boolean;
  message: string;
  data: {
    deleted: number;
    failed: number;
    results: Array<{
      id: string;
      success: boolean;
      message: string;
    }>;
  };
  timestamp?: string;
  path?: string;
}

// Setting Group Page Request Interface
export interface SettingGroupPageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}
