import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MediaManagerModalComponent } from '../../../shared/components/media-manager-modal/media-manager-modal.component';
import { IfModulePermissionDirective } from '../../../shared/directives/if-module-permission.directive';
import { MediaFile, MediaFolder, MediaManagerConfig } from '../../../shared/interfaces/media.interface';
import { ToastService } from '../../../shared/services/toast.service';
import { MediaService } from '../../../shared/services/media.service';

@Component({
  selector: 'app-media-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MediaManagerModalComponent, IfModulePermissionDirective],
  templateUrl: './media-manager.component.html',
  styleUrls: ['./media-manager.component.scss']
})
export class MediaManagerComponent implements OnInit, OnDestroy {
  showMediaManager = false;
  selectedFiles: MediaFile[] = [];
  
  // Data properties
  files: MediaFile[] = [];
  folders: MediaFolder[] = [];
  folderTree: MediaFolder[] = [];
  isLoading = false;
  currentFolderId?: string;
  currentFolderPath: string[] = [];
  
  // Modal states
  showUploadModal = false;
  showCreateFolderModal = false;
  
  // Upload properties
  selectedFilesForUpload: any[] = [];
  isDragOver = false;
  isUploading = false;
  
  // Forms
  createFolderForm!: FormGroup;
  
  // Configuration for the media manager
  mediaConfig: MediaManagerConfig = {
    title: 'Select Media Files',
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    multipleSelection: true,
    showUploadButton: true,
    showCreateFolderButton: true,
    showDeleteButton: true,
    showPreviewButton: true
  };

  private destroy$ = new Subject<void>();

