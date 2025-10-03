// Table Configuration Interfaces
export interface TableColumn {
  header: string;
  field: string;
  type?: 'text' | 'date' | 'number' | 'badge' | 'toggle' | 'currency' | 'image' | 'email'|'sn';
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableAction {
  label: string;
  icon: string;
  type: 'view' | 'edit' | 'delete';
  class?: string;
  visible?: boolean;
  permission?: string; // For future role-based permissions
}

export interface TableConfig {
  title: string;
  entityName: string;
  apiEndpoint: string;
  columns: TableColumn[];
  actions: TableAction[];
  searchable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  sortable?: boolean;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export interface TableFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationInfo;
  message?: string;
}

export interface TableActionEvent {
  action: string;
  item: any;
  field?: string; // For toggle actions
  value?: any;    // For toggle values
}