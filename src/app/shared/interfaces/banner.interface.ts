// Banner Button Interface
export interface BannerButton {
  title: string;
  redirectLink: string;
  buttonType: 'primary' | 'secondary' | 'tertiary';
  openInNewTab: boolean;
}

// Banner Display Configuration Interface
export interface DisplayConfig {
  showTitle: boolean;
  showDescription: boolean;
  showButtons: boolean;
}

// Banner Interface 
export interface Banner {
  id: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  bannerImage: string;
  imageAltText: string;
  imageMobileUrl?: string;
  buttons: BannerButton[];
  displayConfig?: DisplayConfig;
  createdAt?: string;
  updatedAt?: string;
}

// Banner Request Interface (for CREATE/UPDATE)
export interface BannerRequest {
  id?: string;
  slug?: string; // Required only for CREATE
  title: string;
  description?: string;
  order: number;
  isActive: boolean;
  bannerImage: string;
  imageAltText: string;
  imageMobileUrl?: string;
  buttons: BannerButton[];
  displayConfig?: DisplayConfig;
}

// Banner Form Submit Request Interface
export interface BannerFormSubmitRequest {
  id?: string; // Required at root level for updates
  formSlug: 'banner';
  stepSlug: 'v1';
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  formData: BannerRequest | { id: string };
}

// Banner Response Interface 
export interface BannerResponse {
  success: boolean;
  message: string;
  data: Banner;
  timestamp: string;
  path: string;
}

// Banner List Response Interface (unique structure with nested banner array)
export interface BannerListResponse {
  success: boolean;
  message: string;
  data: Array<{ banner: Banner[] }>;

    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
    hasPrevious: boolean;

  timestamp: string;
  path: string;
}

// Bulk Status Update Request
export interface BannerBulkStatusRequest {
  ids: string[];
  formSlug: string;
  isActive: boolean;
}

// Bulk Status Update Response
export interface BannerBulkStatusResponse {
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
export interface BulkDeleteRequest {
  formSlug: string;
  ids: string[];
}

// Bulk Delete Response
export interface BulkDeleteResponse {
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

// Banner Page Request Interface
export interface BannerPageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}

