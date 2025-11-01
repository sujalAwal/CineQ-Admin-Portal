import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
// Removed HttpEventType import - using numeric constants to match working component

// Project imports
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../confirmation-modal/confirmation-modal.component';
import { MediaService } from '../../services/media.service';
import { ToastService } from '../../services/toast.service';
import { FolderTreeComponent } from '../folder-tree/folder-tree.component';
import { 
  MediaFile, 
  MediaFolder, 
  MediaManagerConfig, 
  MediaManagerState, 
  MediaSelection,
  BreadcrumbItem,
  UploadProgress,
  CreateFolderRequest,
  DeleteMediaRequest,
  MediaPageRequest,
  FILE_TYPE_CATEGORIES,
  getFileTypeCategory,
  formatFileSize,
  isImageFile
} from '../../interfaces/media.interface';

@Component({
  selector: 'app-media-manager-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BaseModalComponent,
    ConfirmationModalComponent,
    FolderTreeComponent
  ],
  templateUrl: './media-manager-modal.component.html',
  styleUrls: ['./media-manager-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaManagerModalComponent implements OnInit, OnDestroy, OnChanges {
  
  // Input Properties (for standalone usage)
  @Input() isVisible: boolean = false;
  @Input() config: MediaManagerConfig = {};
  @Input() isLoading: boolean = false;
  
  // Output Events (for standalone usage)
  @Output() closed = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<MediaFile[]>();
  @Output() folderSelected = new EventEmitter<MediaFolder>();
  
  // Component State
  state: MediaManagerState = {
    currentFolderId: undefined,
    currentPath: [],
    breadcrumbs: [],
    selectedItems: {
      files: [],
      folders: [],
      totalCount: 0
    },
    searchQuery: '',
    viewMode: 'grid',
    sortBy: 'name',
    sortDirection: 'asc',
    isLoading: false,
    isUploading: false,
    uploadProgress: []
  };

  // Data
  files: MediaFile[] = [];
  folders: MediaFolder[] = [];
  rawApiResponse: any = null; // For debugging
  folderTree: MediaFolder[] = [];
  
  // Pagination
  pagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Forms
  searchForm!: FormGroup;
  createFolderForm!: FormGroup;
  
  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Media Manager',
    icon: 'folder',
    size: 'xl',
    primaryButtonText: 'Select Files',
    primaryButtonIcon: 'check',
    primaryButtonLoading: false,
    primaryButtonDisabled: true,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  // Confirmation modal state
  showConfirmationModal: boolean = false;
  confirmationConfig: ConfirmationConfig = {
    title: 'Confirm Delete',
    message: '',
    icon: 'ti ti-trash',
    iconColor: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'btn-danger'
  };
  itemsToDelete: { files: MediaFile[], folders: MediaFolder[] } = { files: [], folders: [] };

  // Create folder modal state
  showCreateFolderModal: boolean = false;

  // File upload state
  selectedFiles: File[] = [];
  isDragOver: boolean = false;

  // Upload Files Modal state
  showUploadModal: boolean = false;
  selectedFilesForUpload: any[] = [];
  isUploading: boolean = false;

  // Selected Files Display (for showing selected files)
  selectedMediaFiles: MediaFile[] = [];


  // Constants
  readonly FILE_TYPE_CATEGORIES = FILE_TYPE_CATEGORIES;
  readonly formatFileSize = formatFileSize;
  readonly isImageFile = isImageFile;
  readonly getFileTypeCategory = getFileTypeCategory;

  // Memory leak prevention
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private mediaService: MediaService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.setupDebouncedSearch();
    this.updateModalConfig();
    // Don't load data here - wait for modal to be visible
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      // Only load data when modal becomes visible
      this.loadInitialData();
    }
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Initialize reactive forms
   */
  private initializeForms(): void {
    this.searchForm = this.fb.group({
      search: ['']
    });

    this.createFolderForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]]
    });
  }

  /**
   * Setup debounced search
   */
  private setupDebouncedSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  /**
   * Load initial data
   * Matches the pattern from media-manager.component.ts
   */
  private loadInitialData(): void {
    console.log('🔄 Loading initial data for modal...');
    // Reset state
    this.files = [];
    this.folders = [];
    this.state.selectedItems = { files: [], folders: [], totalCount: 0 };
    this.selectedMediaFiles = [];
    this.state.breadcrumbs = [{ name: 'Root', path: '/', isClickable: true }];
    this.cdr.markForCheck();
    
    // Load folder tree (which will load files)
    this.loadFolderTree();
  }

  /**
   * Load folder tree
   * Matches the pattern from media-manager.component.ts
   */
  private loadFolderTree(): void {
    this.mediaService.getFolderTree()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (folders) => {
          // Set first folder as current folder (if available)
          const value = this.accessFirstItem(folders, 'id');
          if (typeof value === 'string') {
            this.state.currentFolderId = value;
            // Build breadcrumbs for the first folder
            const firstFolder = folders[0];
            if (firstFolder && firstFolder.filePath) {
              this.state.currentPath = firstFolder.filePath.split('/').filter(segment => segment);
              this.state.breadcrumbs = this.buildBreadcrumbs(firstFolder.filePath);
            }
          } else {
            // No folders - navigate to root
            this.state.currentFolderId = undefined;
            this.state.currentPath = [];
            this.state.breadcrumbs = [{ name: 'Root', path: '/', isClickable: true }];
          }
          
          // Load files after setting current folder ID
          this.loadFiles();
          
          this.folderTree = folders;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('❌ Error loading folder tree:', error);
          this.folderTree = [];
          // Even on error, try to load files for root
          this.state.currentFolderId = undefined;
          this.state.currentPath = [];
          this.state.breadcrumbs = [{ name: 'Root', path: '/', isClickable: true }];
          this.loadFiles();
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Access first item's property from array (matches working component)
   */
  private accessFirstItem(array: any[], key: string): any {
    if (array.length > 0) {
      const firstItem = array[0];
      return firstItem[key];
    }
    return undefined;
  }

  /**
   * Load files only (no folders in main grid) - folders are in sidebar
   */
  private loadFiles(additionalFilters?: Partial<MediaPageRequest>): void {
    console.log('🔄 Starting to load files...', 'currentFolderId:', this.state.currentFolderId);
    this.state.isLoading = true;
    this.cdr.markForCheck();

    this.mediaService.getMedia(this.state.currentFolderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ API Response received:', response);
          
          // Store raw response for debugging
          this.rawApiResponse = response;
          
          // Only load files, not folders (folders are in sidebar tree)
          this.files = response.files || [];
          // Don't set folders from response - folders come from folderTree
          this.folders = []; // Clear folders array - they're only in sidebar
          
          console.log('✅ Files loaded:', this.files.length);
          
          if(this.files.length > 0) {
            console.log('✅ First file:', this.files[0]);
          }
          
          // Update pagination info if available
          if (response.pagination) {
            this.pagination = {
              currentPage: response.pagination.page || 1,
              totalPages: response.pagination.totalPages || 1,
              totalItems: response.pagination.totalElements || this.files.length,
              pageSize: response.pagination.size || 20
            };
          } else {
            // Default pagination if not provided
            this.pagination = {
              currentPage: 1,
              totalPages: 1,
              totalItems: this.files.length,
              pageSize: 20
            };
          }

          // 🚀 CRITICAL: Set loading to false and trigger change detection
          this.state.isLoading = false;
          console.log('✅ Loading complete, state.isLoading:', this.state.isLoading, 'files.length:', this.files.length);
          
          // Force change detection - OnPush requires explicit marking
          // Create a new array reference AND state object reference to trigger change detection
          this.files = [...this.files];
          this.state = { ...this.state }; // Create new state object reference
          
          console.log('🔄 Before markForCheck - files.length:', this.files.length, 'state.isLoading:', this.state.isLoading);
          this.cdr.markForCheck();
          
          // Use detectChanges immediately instead of setTimeout for OnPush
          this.cdr.detectChanges();
          console.log('🔄 After detectChanges - files.length:', this.files.length);
          
          // Also try after a small delay
          setTimeout(() => {
            console.log('🔄 Forcing change detection after timeout, files.length:', this.files.length);
            this.cdr.detectChanges();
          }, 10);
          
          // Try one more time after animation frame
          requestAnimationFrame(() => {
            this.cdr.detectChanges();
            console.log('🔄 After requestAnimationFrame, files.length:', this.files.length);
          });
        },
        error: (error) => {
          console.error('❌ API Error:', error);
          this.files = [];
          this.folders = []; // Clear folders on error too
          this.state.isLoading = false;
          // Show empty state on error
          console.log('⚠️ Error occurred - will show empty state');
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Perform search
   */
  private performSearch(searchTerm: string): void {
    this.state.searchQuery = searchTerm;
    this.pagination.currentPage = 1;
    this.loadFiles();
  }

  /**
   * Update modal configuration
   */
  private updateModalConfig(): void {
    this.modalConfig.title = this.config.title || 'Media Manager';
    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.state.selectedItems.totalCount === 0;
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  /**
   * Build breadcrumbs from path
   */
  private buildBreadcrumbs(path: string): BreadcrumbItem[] {
    const segments = path.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Root', path: '/', isClickable: true }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      breadcrumbs.push({
        name: segment,
        path: currentPath,
        isClickable: index < segments.length - 1
      });
    });

    return breadcrumbs;
  }

  /**
   * Handle breadcrumb click
   */
  onBreadcrumbClick(breadcrumb: BreadcrumbItem): void {
    if (!breadcrumb.isClickable) return;

    if (breadcrumb.name === 'Root' || breadcrumb.path === '/') {
      // Navigate to root - matches working component's navigateToRoot()
      this.onRootFolderClick();
    } else {
      // Find folder by path and navigate to it
      const folder = this.findFolderByPath(breadcrumb.path);
      if (folder) {
        this.onFolderSelect(folder);
      }
    }
  }

  /**
   * Find folder by path (recursively searches in nested folders)
   */
  private findFolderByPath(path: string): MediaFolder | null {
    const findInTree = (folders: MediaFolder[]): MediaFolder | null => {
      for (const folder of folders) {
        if (folder.filePath === path) {
          return folder;
        }
        // Recursively search in children
        if (folder.children && folder.children.length > 0) {
          const found = findInTree(folder.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return findInTree(this.folderTree);
  }

  /**
   * Handle file selection
   */
  onFileSelect(file: MediaFile, event: Event): void {
    const target = event.target as HTMLInputElement;
    
    if (target.checked) {
      if (!this.state.selectedItems.files.some(f => f.id === file.id)) {
        this.state.selectedItems.files.push(file);
        // Also update selectedMediaFiles for display
        this.selectedMediaFiles = [...this.state.selectedItems.files];
      }
    } else {
      this.state.selectedItems.files = this.state.selectedItems.files.filter(f => f.id !== file.id);
      // Also update selectedMediaFiles for display
      this.selectedMediaFiles = [...this.state.selectedItems.files];
    }
    
    this.state.selectedItems.totalCount = this.state.selectedItems.files.length + this.state.selectedItems.folders.length;
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Handle folder selection
   */
  onFolderItemSelect(folder: MediaFolder, event: Event): void {
    const target = event.target as HTMLInputElement;
    
    if (target.checked) {
      this.state.selectedItems.folders.push(folder);
    } else {
      this.state.selectedItems.folders = this.state.selectedItems.folders.filter(f => f.id !== folder.id);
    }
    
    this.state.selectedItems.totalCount = this.state.selectedItems.files.length + this.state.selectedItems.folders.length;
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Handle select all checkbox (only files, folders are in sidebar)
   */
  onSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    
    if (target.checked) {
      // Only select files (folders are in sidebar, not selectable in grid)
      this.state.selectedItems.files = [...this.files];
      this.state.selectedItems.folders = []; // Don't select folders from grid
      // Also update selectedMediaFiles for display
      this.selectedMediaFiles = [...this.state.selectedItems.files];
    } else {
      this.state.selectedItems.files = [];
      this.state.selectedItems.folders = [];
      // Also update selectedMediaFiles for display
      this.selectedMediaFiles = [];
    }
    
    this.state.selectedItems.totalCount = this.state.selectedItems.files.length + this.state.selectedItems.folders.length;
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Handle sorting
   */
  onSort(field: string): void {
    if (this.state.sortBy === field) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortBy = field as any;
      this.state.sortDirection = 'asc';
    }
    
    this.pagination.currentPage = 1;
    this.loadFiles();
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number): void {
    this.pagination.currentPage = page;
    this.loadFiles();
  }

  /**
   * Handle file upload
   */
  onFileUpload(files: File[]): void {
    this.selectedFiles = files;
    this.state.isUploading = true;
    this.state.uploadProgress = files.map(file => ({
      fileId: file.name,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));

    this.mediaService.uploadMultiple(files, this.state.currentFolderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          if (event.type === 1) { // UploadProgress
            const uploadEvent = event as any; // Type assertion for upload progress
            const progress = Math.round(100 * uploadEvent.loaded / (uploadEvent.total || 1));
            this.state.uploadProgress.forEach(p => {
              p.progress = progress;
            });
          } else if (event.type === 4) { // Response
            this.state.isUploading = false;
            this.state.uploadProgress = [];
            this.selectedFiles = [];
            this.loadFiles(); // Refresh the file list
            this.toastService.success('Files uploaded successfully');
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.state.isUploading = false;
          this.state.uploadProgress = [];
          console.error('Upload failed:', error);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Handle drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  /**
   * Handle drop in main area (for inline upload)
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.onFileUpload(files);
    }
  }

  /**
   * Handle drop in upload modal (adds files to upload list)
   */
  onDropInUploadModal(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.addFilesToUpload(files);
    }
  }

  /**
   * Open create folder modal
   */
  openCreateFolderModal(): void {
    this.showCreateFolderModal = true;
    this.createFolderForm.reset();
  }

  /**
   * Create folder - matching working component exactly
   */
  onCreateFolder(): void {
    if (this.createFolderForm.valid) {
      const folderName = this.createFolderForm.value.name;
      const parentId = this.state.currentFolderId;
      
      console.log('📁 Creating folder:', folderName, 'in parent:', parentId);

      this.mediaService.createFolder({
        name: folderName,
        parentId: parentId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.success(`Folder "${folderName}" created successfully`);
          this.showCreateFolderModal = false;
          this.createFolderForm.reset();
          this.loadFolderTree(); // Refresh folder tree
          this.loadFiles(); // Refresh current folder
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Create folder failed:', error);
          this.toastService.error(`Failed to create folder "${folderName}"`);
          this.cdr.markForCheck();
        }
      });
    }
  }

  /**
   * Delete selected items
   */
  deleteSelectedItems(): void {
    if (this.state.selectedItems.totalCount === 0) {
      this.toastService.warning('Please select items to delete.', 'No Selection');
      return;
    }

    this.itemsToDelete = {
      files: [...this.state.selectedItems.files],
      folders: [...this.state.selectedItems.folders]
    };

    const fileCount = this.itemsToDelete.files.length;
    const folderCount = this.itemsToDelete.folders.length;
    const totalCount = fileCount + folderCount;

    this.confirmationConfig = {
      title: 'Delete Items',
      message: `Are you sure you want to delete ${totalCount} item(s)?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'btn-danger',
      loading: false
    };

    this.showConfirmationModal = true;
  }

  /**
   * Handle delete confirmation
   */
  onDeleteConfirmed(): void {
    this.confirmationConfig.loading = true;

    // Delete files and folders together if both exist
    const allItemsToDelete = [...this.itemsToDelete.files, ...this.itemsToDelete.folders];
    
    if (allItemsToDelete.length > 0) {
      const deleteRequest: DeleteMediaRequest = {
        mediaIds: allItemsToDelete.map(item => item.id)
      };

      this.mediaService.deleteMultiple(deleteRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const fileCount = this.itemsToDelete.files.length;
            const folderCount = this.itemsToDelete.folders.length;
            
            if (fileCount > 0 && folderCount > 0) {
              this.toastService.success(`${fileCount} file(s) and ${folderCount} folder(s) deleted successfully`);
            } else if (fileCount > 0) {
              this.toastService.success(`${fileCount} file(s) deleted successfully`);
            } else {
              this.toastService.success(`${folderCount} folder(s) deleted successfully`);
            }
            
            // Refresh both folder tree and files
            this.loadFolderTree();
            this.loadFiles();
            this.resetDeleteState();
          },
          error: (error) => {
            console.error('Delete failed:', error);
            this.toastService.error('Failed to delete items');
            this.resetDeleteState();
          }
        });
    } else {
      this.resetDeleteState();
    }
  }

  /**
   * Reset delete state
   */
  private resetDeleteState(): void {
    this.showConfirmationModal = false;
    this.itemsToDelete = { files: [], folders: [] };
    this.confirmationConfig.loading = false;
    this.state.selectedItems = { files: [], folders: [], totalCount: 0 };
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Handle delete cancellation
   */
  onDeleteCancelled(): void {
    this.resetDeleteState();
  }

  /**
   * Handle modal close
   */
  onModalClose(): void {
    this.closed.emit();
  }

  /**
   * Handle primary action (select files)
   */
  onModalSave(): void {
    if (this.state.selectedItems.files.length > 0) {
      // Update selectedMediaFiles for display
      this.selectedMediaFiles = [...this.state.selectedItems.files];
      this.filesSelected.emit(this.state.selectedItems.files);
      // Don't close modal if config allows staying open, otherwise close
      if (!this.config.multipleSelection) {
        this.closed.emit();
      }
    } else {
      this.toastService.warning('Please select at least one file.', 'No Selection');
    }
  }

  /**
   * Refresh files and folders
   * Matches the pattern from media-manager.component.ts - only refreshes files
   */
  refreshFiles(): void {
    this.loadFiles(); // Only refresh files, folder tree refresh not needed unless folders changed
    this.toastService.info('Refreshing files...', 'Refresh');
  }

  /**
   * Open upload modal
   */
  openUploadModal(): void {
    this.showUploadModal = true;
    this.selectedFilesForUpload = [];
    this.isDragOver = false;
  }

  /**
   * Close upload modal
   */
  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedFilesForUpload = [];
    this.isDragOver = false;
  }

  /**
   * Handle file input selection for upload
   */
  onFileInputSelect(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.addFilesToUpload(files);
  }

  /**
   * Add files to upload list
   */
  private addFilesToUpload(files: File[]): void {
    files.forEach(file => {
      // Check if file already exists
      const exists = this.selectedFilesForUpload.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        this.selectedFilesForUpload.push({
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          uploading: false,
          uploadProgress: 0
        });
      }
    });
    this.cdr.markForCheck();
  }

  /**
   * Remove file from upload list
   */
  removeFileFromUpload(index: number): void {
    this.selectedFilesForUpload.splice(index, 1);
    this.cdr.markForCheck();
  }

  /**
   * Remove all files from upload list
   */
  removeAllFiles(): void {
    this.selectedFilesForUpload = [];
    this.cdr.markForCheck();
  }

  /**
   * Get file icon for upload preview
   */
  getFileIconForUpload(file: any): string {
    const type = file.type || file.file?.type || '';
    if (type.startsWith('image/')) {
      return 'ti ti-photo';
    } else if (type.startsWith('video/')) {
      return 'ti ti-video';
    } else if (type.startsWith('audio/')) {
      return 'ti ti-music';
    } else if (type.includes('pdf')) {
      return 'ti ti-file-text';
    } else {
      return 'ti ti-file';
    }
  }

  /**
   * Upload single file
   */
  uploadSingleFile(fileItem: any, index: number): void {
    const file = fileItem.file || fileItem;
    fileItem.uploading = true;
    fileItem.uploadProgress = 0;

    const parentId = this.state.currentFolderId;
    console.log('📤 Uploading file:', file.name, 'to parentId:', parentId);

    this.mediaService.uploadMultiple([file], parentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          if (event.type === 1) { // UploadProgress
            const progress = Math.round(100 * event.loaded / (event.total || 1));
            fileItem.uploadProgress = progress;
          } else if (event.type === 4) { // Response
            fileItem.uploading = false;
            fileItem.uploadProgress = 100;
            this.toastService.success(`File "${file.name}" uploaded successfully`);
            this.removeFileFromUpload(index);
            this.loadFiles(); // Refresh file list
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          fileItem.uploading = false;
          console.error('Upload failed:', error);
          this.toastService.error(`Failed to upload "${file.name}"`);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Upload all files
   */
  uploadAllFiles(): void {
    if (this.selectedFilesForUpload.length === 0) {
      this.toastService.warning('No files selected for upload');
      return;
    }

    this.isUploading = true;
    const files = this.selectedFilesForUpload.map(item => item.file || item);
    const parentId = this.state.currentFolderId;
    
    console.log('📤 Uploading all files:', files.length, 'to parentId:', parentId);

    this.mediaService.uploadMultiple(files, parentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          if (event.type === 4) { // Response
            this.isUploading = false;
            this.toastService.success(`${files.length} files uploaded successfully`);
            this.closeUploadModal();
            this.loadFiles(); // Refresh file list
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isUploading = false;
          console.error('Bulk upload failed:', error);
          this.toastService.error('Failed to upload files');
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Get file type icon for selected files display
   */
  getFileTypeIcon(file: MediaFile): string {
    return this.getFileIcon(file);
  }

  /**
   * Get file size for display
   */
  getFileSize(file: MediaFile): string {
    // Since MediaFile doesn't have size, return placeholder or calculate from URL if available
    return 'N/A';
  }

  /**
   * Get file extension
   */
  getFileExtension(file: MediaFile): string {
    const fileName = file.fileName || '';
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Format file size
   */
  formatFileSizeForDisplay(bytes: number): string {
    return formatFileSize(bytes);
  }

  /**
   * Remove file from selected files display
   */
  removeFile(index: number): void {
    const removedFile = this.selectedMediaFiles[index];
    this.selectedMediaFiles.splice(index, 1);
    
    // Also remove from state.selectedItems
    this.state.selectedItems.files = this.state.selectedItems.files.filter(f => f.id !== removedFile.id);
    this.state.selectedItems.totalCount = this.state.selectedItems.files.length + this.state.selectedItems.folders.length;
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Clear all selected files
   */
  clearSelection(): void {
    this.selectedMediaFiles = [];
    this.state.selectedItems.files = [];
    this.state.selectedItems.folders = [];
    this.state.selectedItems.totalCount = 0;
    this.updateModalConfig();
    this.cdr.markForCheck();
  }

  /**
   * Handle secondary action (cancel)
   */
  onModalCancel(): void {
    this.onModalClose();
  }

  /**
   * Get file icon class
   */
  getFileIcon(file: MediaFile): string {
    switch (file.type) {
      case 'IMAGE':
        return 'ti ti-photo';
      case 'VIDEO':
        return 'ti ti-video';
      case 'AUDIO':
        return 'ti ti-music';
      case 'DOCUMENT':
        return 'ti ti-file-text';
      default:
        return 'ti ti-file';
    }
  }

  /**
   * Get file icon color
   */
  getFileIconColor(file: MediaFile): string {
    switch (file.type) {
      case 'IMAGE':
        return '#28a745';
      case 'VIDEO':
        return '#dc3545';
      case 'AUDIO':
        return '#6f42c1';
      case 'DOCUMENT':
        return '#007bff';
      default:
        return '#6c757d';
    }
  }

  /**
   * Handle image error
   */
  onImageError(event: any): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  /**
   * Get file URL with proper base URL
   * Note: MediaService.getMedia() already transforms URLs with Supabase base URL
   * So if URL already starts with 'http', return as-is, otherwise process it
   */
  getFileUrl(fileUrl: string | undefined): string {
    if (!fileUrl) {
      return '';
    }
    
    // If URL is already a full URL (from MediaService transformation), use as-is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    // Otherwise, process it with MediaService
    return this.mediaService.getFileUrl(fileUrl);
  }

  /**
   * Handle file double click
   */
  onFileDoubleClick(file: MediaFile): void {
    // If single selection mode is enabled, double-click selects the file
    const isMultipleSelection = this.config?.multipleSelection !== false; // Default to true if not specified
    if (!isMultipleSelection) {
      // In single selection mode, double-click selects and closes
      this.state.selectedItems.files = [file];
      this.state.selectedItems.folders = [];
      this.state.selectedItems.totalCount = 1;
      this.filesSelected.emit([file]);
      this.closed.emit();
      return;
    }
    
    // In multiple selection mode, double-click opens the file
    if (file.type === 'IMAGE') {
      // Open image in new tab or show preview
      window.open(this.getFileUrl(file.url), '_blank');
    } else {
      // For other file types, you might want to download or show preview
      console.log('Opening file:', file.fileName);
      // You can implement download or preview logic here
      window.open(this.getFileUrl(file.url), '_blank');
    }
  }

  /**
   * Handle folder double click
   */
  onFolderDoubleClick(folder: MediaFolder): void {
    console.log('Opening folder:', folder.fileName);
    this.onFolderSelect(folder);
  }

  /**
   * Check if folder is selected
   */
  isFolderSelected(folder: MediaFolder): boolean {
    return this.state.selectedItems.folders.some(f => f.id === folder.id);
  }

  /**
   * Handle folder selection (for navigation, not checkbox selection)
   * Matches the pattern from media-manager.component.ts navigateToFolder()
   */
  onFolderSelect(folder: MediaFolder, event?: any): void {
    if (event && event.target.type === 'checkbox') {
      // Handle checkbox selection (though folders shouldn't appear in main grid)
      if (event.target.checked) {
        this.state.selectedItems.folders.push(folder);
      } else {
        this.state.selectedItems.folders = this.state.selectedItems.folders.filter(f => f.id !== folder.id);
      }
      this.state.selectedItems.totalCount = this.state.selectedItems.files.length + this.state.selectedItems.folders.length;
    } else {
      // Handle folder navigation (from sidebar) - ALWAYS call API like working component
      console.log('📁 Navigating to folder:', folder.fileName);
      this.state.currentFolderId = folder.id;
      this.state.currentPath = folder.filePath.split('/').filter(segment => segment);
      this.state.breadcrumbs = this.buildBreadcrumbs(folder.filePath);
      this.state.selectedItems = { files: [], folders: [], totalCount: 0 };
      this.selectedMediaFiles = []; // Clear selected files display
      this.folders = []; // Clear folders - they're only in sidebar
      
      // Always call API to load fresh files (matches working component behavior)
      this.loadFiles();
    }
    this.cdr.markForCheck();
  }

  /**
   * Find a folder in the folder tree by ID
   */
  private findFolderInTree(folderId: string): MediaFolder | null {
    const searchInFolder = (folders: MediaFolder[]): MediaFolder | null => {
      for (const folder of folders) {
        if (folder.id === folderId) {
          return folder;
        }
        if (folder.children && folder.children.length > 0) {
          const found = searchInFolder(folder.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return searchInFolder(this.folderTree);
  }

  /**
   * Check if file is selected
   */
  isFileSelected(file: MediaFile): boolean {
    return this.state.selectedItems.files.some(f => f.id === file.id);
  }

  /**
   * Check if all items are selected (only files, folders are in sidebar)
   */
  isAllSelected(): boolean {
    return this.state.selectedItems.totalCount === this.files.length && this.files.length > 0;
  }

  /**
   * Check if some items are selected (only files, folders are in sidebar)
   */
  isSomeSelected(): boolean {
    return this.state.selectedItems.totalCount > 0 && this.state.selectedItems.totalCount < this.files.length;
  }

  /**
   * Get upload progress percentage
   */
  getUploadProgress(): number {
    if (this.state.uploadProgress.length === 0) {
      return 0;
    }
    const totalProgress = this.state.uploadProgress.reduce((sum, p) => sum + p.progress, 0);
    return totalProgress / this.state.uploadProgress.length;
  }

  /**
   * Get pagination pages array
   */
  getPaginationPages(): number[] {
    return Array.from({ length: this.pagination.totalPages }, (_, i) => i + 1);
  }

  /**
   * Check if pagination is disabled
   */
  isPaginationDisabled(page: number): boolean {
    return page === this.pagination.currentPage;
  }

  /**
   * Check if previous page is disabled
   */
  isPreviousDisabled(): boolean {
    return this.pagination.currentPage === 1;
  }

  /**
   * Check if next page is disabled
   */
  isNextDisabled(): boolean {
    return this.pagination.currentPage === this.pagination.totalPages;
  }

  /**
   * Get thumbnail URL for file
   */
  getFileThumbnailUrl(fileId: string): string {
    return this.mediaService.getThumbnailUrl(fileId, 'small');
  }

  /**
   * Handle root folder click
   */
  onRootFolderClick(): void {
    // Navigate to root
    this.state.currentFolderId = undefined;
    this.state.currentPath = [];
    this.state.breadcrumbs = [{ name: 'Root', path: '/', isClickable: true }];
    this.state.selectedItems = { files: [], folders: [], totalCount: 0 };
    this.folders = []; // Clear folders - they're only in sidebar
    
    // Load files for root
    this.loadFiles();
    this.cdr.markForCheck();
  }

  /**
   * Handle file click
   */
  onFileClick(file: MediaFile): void {
    // Toggle file selection
    const isSelected = this.isFileSelected(file);
    const mockEvent = { target: { checked: !isSelected } } as any;
    this.onFileSelect(file, mockEvent);
  }

  /**
   * Handle previous page click
   */
  onPreviousPage(): void {
    if (!this.isPreviousDisabled()) {
      this.onPageChange(this.pagination.currentPage - 1);
    }
  }

  /**
   * Handle next page click
   */
  onNextPage(): void {
    if (!this.isNextDisabled()) {
      this.onPageChange(this.pagination.currentPage + 1);
    }
  }

  /**
   * Handle page click
   */
  onPageClick(page: number): void {
    this.onPageChange(page);
  }

  /**
   * Get current folder path as display string
   */
  getCurrentFolderPath(): string {
    if (this.state.currentPath.length === 0) {
      return 'Root';
    }
    return this.state.currentPath.join(' / ');
  }

  /**
   * Track by function for *ngFor to improve performance and fix rendering issues
   */
  trackByFileId(index: number, file: MediaFile): string {
    return file.id;
  }
}
