import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { MediaManagerModalComponent } from '../media-manager-modal/media-manager-modal.component';
import { BannerService } from '../../services/banner.service';
import { AuthService } from '../../services/auth.service';
import { Banner } from '../../interfaces/banner.interface';
import { MediaFile, MediaManagerConfig } from '../../interfaces/media.interface';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../services/toast.service';


@Component({
  selector: 'app-banner-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BaseModalComponent,
    MediaManagerModalComponent
  ],
  templateUrl: './banner-modal.component.html',
  styleUrls: ['./banner-modal.component.scss']
})
export class BannerModalComponent implements OnInit, OnChanges, OnDestroy {
  
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() banner: Banner | null = null; // For edit mode
  @Input() isLoading: boolean = false;
  
  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() bannerSaved = new EventEmitter<Banner>();
  
  // Form
  bannerForm!: FormGroup;
  
  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Banner',
    icon: 'photo',
    size: 'lg',
    primaryButtonText: 'Save Banner',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  // Banner type options
  bannerTypeOptions = [
    { value: 'MOVIE_PROMOTION', label: 'Movie Promotion' },
    { value: 'GENERAL', label: 'General' },
    { value: 'EVENT', label: 'Event' },
    { value: 'NEWS', label: 'News' }
  ];

  // Media Manager state
  showMediaManager: boolean = false;
  selectedImage: MediaFile | null = null;
  mediaManagerConfig: MediaManagerConfig = {
    title: 'Select Banner Image',
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    multipleSelection: false,
    showUploadButton: true,
    showCreateFolderButton: true,
    showDeleteButton: true,
    showPreviewButton: true
  };
  