  constructor(
    private toastService: ToastService,
    private mediaService: MediaService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadFolderTree();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load folder tree for sidebar
   */
  private loadFolderTree(): void {
    this.mediaService.getFolderTree()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (folders) => {
          const value = this.accessFirstItem(folders, 'id');
          if (typeof value === 'string') this.currentFolderId = value;
          
    this.loadFiles();
        
          this.folderTree = folders;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('❌ Error loading folder tree:', error);
          this.folderTree = [];
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Load files only (no folders in main grid)
   */
  private loadFiles(): void {
    
    this.isLoading = true;
    this.cdr.markForCheck();

    this.mediaService.getMedia(this.currentFolderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          
          // Only load files, not folders (folders are in sidebar)
          this.files = response.files || [];
          
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('❌ Error loading files:', error);
          this.files = [];
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Open Media Manager Modal
   */
  openMediaManager(): void {
    console.log('Opening Media Manager...');
    this.showMediaManager = true;
  }

  /**
   * Handle Media Selection
   */
  onMediaSelected(files: MediaFile[]): void {
    console.log('Media selected:', files);
    this.selectedFiles = files;
    this.showMediaManager = false;
    
    if (files.length > 0) {
      this.toastService.success(`Selected ${files.length} file(s)`);
    }
  }

  /**
   * Handle Modal Close
   */
  onModalClose(): void {
    console.log('Media Manager closed');
    this.showMediaManager = false;
  }

  /**
   * Remove Selected File
   */
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.toastService.info('File removed from selection');
  }

  /**
   * Delete Selected Files from server
   */
  deleteSelectedFiles(): void {
    if (this.selectedFiles.length === 0) return;
    const ids = this.selectedFiles.map(f => f.id);
    this.mediaService.deleteMultiple({ mediaIds: ids })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success(`${ids.length} file(s) deleted successfully`);
          this.selectedFiles = [];
          this.loadFiles();
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('Failed to delete selected files');
        }
      });
  }

  /**
   * Clear All Selected Files
   */
  clearSelection(): void {
    this.selectedFiles = [];
    this.toastService.info('Selection cleared');
  }

  /**
   * Get File Type Icon
   */
  getFileTypeIcon(file: MediaFile): string {
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

  getFileExtension(file: MediaFile): string {
    const fileName = file.fileName.toLowerCase();
    const extension = fileName.split('.').pop() || '';
    return extension;
  }

  getFileSize(file: MediaFile): string {
    // Since size is not in the API response, return a placeholder
    return 'Unknown size';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
   * Get file URL with proper base URL
   */
  getFileUrl(fileUrl: string): string {
    return this.mediaService.getFileUrl(fileUrl);
  }

  /**
   * Handle file double click
   */
  onFileDoubleClick(file: MediaFile): void {
    if (file.type === 'IMAGE') {
      // Open image in new tab
      window.open(this.getFileUrl(file.url), '_blank');
    } else {
      // For other file types, download or show preview
      console.log('Opening file:', file.fileName);
      window.open(this.getFileUrl(file.url), '_blank');
    }
  }

  /**
   * Handle folder double click
   */
  onFolderDoubleClick(folder: MediaFolder): void {
    console.log('Opening folder:', folder.fileName);
    this.currentFolderId = folder.id;
    this.loadFiles();
  }

  /**
   * Handle file selection
   */
  onFileSelect(file: MediaFile, event: any): void {
    const target = event.target as HTMLInputElement;
    
    if (target.checked) {
      if (!this.selectedFiles.find(f => f.id === file.id)) {
        this.selectedFiles.push(file);
      }
    } else {
      this.selectedFiles = this.selectedFiles.filter(f => f.id !== file.id);
    }
    
    console.log('Selected files:', this.selectedFiles.length);
    this.cdr.markForCheck();
  }

  /**
   * Check if file is selected
   */
  isFileSelected(file: MediaFile): boolean {
    return this.selectedFiles.some(f => f.id === file.id);
  }

  /**
   * Handle image error
   */
  onImageError(event: any): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  /**
   * Refresh files
   */
  refreshFiles(): void {
    this.loadFiles();
  }

  /**
   * Toggle folder expansion
   */
  toggleFolder(folder: MediaFolder): void {
    folder.expanded = !folder.expanded;
    this.cdr.markForCheck();
  }

  /**
   * Navigate to folder
   */
  navigateToFolder(folder: MediaFolder): void {
    console.log('📁 Navigating to folder:', folder.fileName);
    this.currentFolderId = folder.id;
    this.currentFolderPath = folder.filePath.split('/').filter(segment => segment);
    this.loadFiles();
  }

  /**
   * Navigate to root
   */
  navigateToRoot(): void {
    console.log('📁 Navigating to root');
    this.currentFolderId = undefined;
    this.currentFolderPath = [];
    this.loadFiles();
  }

  /**
   * Get folder icon
   */
  getFolderIcon(folder: MediaFolder): string {
    return folder.expanded ? 'ti ti-folder-open' : 'ti ti-folder';
  }

  /**
   * Check if folder has children
   */
  hasChildren(folder: MediaFolder): boolean {
    return folder.children && folder.children.length > 0;
  }

  /**
   * Get current folder name
   */
  getCurrentFolderName(): string {
    if (this.currentFolderPath.length === 0) {
      return 'Root';
    }
    return this.currentFolderPath[this.currentFolderPath.length - 1];
  }

  /**
   * Initialize forms
   */
  private initializeForms(): void {
    this.createFolderForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  //Access First key of Array
  accessFirstItem(array: any[], key: string): void {
    if (array.length > 0) {
      const firstItem = array[0];
      return firstItem[key];
    }
  }

  /**
   * Get current folder path for display
   */
  getCurrentFolderPath(): string {
    if (this.currentFolderPath.length === 0) {
      return 'Root';
    }
    return this.currentFolderPath.join(' / ');
  }

  /**
   * Get current folder path for API (null for root, folder/path for nested)
   */
  getCurrentFolderPathForAPI(): string | null {
    if (this.currentFolderPath.length === 0) {
      return null; // Root folder
    }
    return this.currentFolderPath.join('/');
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
   * Open create folder modal
   */
  openCreateFolderModal(): void {
    this.showCreateFolderModal = true;
    this.createFolderForm.reset();
  }

  /**
   * Close create folder modal
   */
  closeCreateFolderModal(): void {
    this.showCreateFolderModal = false;
    this.createFolderForm.reset();
  }

  /**
   * Handle file selection from input for upload
   */
  onFileInputSelect(event: any): void {
    const files = Array.from(event.target.files) as File[];
    this.addFilesToUpload(files);
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
   * Handle drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = Array.from(event.dataTransfer?.files || []);
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

    const parentId = this.currentFolderId; // Use folder ID, not path
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
    const parentId = this.currentFolderId; // Use folder ID, not path
    
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
   * Create folder
   */
  createFolder(): void {
    if (this.createFolderForm.valid) {
      const folderName = this.createFolderForm.value.name;
      const parentId = this.currentFolderId;
      
      console.log('📁 Creating folder:', folderName, 'in parent:', parentId);

      this.mediaService.createFolder({
        name: folderName,
        parentId: parentId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.success(`Folder "${folderName}" created successfully`);
          this.closeCreateFolderModal();
          this.loadFolderTree(); // Refresh folder tree
          this.loadFiles(); // Refresh current folder
        },
        error: (error) => {
          console.error('Create folder failed:', error);
          this.toastService.error(`Failed to create folder "${folderName}"`);
        }
      });
    }
  }
}
