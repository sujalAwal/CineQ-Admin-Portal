import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { MoviesCinemaService } from '../../services/movies-cinema.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-movies-cinema-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './movies-cinema-modal.component.html',
  styleUrls: ['./movies-cinema-modal.component.scss']
})
export class MoviesCinemaModalComponent implements OnInit, OnChanges {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  modalConfig: ModalConfig = {
    title: 'Add Movie',
    icon: 'movie',
    size: 'lg',
    primaryButtonText: 'Save Movie',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(private fb: FormBuilder, private service: MoviesCinemaService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.initializeForm(); }

  ngOnChanges(): void {
    if (this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 0);
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(2000)]],
      poster: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      banner: ['', [Validators.minLength(10), Validators.maxLength(500)]],
      duration: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      releaseDate: ['', [Validators.required]],
      certification: ['', [Validators.required]],
      language: ['', [Validators.required]],
      format: ['', [Validators.required]],
      status: ['', [Validators.required]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Movie';
      this.modalConfig.primaryButtonText = 'Update Movie';
    } else {
      this.modalConfig.title = 'Add Movie';
      this.modalConfig.primaryButtonText = 'Create Movie';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        title: this.item.title,
        description: this.item.description || '',
        poster: this.item.poster,
        banner: this.item.banner || '',
        duration: this.item.duration,
        releaseDate: this.item.releaseDate,
        certification: this.item.certification,
        language: this.item.language,
        format: this.item.format,
        status: this.item.status,
        isActive: this.item.isActive
      }, { emitEvent: false });
      setTimeout(() => this.updateButtonState(), 200);
    }
  }

  onModalClose(): void { this.resetForm(); this.closed.emit(); }

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
        title: formValue.title.trim(),
        description: formValue.description?.trim() || '',
        poster: formValue.poster.trim(),
        banner: formValue.banner?.trim() || '',
        duration: formValue.duration,
        releaseDate: formValue.releaseDate,
        certification: formValue.certification,
        language: formValue.language,
        format: formValue.format,
        status: formValue.status,
        isActive: formValue.isActive
      }
    };

    this.service.save(itemData).subscribe({
      next: (savedItem) => { this.itemSaved.emit(savedItem); this.resetLoadingState(); this.resetForm(); },
      error: (error) => {
        console.error('Failed to save:', error);
        const errorMessage = error?.error?.message || 'Failed to save. Please try again.';
        this.toastr.error(errorMessage, 'Save Error');
        this.resetLoadingState();
      }
    });
  }

  private resetLoadingState(): void { this.modalConfig.primaryButtonLoading = false; this.updateButtonState(); }
  private resetForm(): void { this.form.reset({ isActive: true }); this.form.markAsUntouched(); }
  private markFormGroupTouched(): void { Object.keys(this.form.controls).forEach(key => { this.form.get(key)?.markAsTouched(); }); }

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
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      description: 'Description',
      poster: 'Poster URL',
      banner: 'Banner URL',
      duration: 'Duration (minutes)',
      releaseDate: 'Release Date',
      certification: 'Certification',
      language: 'Language',
      format: 'Format',
      status: 'Status',
      isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