  constructor(
    private fb: FormBuilder, 
    private bannerService: BannerService,
    private authService: AuthService,
    private toastr: ToastrService,
    private toastService: ToastService
  ) {}
  
  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }
  
  ngOnChanges(): void {
    if (this.bannerForm) {
      this.updateModalConfig();
      this.populateForm();
    }
    
    // Handle body scroll lock
    this.handleBodyScroll();
  }

  ngOnDestroy(): void {
    // Always restore body scroll on component destroy
    this.enableBodyScroll();
  }
  
  // Body scroll management
  private handleBodyScroll(): void {
    if (this.isVisible) {
      this.disableBodyScroll();
    } else {
      this.enableBodyScroll();
    }
  }
  
  private disableBodyScroll(): void {
    if (typeof document !== 'undefined') {
      const body = document.body;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      body.style.overflow = 'hidden';
      body.style.paddingRight = `${scrollBarWidth}px`;
    }
  }
  
  private enableBodyScroll(): void {
    if (typeof document !== 'undefined') {
      const body = document.body;
      body.style.overflow = '';
      body.style.paddingRight = '';
    }
  }
  
  // Initialize Reactive Form
  private initializeForm(): void {
    this.bannerForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      imageUrl: ['', [Validators.required]],
      targetUrl: [''],
      bannerType: ['MOVIE_PROMOTION', [Validators.required]],
      movieId: [''],
      displayOrder: [0, [Validators.required, Validators.min(0)]],
      isActive: [true, [Validators.required]],
      startDate: [''],
      endDate: ['']
    });
    
    // Watch form validity for button state
    this.bannerForm.valueChanges.subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.bannerForm.invalid;
    });
  }
  
  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.banner) {
      // Edit Mode
      this.modalConfig.title = 'Edit Banner';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Banner';
    } else {
      // Add Mode
      this.modalConfig.title = 'Add Banner';
      this.modalConfig.icon = 'photo';
      this.modalConfig.primaryButtonText = 'Create Banner';
    }
    
    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.bannerForm?.invalid || this.isLoading;
  }
  
  // Populate form with banner data (edit mode)
  private populateForm(): void {
    if (this.banner && this.bannerForm) {
      this.bannerForm.patchValue({
        title: this.banner.title,
        description: this.banner.description || '',
        imageUrl: this.banner.imageUrl,
        targetUrl: this.banner.targetUrl || '',
        bannerType: this.banner.bannerType || 'MOVIE_PROMOTION',
        movieId: this.banner.movieId || '',
        displayOrder: this.banner.displayOrder || 0,
        isActive: this.banner.isActive !== undefined ? this.banner.isActive : true,
        startDate: this.banner.startDate || '',
        endDate: this.banner.endDate || ''
      });
    }
  }
  
  // Modal Events
  onModalClose(): void {
    this.enableBodyScroll();
    this.resetForm();
    this.closed.emit();
  }
  
  onModalSave(): void {
    if (this.bannerForm.valid) {
      // 🔍 CHECK: Are we actually logged in via AuthService?
      const isAuthenticated = this.authService.isAuthenticated();
      const currentUser = this.authService.getCurrentUser();
      
      if (!isAuthenticated || !currentUser) {
        this.toastr.error('You must be logged in to perform this action', 'Authentication Required');
        this.resetLoadingState();
        // AuthService will handle redirect to login
        return;
      }
      
      // Set loading state
      this.modalConfig.primaryButtonLoading = true;
      this.modalConfig.primaryButtonDisabled = true;
      
      const formValue = this.bannerForm.value;
      
      const bannerData: Banner = {
        title: formValue.title,
        description: formValue.description || undefined,
        imageUrl: formValue.imageUrl,
        targetUrl: formValue.targetUrl || undefined,
        bannerType: formValue.bannerType,
        movieId: formValue.movieId || undefined,
        displayOrder: formValue.displayOrder || 0,
        isActive: formValue.isActive,
        startDate: formValue.startDate || undefined,
        endDate: formValue.endDate || undefined,
        ...(this.banner?.id && { id: this.banner.id })
      };
      
      try {
        this.bannerService.storeBanner(bannerData).subscribe({
          next: (savedBanner) => {
            // Success - emit the saved banner
            // The service returns response.data which should be the banner object
            this.enableBodyScroll();
            this.bannerSaved.emit(savedBanner as any);
            this.resetLoadingState();
            this.resetForm();
          },
          error: (error) => {
            console.log('Failed to save banner:', error);
            this.resetLoadingState();
            // Modal stays open so user can try again
          }
        });
      } catch (error) {
        // Handle any synchronous errors
        console.error('Unexpected error in onModalSave:', error);
        this.resetLoadingState();
      }
    } else {
      // Form is invalid
      this.markFormGroupTouched();
    }
  }
  
  // Reset loading states
  private resetLoadingState(): void {
    this.modalConfig.primaryButtonLoading = false;
    this.modalConfig.primaryButtonDisabled = this.bannerForm.invalid;
  }
  
  // Form Helpers
  private resetForm(): void {
    this.bannerForm.reset({
      title: '',
      description: '',
      imageUrl: '',
      targetUrl: '',
      bannerType: 'MOVIE_PROMOTION',
      movieId: '',
      displayOrder: 0,
      isActive: true,
      startDate: '',
      endDate: ''
    });
    this.bannerForm.markAsUntouched();
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.bannerForm.controls).forEach(key => {
      this.bannerForm.get(key)?.markAsTouched();
    });
  }
  
  // Form Field Helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.bannerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.bannerForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      }
    }
    
    return '';
  }
  
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      description: 'Description',
      imageUrl: 'Image URL',
      targetUrl: 'Target URL',
      bannerType: 'Banner Type',
      movieId: 'Movie ID',
      displayOrder: 'Display Order',
      isActive: 'Status',
      startDate: 'Start Date',
      endDate: 'End Date'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Open Media Manager to select image
   */
  openMediaManager(): void {
    this.showMediaManager = true;
  }

  /**
   * Handle media manager close
   */
  onMediaManagerClosed(): void {
    this.showMediaManager = false;
  }

  /**
   * Handle image selection from media manager
   * This is called when files are selected (double-click or select button)
   */
  onImageSelected(files: MediaFile[]): void {
    if (files && files.length > 0) {
      // Since we configured single selection, take the first file
      const selectedFile = files[0];
      this.selectedImage = selectedFile;
      
      // Set the imageUrl form control with the file URL
      // Using 'url' property from MediaFile interface
      const imageUrl = selectedFile.url || selectedFile.filePath;
      this.bannerForm.patchValue({
        imageUrl: imageUrl
      });
      
      // Mark the field as touched to show it's been set
      this.bannerForm.get('imageUrl')?.markAsTouched();
      
      // Close media manager
      this.showMediaManager = false;
      
      // Show success message
      this.toastService.success(`Image "${selectedFile.fileName}" selected!`, 'Image Selected');
    }
  }

  /**
   * Remove selected image
   */
  removeSelectedImage(): void {
    this.selectedImage = null;
    this.bannerForm.patchValue({
      imageUrl: ''
    });
    this.bannerForm.get('imageUrl')?.markAsTouched();
  }

  /**
   * Get selected image URL for preview
   */
  getSelectedImageUrl(): string | null {
    return this.bannerForm.get('imageUrl')?.value || null;
  }

}

