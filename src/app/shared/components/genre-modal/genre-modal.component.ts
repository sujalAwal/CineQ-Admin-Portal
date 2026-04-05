import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { GenreService } from '../../services/genre.service';
import { AuthService } from '../../services/auth.service';
import { Genre } from '../../interfaces/genre.interface';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-genre-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BaseModalComponent
  ],
  templateUrl: './genre-modal.component.html',
  styleUrls: ['./genre-modal.component.scss']
})
export class GenreModalComponent implements OnInit, OnChanges, OnDestroy {
  
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() genre: Genre | null = null; // For edit mode
  @Input() isLoading: boolean = false;
  
  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() genreSaved = new EventEmitter<Genre>();
  
  // Form
  genreForm!: FormGroup;
  
  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Genre',
    icon: 'category',
    size: 'sm',
    primaryButtonText: 'Save Genre',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };
  
  constructor(
    private fb: FormBuilder, 
    private genreService: GenreService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}
  
  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }
  
  ngOnChanges(): void {
    if (this.genreForm) {
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
    this.genreForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
      is_active: [true, [Validators.required]]
    });
    
    // Watch form validity for button state
    this.genreForm.valueChanges.subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.genreForm.invalid;
    });
  }
  
  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.genre) {
      // Edit Mode
      this.modalConfig.title = 'Edit Genre';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Genre';
    } else {
      // Add Mode
      this.modalConfig.title = 'Add Genre';
      this.modalConfig.icon = 'category';
      this.modalConfig.primaryButtonText = 'Create Genre';
    }
    
    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.genreForm?.invalid || this.isLoading;
  }
  
  // Populate form with genre data (edit mode)
  private populateForm(): void {
    if (this.genre && this.genreForm) {
      this.genreForm.patchValue({
        name: this.genre.name,
        description: this.genre.description || '',
        is_active: this.genre.is_active
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
    if (this.genreForm.valid) {
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
      
      const formValue = this.genreForm.value;
      
      const genreData: Genre = {
        name: formValue.name,
        description: formValue.description,
        is_active: formValue.is_active,
        ...(this.genre?.id && { id: this.genre.id })
      };
      
      try {
        this.genreService.storeGenre(genreData).subscribe({
          next: (savedGenre) => {
            // Success - emit the saved genre
            // The service returns response.data which should be the genre object
            this.enableBodyScroll();
            this.genreSaved.emit(savedGenre as any);
            this.resetLoadingState();
            this.resetForm();
          },
          error: (error) => {
            this.handleSaveError(error);
            this.resetLoadingState();
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
  
  private handleSaveError(error: any): void {
    let errorMessage = 'Failed to save. Please try again.';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    this.toastr.error(errorMessage, 'Save Error');
  }
  
  // Reset loading states
  private resetLoadingState(): void {
    this.modalConfig.primaryButtonLoading = false;
    this.modalConfig.primaryButtonDisabled = this.genreForm.invalid;
  }
  
  // Form Helpers
  private resetForm(): void {
    this.genreForm.reset({
      name: '',
      description: '',
      is_active: true
    });
    this.genreForm.markAsUntouched();
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.genreForm.controls).forEach(key => {
      this.genreForm.get(key)?.markAsTouched();
    });
  }
  
  // Form Field Helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.genreForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.genreForm.get(fieldName);
    
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
    }
    
    return '';
  }
  
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Genre Name',
      description: 'Description',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
  
}