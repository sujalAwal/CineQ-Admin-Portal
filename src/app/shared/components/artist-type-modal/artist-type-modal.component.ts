import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { ArtistTypesService } from '../../services/artist-types.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-artist-type-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './artist-type-modal.component.html',
  styleUrls: ['./artist-type-modal.component.scss']
})
export class ArtistTypeModalComponent implements OnInit, OnChanges {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  modalConfig: ModalConfig = {
    title: 'Add Artist Type',
    icon: 'users-plus',
    size: 'md',
    primaryButtonText: 'Save Artist Type',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private service: ArtistTypesService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(): void {
    if (this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 0);
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      icon: ['', [Validators.maxLength(100)]],
      artistCount: [null],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Artist Type';
      this.modalConfig.primaryButtonText = 'Update Artist Type';
    } else {
      this.modalConfig.title = 'Add Artist Type';
      this.modalConfig.primaryButtonText = 'Create Artist Type';
    }

    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        name: this.item.name || '',
        description: this.item.description || '',
        icon: this.item.icon || '',
        artistCount: this.item.artist_count ?? null,
        isActive: this.item.isActive ?? this.item.is_active ?? true
      }, { emitEvent: false });

      setTimeout(() => this.updateButtonState(), 200);
    }
  }

  onModalClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  onModalSave(): void {
    if (!this.form.valid) {
      this.markFormGroupTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.form.value;
    const itemData = {
      stepSlug: 'v1',
      action: this.item?.id ? 'UPDATE' : 'CREATE',
      ...(this.item?.id && { id: this.item.id }),
      formData: {
        ...(this.item?.id && { id: this.item.id }),
        name: formValue.name.trim(),
        description: formValue.description?.trim() || '',
        icon: formValue.icon?.trim() || '',
        artistCount: formValue.artistCount ?? null,
        isActive: formValue.isActive
      }
    };

    this.service.save(itemData).subscribe({
      next: (savedItem) => {
        this.itemSaved.emit(savedItem);
        this.resetLoadingState();
        this.resetForm();
      },
      error: (error) => {
        this.handleSaveError(error);
        this.resetLoadingState();
      }
    });
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

  private resetLoadingState(): void {
    this.modalConfig.primaryButtonLoading = false;
    this.updateButtonState();
  }

  private resetForm(): void {
    this.form.reset({ isActive: true });
    this.form.markAsUntouched();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      description: 'Description',
      icon: 'Icon',
      artistCount: 'Artist Count',
      isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
