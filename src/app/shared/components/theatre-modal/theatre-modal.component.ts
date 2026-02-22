import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { TheatreService } from '../../services/theatre.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-theatre-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './theatre-modal.component.html',
  styleUrls: ['./theatre-modal.component.scss']
})
export class TheatreModalComponent implements OnInit, OnChanges {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  modalConfig: ModalConfig = {
    title: 'Add Theatre',
    icon: 'building',
    size: 'lg',
    primaryButtonText: 'Save Theatre',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(private fb: FormBuilder, private service: TheatreService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

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
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{5,10}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
      chain: ['', [Validators.minLength(2), Validators.maxLength(50)]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Theatre';
      this.modalConfig.primaryButtonText = 'Update Theatre';
    } else {
      this.modalConfig.title = 'Add Theatre';
      this.modalConfig.primaryButtonText = 'Create Theatre';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        name: this.item.name,
        address: this.item.address,
        city: this.item.city,
        state: this.item.state,
        pincode: this.item.pincode,
        phone: this.item.phone,
        email: this.item.email,
        latitude: this.item.latitude,
        longitude: this.item.longitude,
        chain: this.item.chain || '',
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
        name: formValue.name.trim(),
        address: formValue.address.trim(),
        city: formValue.city,
        state: formValue.state,
        pincode: formValue.pincode,
        phone: formValue.phone,
        email: formValue.email,
        latitude: formValue.latitude,
        longitude: formValue.longitude,
        chain: formValue.chain?.trim() || '',
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
      if (field.errors['email']) return 'Enter valid email';
      if (field.errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name', address: 'Address', city: 'City', state: 'State', pincode: 'Pincode',
      phone: 'Phone', email: 'Email', latitude: 'Latitude', longitude: 'Longitude', chain: 'Chain', isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
