// Setting Interface — shared by backend-settings, admin-portal-settings, customer-portal-settings
export interface Setting {
  id: string;
  title: string;
  slug: string;
  type: SettingType;
  value?: string;
  group: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Allowed setting types
export type SettingType =
  | 'text'
  | 'checkbox'
  | 'media'
  | 'color'
  | 'date'
  | 'json';



// Setting Request Interface (for CREATE/UPDATE)
export interface SettingRequest {
  id?: string;
  title: string;
  slug?: string;
  type: SettingType;
  value?: string;
  group: string;
  isActive: boolean;
}

// Setting Response Interface
export interface SettingResponse {
  success: boolean;
  message: string;
  data: Setting;
  timestamp?: string;
  path?: string;
}

// Setting List Response Interface
// Note: API returns data as [{ '<formSlug>': Setting[] }]
export interface SettingListResponse {
  success: boolean;
  message: string;
  data: Array<{ [key: string]: Setting[] }>;
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
export interface SettingBulkStatusRequest {
  ids: string[];
  formSlug: string;
  isActive: boolean;
}

// Bulk Status Update Response
export interface SettingBulkStatusResponse {
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
  timestamp?: string;
  path?: string;
}

// Bulk Delete Request
export interface SettingBulkDeleteRequest {
  formSlug: string;
  ids: string[];
}

// Bulk Delete Response
export interface SettingBulkDeleteResponse {
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

// Setting Page Request Interface
export interface SettingPageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}
