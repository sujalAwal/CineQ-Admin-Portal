import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { ShowtimeService } from '../../services/showtime.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-showtime-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './showtime-modal.component.html',
  styleUrls: ['./showtime-modal.component.scss']
})
export class ShowtimeModalComponent implements OnInit, OnChanges {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  modalConfig: ModalConfig = {
    title: 'Add Showtime',
    icon: 'calendar-time',
    size: 'lg',
    primaryButtonText: 'Save',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(private fb: FormBuilder, private service: ShowtimeService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

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
      movieId: ['', [Validators.required]],
      screenId: ['', [Validators.required]],
      theatreId: ['', [Validators.required]],
      showDate: ['', [Validators.required]],
      showTime: ['', [Validators.required, Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      language: ['', [Validators.required]],
      format: ['', [Validators.required]],
      statusCode: ['', [Validators.required]],
      basePrice: ['', [Validators.required, Validators.min(0), Validators.max(9999)]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Showtime';
      this.modalConfig.primaryButtonText = 'Update';
    } else {
      this.modalConfig.title = 'Add Showtime';
      this.modalConfig.primaryButtonText = 'Create';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        movieId: this.item.movieId,
        screenId: this.item.screenId,
        theatreId: this.item.theatreId,
        showDate: this.item.showDate,
        showTime: this.item.showTime,
        language: this.item.language,
        format: this.item.format,
        statusCode: this.item.statusCode,
        basePrice: this.item.basePrice,
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
        movieId: formValue.movieId,
        screenId: formValue.screenId,
        theatreId: formValue.theatreId,
        showDate: formValue.showDate,
        showTime: formValue.showTime,
        language: formValue.language,
        format: formValue.format,
        statusCode: formValue.statusCode,
        basePrice: formValue.basePrice,
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
      if (field.errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      movieId: 'Movie', screenId: 'Screen', theatreId: 'Theatre', showDate: 'Show Date',
      showTime: 'Show Time (HH:MM)', language: 'Language', format: 'Format', statusCode: 'Status Code',
      basePrice: 'Base Price', isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
