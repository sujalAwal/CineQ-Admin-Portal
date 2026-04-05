import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { SeatStatusService } from '../../services/seat-status.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-seat-status-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './seat-status-modal.component.html',
  styleUrls: ['./seat-status-modal.component.scss']
})
export class SeatStatusModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;
  private destroy$ = new Subject<void>();

  modalConfig: ModalConfig = {
    title: 'Add Seat Status',
    icon: 'toggle-left',
    size: 'md',
    primaryButtonText: 'Save',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(private fb: FormBuilder, private service: SeatStatusService, private toastr: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.initializeForm(); }

  ngOnChanges(): void {
    if (this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.min(1), Validators.max(8)]],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.minLength(5), Validators.maxLength(500)]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Seat Status';
      this.modalConfig.primaryButtonText = 'Update';
    } else {
      this.modalConfig.title = 'Add Seat Status';
      this.modalConfig.primaryButtonText = 'Create';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        code: this.item.code,
        name: this.item.name,
        description: this.item.description || '',
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
        ...(this.item?.id && { id: this.item.id }),
        code: formValue.code,
        name: formValue.name.trim(),
        description: formValue.description?.trim() || '',
        isActive: formValue.isActive
      }
    };

    this.service.save(itemData).subscribe({
      next: (savedItem) => { this.itemSaved.emit(savedItem); this.resetLoadingState(); this.resetForm(); },
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
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least 1`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} must not exceed 8`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      code: 'Code', name: 'Name', description: 'Description', isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
