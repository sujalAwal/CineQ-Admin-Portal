import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaManagerDialogService } from '../../../shared/services/media-manager-dialog.service';
import { MediaFile } from '../../../shared/interfaces/media.interface';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-media-usage-examples',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-usage-examples.component.html',
  styleUrls: ['./media-usage-examples.component.scss']
})
export class MediaUsageExamplesComponent {
  
  selectedFiles: MediaFile[] = [];
  selectedImages: MediaFile[] = [];
  selectedDocuments: MediaFile[] = [];
  selectedVideos: MediaFile[] = [];
  selectedAudio: MediaFile[] = [];
  selectedSingleFile: MediaFile | null = null;

  constructor(
    private mediaManagerDialog: MediaManagerDialogService,
    private toastService: ToastService
  ) {}

  /**
   * Example 1: Select Multiple Files
   */
  selectMultipleFiles(): void {
    this.mediaManagerDialog.selectFiles({
      title: 'Select Multiple Files',
      multipleSelection: true,
      showUploadButton: true,
      showCreateFolderButton: true,
      showDeleteButton: true,
      showPreviewButton: true
    }).subscribe(files => {
      this.selectedFiles = files;
      if (files.length > 0) {
        this.toastService.success(`${files.length} files selected!`, 'Success');
      }
    });
  }

  /**
   * Example 2: Select Single File
   */
  selectSingleFile(): void {
    this.mediaManagerDialog.selectSingleFile({
      title: 'Select Single File',
      multipleSelection: false,
      showUploadButton: true,
      showCreateFolderButton: true,
      showDeleteButton: true,
      showPreviewButton: true
    }).subscribe(file => {
      this.selectedSingleFile = file;
      if (file) {
        this.toastService.success(`File "${file.name}" selected!`, 'Success');
      }
    });
  }

  /**
   * Example 3: Select Images Only
   */
  selectImages(): void {
    this.mediaManagerDialog.selectImages(true).subscribe(files => {
      this.selectedImages = files;
      if (files.length > 0) {
        this.toastService.success(`${files.length} images selected!`, 'Success');
      }
    });
  }

  /**
   * Example 4: Select Documents Only
   */
  selectDocuments(): void {
    this.mediaManagerDialog.selectDocuments(true).subscribe(files => {
      this.selectedDocuments = files;
      if (files.length > 0) {
        this.toastService.success(`${files.length} documents selected!`, 'Success');
      }
    });
  }

  /**
   * Example 5: Select Videos Only
   */
  selectVideos(): void {
    this.mediaManagerDialog.selectVideos(true).subscribe(files => {
      this.selectedVideos = files;
      if (files.length > 0) {
        this.toastService.success(`${files.length} videos selected!`, 'Success');
      }
    });
  }

  /**
   * Example 6: Select Audio Files Only
   */
  selectAudio(): void {
    this.mediaManagerDialog.selectAudio(true).subscribe(files => {
      this.selectedAudio = files;
      if (files.length > 0) {
        this.toastService.success(`${files.length} audio files selected!`, 'Success');
      }
    });
  }

  /**
   * Example 7: Custom Configuration
   */
  selectWithCustomConfig(): void {
    this.mediaManagerDialog.openMediaManager({
      title: 'Custom Media Selection',
      config: {
        allowedFileTypes: ['jpg', 'png', 'pdf'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
        multipleSelection: true,
        showUploadButton: true,
        showCreateFolderButton: false,
        showDeleteButton: false,
        showPreviewButton: true
      }
    }).subscribe(result => {
      if (result.action === 'select') {
        this.selectedFiles = result.files;
        this.toastService.success(`${result.files.length} files selected!`, 'Success');
      }
    });
  }

  /**
   * Clear all selections
   */
  clearAll(): void {
    this.selectedFiles = [];
    this.selectedImages = [];
    this.selectedDocuments = [];
    this.selectedVideos = [];
    this.selectedAudio = [];
    this.selectedSingleFile = null;
    this.toastService.info('All selections cleared.', 'Cleared');
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(file: MediaFile): string {
    const extension = file.extension.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      return 'ti ti-photo';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension)) {
      return 'ti ti-video';
    } else if (['pdf'].includes(extension)) {
      return 'ti ti-file-text';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'ti ti-file-text';
    } else if (['mp3', 'wav', 'flac'].includes(extension)) {
      return 'ti ti-music';
    } else {
      return 'ti ti-file';
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
