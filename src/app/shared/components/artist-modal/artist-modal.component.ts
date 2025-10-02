import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';

// Artist Interface
export interface Artist {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  birth_date?: string;
  nationality?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-artist-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BaseModalComponent
  ],
  templateUrl: './artist-modal.component.html',
  styleUrls: ['./artist-modal.component.scss']
})
export class ArtistModalComponent implements OnInit {
  
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() artist: Artist | null = null; // For edit mode
  @Input() isLoading: boolean = false;
  
  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() artistSaved = new EventEmitter<Artist>();
  
  // Form
  artistForm!: FormGroup;
  
  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Artist',
    icon: 'user',
    size: 'md',
    primaryButtonText: 'Save Artist',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }
  
  ngOnChanges(): void {
    if (this.artistForm) {
      this.updateModalConfig();
      this.populateForm();
    }
  }
  
  // Initialize Reactive Form
  private initializeForm(): void {
    this.artistForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(20)]],
      bio: ['', [Validators.maxLength(500)]],
      birth_date: [''],
      nationality: ['', [Validators.maxLength(50)]],
      status: ['active', [Validators.required]]
    });
    
    // Watch form validity for button state
    this.artistForm.valueChanges.subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.artistForm.invalid;
    });
  }
  
  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.artist) {
      // Edit Mode
      this.modalConfig.title = 'Edit Artist';
      this.modalConfig.icon = 'user-edit';
      this.modalConfig.primaryButtonText = 'Update Artist';
    } else {
      // Add Mode
      this.modalConfig.title = 'Add Artist';
      this.modalConfig.icon = 'user-plus';
      this.modalConfig.primaryButtonText = 'Create Artist';
    }
    
    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.artistForm?.invalid || this.isLoading;
  }
  
  // Populate form with artist data (edit mode)
  private populateForm(): void {
    if (this.artist && this.artistForm) {
      this.artistForm.patchValue({
        name: this.artist.name,
        email: this.artist.email || '',
        phone: this.artist.phone || '',
        bio: this.artist.bio || '',
        birth_date: this.artist.birth_date || '',
        nationality: this.artist.nationality || '',
        status: this.artist.status
      });
    }
  }
  
  // Modal Events
  onModalClose(): void {
    this.resetForm();
    this.closed.emit();
  }
  
  onModalSave(): void {
    if (this.artistForm.valid) {
      const formValue = this.artistForm.value;
      
      const artistData: Artist = {
        ...formValue,
        ...(this.artist?.id && { id: this.artist.id })
      };
      
      this.artistSaved.emit(artistData);
    } else {
      this.markFormGroupTouched();
    }
  }
  
  // Form Helpers
  private resetForm(): void {
    this.artistForm.reset({
      name: '',
      email: '',
      phone: '',
      bio: '',
      birth_date: '',
      nationality: '',
      status: 'active'
    });
    this.artistForm.markAsUntouched();
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.artistForm.controls).forEach(key => {
      this.artistForm.get(key)?.markAsTouched();
    });
  }
  
  // Form Field Helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.artistForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.artistForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
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
      name: 'Artist Name',
      email: 'Email',
      phone: 'Phone',
      bio: 'Biography',
      birth_date: 'Birth Date',
      nationality: 'Nationality',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
  
}