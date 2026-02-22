import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { ScreenService } from '../../services/screen.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-screen-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './screen-modal.component.html',
  styleUrls: ['./screen-modal.component.scss']
})
export class ScreenModalComponent implements OnInit, OnChanges {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  modalConfig: ModalConfig = {
    title: 'Add Screen',
    icon: 'tv',
    size: 'lg',
    primaryButtonText: 'Save',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(private fb: FormBuilder, private service: ScreenService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

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
      screenName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      theatreId: ['', [Validators.required]],
      rows: ['', [Validators.required, Validators.min(1), Validators.max(50)]],
      columns: ['', [Validators.required, Validators.min(1), Validators.max(50)]],
      screenType: ['', [Validators.required]],
      soundSystem: ['', [Validators.minLength(2), Validators.maxLength(50)]],
      breakTime: [10, [Validators.required, Validators.min(0), Validators.max(60)]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Screen';
      this.modalConfig.primaryButtonText = 'Update';
    } else {
      this.modalConfig.title = 'Add Screen';
      this.modalConfig.primaryButtonText = 'Create';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        screenName: this.item.screenName,
        theatreId: this.item.theatreId,
        rows: this.item.rows,
        columns: this.item.columns,
        screenType: this.item.screenType,
        soundSystem: this.item.soundSystem || '',
        breakTime: this.item.breakTime || 10,
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
        screenName: formValue.screenName.trim(),
        theatreId: formValue.theatreId,
        rows: formValue.rows,
        columns: formValue.columns,
        screenType: formValue.screenType,
        soundSystem: formValue.soundSystem?.trim() || '',
        breakTime: formValue.breakTime,
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
  private resetForm(): void { this.form.reset({ isActive: true, breakTime: 10 }); this.form.markAsUntouched(); }
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
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      screenName: 'Screen Name', theatreId: 'Theatre', rows: 'Rows', columns: 'Columns',
      screenType: 'Screen Type', soundSystem: 'Sound System', breakTime: 'Break Time (mins)', isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
