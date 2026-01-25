// Form Step Interface
export interface FormStep {
    id?: string;
    stepTitle: string;
    stepSlug: string;
    stepOrder: number;
    // String versions for editing (textarea)
    validationRulesJson: string;  // JSON string for textarea editing
    formSchemaJson: string;       // JSON string for textarea editing
    uiSchemaJson: string;         // JSON string for textarea editing
    metadataJson?: string;         // JSON string for textarea editing (optional)
    workflowRulesJson: string;    // JSON string for textarea editing
    // Parsed object versions for backend
    validationRules: any;  // Parsed JSON object
    formSchema: any;       // Parsed JSON object
    uiSchema: any;         // Parsed JSON object
    metadata?: any;         // Parsed JSON object (optional)
    workflowRules: any;    // Parsed JSON object
    // UI state properties (not persisted)
    jsonErrors?: {
        validationRules?: string;
        formSchema?: string;
        uiSchema?: string;
        metadata?: string;
        workflowRules?: string;
    };
    expanded?: boolean; // For UI accordion
}

// Form Step Request Interface
export interface FormStepRequest {
    stepTitle: string;
    stepSlug: string;
    stepOrder: number;
    validationRules: any;  // Parsed JSON object
    formSchema: any;       // Parsed JSON object
    uiSchema: any;         // Parsed JSON object
    metadata?: any;         // Parsed JSON object (optional)
    workflowRules: any;    // Parsed JSON object
}

// Form Manager Interface
export interface FormManager {
    id: string;
    title: string;
    slug: string;
    description?: string;
    isActive: boolean;
    version: string;
    formSteps: FormStep[];  // Array of form steps instead of individual fields
}

// Form Manager Request Interface - Updated to support multi-step
export interface FormManagerRequest {
  id?: string;
  title: string;
  slug: string;
  description?: string;
  is_active: boolean;
  version: string;
  formSteps: FormStepRequest[]; // Array of steps instead of individual fields
}

// Form Manager Response Interface 
export interface FormManagerResponse {
  formManager: FormManager;
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

// Form Manager Page Request Interface
export interface FormManagerPageRequest {
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
