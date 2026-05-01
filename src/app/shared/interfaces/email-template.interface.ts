// Email Template Interface
export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  message: string;
  adminSubject?: string;
  adminMessage?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Email Template Request Interface (for CREATE/UPDATE)
export interface EmailTemplateRequest {
  id?: string;
  name: string;
  slug?: string;
  subject: string;
  message: string;
  adminSubject?: string;
  adminMessage?: string;
  isActive: boolean;
}

// Email Template Form Submit Request Interface
export interface EmailTemplateFormSubmitRequest {
  id?: string;
  formSlug: 'email-templates';
  stepSlug: 'v1';
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  formData: EmailTemplateRequest | { id: string };
}

// Email Template Response Interface
export interface EmailTemplateResponse {
  success: boolean;
  message: string;
  data: EmailTemplate;
  timestamp: string;
  path: string;
}

// Email Template List Response Interface
// Note: API returns data as [{ 'email-templates': EmailTemplate[] }]
export interface EmailTemplateListResponse {
  success: boolean;
  message: string;
  data: Array<{ [key: string]: EmailTemplate[] }>;
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
export interface EmailTemplateBulkStatusRequest {
  ids: string[];
  formSlug: string;
  isActive: boolean;
}

// Bulk Status Update Response
export interface EmailTemplateBulkStatusResponse {
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
export interface EmailTemplateBulkDeleteRequest {
  formSlug: string;
  ids: string[];
}

// Bulk Delete Response
export interface EmailTemplateBulkDeleteResponse {
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

// Email Template Page Request Interface
export interface EmailTemplatePageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  active?: boolean;
}
