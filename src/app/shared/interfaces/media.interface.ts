// Media File Interface - Updated to match your API response
export interface MediaFile {
  id: string;
  fileName: string;
  url: string;
  type: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO';
  parentId: string | null;
  filePath: string;
  fileUuid: string | null;
  createdAt: string;
  updatedAt: string;
}

// Media Folder Interface - Updated to match your API response
export interface MediaFolder {
  id: string;
  fileName: string;
  url: null;
  type: 'FOLDER';
  parentId: string | null;
  filePath: string;
  fileUuid: null;
  children?: MediaFolder[]; // For nested folder structure
  files?: MediaFile[];     // Files in this folder
  expanded?: boolean;      // For UI state
  createdAt?: string;
  updatedAt?: string;
}

// Media Upload Progress Interface
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Media Manager Configuration Interface
export interface MediaManagerConfig {
  title?: string;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  multipleSelection?: boolean;
  showUploadButton?: boolean;
  showCreateFolderButton?: boolean;
  showDeleteButton?: boolean;
  showPreviewButton?: boolean;
  rootFolderId?: string;
  initialFolderId?: string;
}

// Media Manager Selection Interface
export interface MediaSelection {
  files: MediaFile[];
  folders: MediaFolder[];
  totalCount: number;
}

// Media Manager State Interface
export interface MediaManagerState {
  currentFolderId?: string;
  currentPath: string[];
  breadcrumbs: BreadcrumbItem[];
  selectedItems: MediaSelection;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'size' | 'date' | 'type';
  sortDirection: 'asc' | 'desc';
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgress[];
}

// Breadcrumb Item Interface
export interface BreadcrumbItem {
  id?: string;
  name: string;
  path: string;
  isClickable: boolean;
}

// Media API Request Interfaces
export interface MediaPageRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  folderId?: string;
  fileType?: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

export interface UploadFileRequest {
  files: File[];
  folderId?: string;
  onProgress?: (progress: UploadProgress[]) => void;
}

export interface DeleteMediaRequest {
  mediaIds: string[];
}

// Media API Response Interfaces
export interface MediaApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

export interface PaginatedMediaResponse<T = any> {
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

// Media Manager Events Interface
export interface MediaManagerEvents {
  onFileSelect?: (files: MediaFile[]) => void;
  onFolderSelect?: (folder: MediaFolder) => void;
  onFileUpload?: (files: MediaFile[]) => void;
  onFolderCreate?: (folder: MediaFolder) => void;
  onFileDelete?: (files: MediaFile[]) => void;
  onFolderDelete?: (folders: MediaFolder[]) => void;
  onClose?: () => void;
}

// File Type Categories
export interface FileTypeCategory {
  name: string;
  extensions: string[];
  mimeTypes: string[];
  icon: string;
  color: string;
}

// Media Manager Constants
export const FILE_TYPE_CATEGORIES: FileTypeCategory[] = [
  {
    name: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'],
    icon: 'ti ti-photo',
    color: '#28a745'
  },
  {
    name: 'Videos',
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    mimeTypes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska'],
    icon: 'ti ti-video',
    color: '#dc3545'
  },
  {
    name: 'Audio',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/mp4'],
    icon: 'ti ti-music',
    color: '#6f42c1'
  },
  {
    name: 'Documents',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'application/rtf'],
    icon: 'ti ti-file-text',
    color: '#007bff'
  },
  {
    name: 'Archives',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'],
    icon: 'ti ti-archive',
    color: '#fd7e14'
  },
  {
    name: 'Other',
    extensions: [],
    mimeTypes: [],
    icon: 'ti ti-file',
    color: '#6c757d'
  }
];

// Utility function to get file type category
export function getFileTypeCategory(file: MediaFile): FileTypeCategory {
  const fileName = file.fileName.toLowerCase();
  const extension = fileName.split('.').pop() || '';
  
  for (const category of FILE_TYPE_CATEGORIES) {
    if (category.extensions.includes(extension)) {
      return category;
    }
  }
  
  return FILE_TYPE_CATEGORIES[FILE_TYPE_CATEGORIES.length - 1]; // Return 'Other' category
}

// Utility function to format file size (placeholder since size not in API)
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to check if file is image
export function isImageFile(file: MediaFile): boolean {
  return file.type === 'IMAGE';
}

// Utility function to check if file is video
export function isVideoFile(file: MediaFile): boolean {
  return file.type === 'VIDEO';
}

// Utility function to check if file is audio
export function isAudioFile(file: MediaFile): boolean {
  return file.type === 'AUDIO';
}
