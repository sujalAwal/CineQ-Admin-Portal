import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { MediaManagerModalComponent } from '../media-manager-modal/media-manager-modal.component';
import { BannerService } from '../../services/banner.service';
import { AuthService } from '../../services/auth.service';
import { Banner, BannerButton, BannerRequest } from '../../interfaces/banner.interface';
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

  // Button type options
  buttonTypeOptions = [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'tertiary', label: 'Tertiary' }
  ];

  // Media Manager state
  showMediaManager: boolean = false;
  selectedImage: MediaFile | null = null;
  selectedMobileImage: MediaFile | null = null;
  currentImageTarget: 'banner' | 'mobile' = 'banner';
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
      slug: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]+$/)]],
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      description: ['', [Validators.maxLength(500)]],
      order: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
      isActive: [true, [Validators.required]],
      bannerImage: ['', [Validators.required, Validators.maxLength(2500)]],
      imageAltText: ['', [Validators.required, Validators.maxLength(500)]],
      imageMobileUrl: ['', [Validators.maxLength(255)]],
      buttons: this.fb.array([], [Validators.maxLength(3)])
    });
    
    // Watch form validity for button state
    this.bannerForm.valueChanges.subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.bannerForm.invalid;
    });
  }

  // Get buttons FormArray
  get buttonsArray(): FormArray {
    return this.bannerForm.get('buttons') as FormArray;
  }

  // Create a new button form group
  createButtonFormGroup(button?: BannerButton): FormGroup {
    return this.fb.group({
      title: [button?.title || '', [Validators.required, Validators.maxLength(100)]],
      redirectLink: [button?.redirectLink || '', [Validators.required, Validators.maxLength(500)]],
      buttonType: [button?.buttonType || 'primary', [Validators.required]],
      openInNewTab: [button?.openInNewTab ?? true]
    });
  }

  // Add a new button
  addButton(): void {
    if (this.buttonsArray.length < 3) {
      this.buttonsArray.push(this.createButtonFormGroup());
    }
  }

  // Remove a button
  removeButton(index: number): void {
    this.buttonsArray.removeAt(index);
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
      // Clear existing buttons
      this.buttonsArray.clear();
      
      // Populate buttons
      if (this.banner.buttons && this.banner.buttons.length > 0) {
        this.banner.buttons.forEach(button => {
          this.buttonsArray.push(this.createButtonFormGroup(button));
        });
      }
      
      this.bannerForm.patchValue({
        slug: this.banner.slug || '',
        title: this.banner.title,
        description: this.banner.description || '',
        order: this.banner.order || 1,
        isActive: this.banner.isActive !== undefined ? this.banner.isActive : true,
        bannerImage: this.banner.bannerImage || '',
        imageAltText: this.banner.imageAltText || '',
        imageMobileUrl: this.banner.imageMobileUrl || ''
      });

      // Disable slug field in edit mode (slug is immutable)
      this.bannerForm.get('slug')?.disable();
      
      // In edit mode, make bannerImage non-required if image already exists
      // (user can keep existing image without re-uploading)
      if (this.banner.bannerImage) {
        this.bannerForm.get('bannerImage')?.clearValidators();
        this.bannerForm.get('bannerImage')?.setValidators([Validators.maxLength(2500)]);
        this.bannerForm.get('bannerImage')?.updateValueAndValidity();
      }
    } else {
      // Enable slug field in create mode
      this.bannerForm.get('slug')?.enable();
      
      // Restore required validator for bannerImage in create mode
      this.bannerForm.get('bannerImage')?.setValidators([Validators.required, Validators.maxLength(2500)]);
      this.bannerForm.get('bannerImage')?.updateValueAndValidity();
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
      
      // Get raw value to include disabled fields (slug)
      const formValue = this.bannerForm.getRawValue();
      
      // Build buttons array
      const buttons: BannerButton[] = formValue.buttons.map((btn: any) => ({
        title: btn.title,
        redirectLink: btn.redirectLink,
        buttonType: btn.buttonType,
        openInNewTab: btn.openInNewTab
      }));
      
      // Build banner data request
      const bannerData: BannerRequest = {
        title: formValue.title,
        slug: formValue.slug, // Always include slug
        description: formValue.description || undefined,
        order: formValue.order,
        isActive: formValue.isActive,
        bannerImage: formValue.bannerImage,
        imageAltText: formValue.imageAltText,
        imageMobileUrl: formValue.imageMobileUrl || undefined,
        buttons: buttons,
        // Include id for updates
        ...(this.banner?.id && { id: this.banner.id })
      };
      
      try {
        this.bannerService.storeBanner(bannerData).subscribe({
          next: (response) => {
            // Success - emit the saved banner
            this.enableBodyScroll();
            this.bannerSaved.emit(response.data);
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
    // Clear buttons array first
    this.buttonsArray.clear();
    
    this.bannerForm.reset({
      slug: '',
      title: '',
      description: '',
      order: 1,
      isActive: true,
      bannerImage: '',
      imageAltText: '',
      imageMobileUrl: ''
    });
    this.bannerForm.markAsUntouched();
    
    // Enable slug field for next create
    this.bannerForm.get('slug')?.enable();
    
    // Restore required validator for bannerImage (for next create operation)
    this.bannerForm.get('bannerImage')?.setValidators([Validators.required, Validators.maxLength(2500)]);
    this.bannerForm.get('bannerImage')?.updateValueAndValidity();
    
    // Reset image selections
    this.selectedImage = null;
    this.selectedMobileImage = null;
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.bannerForm.controls).forEach(key => {
      const control = this.bannerForm.get(key);
      control?.markAsTouched();
      
      // Mark nested form arrays
      if (control instanceof FormArray) {
        control.controls.forEach(group => {
          if (group instanceof FormGroup) {
            Object.keys(group.controls).forEach(k => {
              group.get(k)?.markAsTouched();
            });
          }
        });
      }
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
      slug: 'Slug',
      title: 'Title',
      description: 'Description',
      order: 'Display Order',
      isActive: 'Status',
      bannerImage: 'Banner Image',
      imageAltText: 'Image Alt Text',
      imageMobileUrl: 'Mobile Image URL'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Open Media Manager to select image
   */
  openMediaManager(target: 'banner' | 'mobile' = 'banner'): void {
    this.currentImageTarget = target;
    this.mediaManagerConfig.title = target === 'banner' ? 'Select Banner Image' : 'Select Mobile Image';
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
   */
  onImageSelected(files: MediaFile[]): void {
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const imageUrl = selectedFile.url || selectedFile.filePath;
      
      if (this.currentImageTarget === 'banner') {
        this.selectedImage = selectedFile;
        this.bannerForm.patchValue({ bannerImage: imageUrl });
        this.bannerForm.get('bannerImage')?.markAsTouched();
        this.toastService.success(`Banner image "${selectedFile.fileName}" selected!`, 'Image Selected');
      } else {
        this.selectedMobileImage = selectedFile;
        this.bannerForm.patchValue({ imageMobileUrl: imageUrl });
        this.bannerForm.get('imageMobileUrl')?.markAsTouched();
        this.toastService.success(`Mobile image "${selectedFile.fileName}" selected!`, 'Image Selected');
      }
      
      this.showMediaManager = false;
    }
  }

  /**
   * Remove selected banner image
   */
  removeSelectedImage(): void {
    this.selectedImage = null;
    this.bannerForm.patchValue({ bannerImage: '' });
    this.bannerForm.get('bannerImage')?.markAsTouched();
  }

  /**
   * Remove selected mobile image
   */
  removeSelectedMobileImage(): void {
    this.selectedMobileImage = null;
    this.bannerForm.patchValue({ imageMobileUrl: '' });
    this.bannerForm.get('imageMobileUrl')?.markAsTouched();
  }

  /**
   * Get selected banner image URL for preview
   */
  getSelectedImageUrl(): string | null {
    return this.bannerForm.get('bannerImage')?.value || null;
  }

  /**
   * Get selected mobile image URL for preview
   */
  getSelectedMobileImageUrl(): string | null {
    return this.bannerForm.get('imageMobileUrl')?.value || null;
  }

  /**
   * Auto-generate slug from title
   */
  generateSlug(): void {
    const title = this.bannerForm.get('title')?.value;
    if (title && !this.banner) {
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
      this.bannerForm.patchValue({ slug });
    }
  }

  /**
   * Check if button field is invalid
   */
  isButtonFieldInvalid(buttonIndex: number, fieldName: string): boolean {
    const buttonsArray = this.bannerForm.get('buttons') as FormArray;
    const buttonGroup = buttonsArray.at(buttonIndex) as FormGroup;
    const field = buttonGroup?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get button field error message
   */
  getButtonFieldError(buttonIndex: number, fieldName: string): string {
    const buttonsArray = this.bannerForm.get('buttons') as FormArray;
    const buttonGroup = buttonsArray.at(buttonIndex) as FormGroup;
    const field = buttonGroup?.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['maxlength']) {
        return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
      }
    }
    return '';
  }

}

