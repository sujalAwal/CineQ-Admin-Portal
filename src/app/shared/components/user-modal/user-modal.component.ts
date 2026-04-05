import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { ToastService } from '../../services/toast.service';
import { UserDetailResponse, UserRegisterRequest, UserUpdateRequest } from '../../interfaces/user.interface';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './user-modal.component.html',
  styleUrls: ['./user-modal.component.scss']
})
export class UserModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() user: UserDetailResponse | null = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() userSaved = new EventEmitter<any>();

  userForm!: FormGroup;
  roles: Array<{id: string, name: string}> = [];
  loading: boolean = false;
  private destroy$ = new Subject<void>();

  modalConfig: ModalConfig = {
    title: 'Add User',
    icon: 'user-plus',
    size: 'lg',
    primaryButtonText: 'Save User',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadRoles();
  }

  ngOnChanges(): void {
    if (this.userForm) {
      this.updateModalConfig();
      this.populateForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      password: ['', []],
      roleId: ['', [Validators.required]],
      isActive: [true]
    });

    // Set password validators for create mode
    this.updatePasswordValidators();
  }

  private updatePasswordValidators(): void {
    const passwordControl = this.userForm.get('password');
    if (!this.user) {
      // Create mode: password is required
      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(100),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      ]);
    } else {
      // Edit mode: password is optional
      passwordControl?.setValidators([
        Validators.minLength(8),
        Validators.maxLength(100),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      ]);
    }
    passwordControl?.updateValueAndValidity();
  }

  private updateModalConfig(): void {
    if (this.user) {
      this.modalConfig.title = 'Edit User';
      this.modalConfig.icon = 'user-edit';
      this.modalConfig.primaryButtonText = 'Update User';
    } else {
      this.modalConfig.title = 'Add User';
      this.modalConfig.icon = 'user-plus';
      this.modalConfig.primaryButtonText = 'Create User';
    }
    this.updatePasswordValidators();
  }

  private populateForm(): void {
    if (this.user && this.userForm) {
      this.userForm.patchValue({
        name: this.user.name,
        email: this.user.email,
        phoneNumber: this.user.phoneNumber || '',
        password: '', // Never populate password
        roleId: this.user.roleId,
        isActive: this.user.isActive
      });
      this.cdr.markForCheck();
    }
  }

  private loadRoles(): void {
    this.loading = true;
    this.roleService.getRoleOptions().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onModalClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  onModalSave(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.userForm.getRawValue();

    this.modalConfig.primaryButtonLoading = true;

    if (this.user) {
      // Update existing user
      const updateData: Partial<UserUpdateRequest> = {
        name: formValue.name.trim(),
        email: formValue.email.trim().toLowerCase(),
        phoneNumber: formValue.phoneNumber.trim(),
        roleId: formValue.roleId,
        isActive: formValue.isActive
      };


      this.userService.updateUser(this.user.id, updateData).subscribe({
        next: (response) => {
          this.userSaved.emit(response);
          this.resetForm();
          this.modalConfig.primaryButtonLoading = false;
        },
        error: (error) => {
          this.handleSaveError(error);
          this.modalConfig.primaryButtonLoading = false;
        }
      });
    } else {
      // Create new user
      const registerData: UserRegisterRequest = {
        name: formValue.name.trim(),
        email: formValue.email.trim().toLowerCase(),
        password: formValue.password,
        phoneNumber: formValue.phoneNumber.trim(),
        roleId: formValue.roleId
      };

      this.userService.registerUser(registerData).subscribe({
        next: (response) => {
          this.userSaved.emit(response);
          this.resetForm();
          this.modalConfig.primaryButtonLoading = false;
        },
        error: (error) => {
          this.handleSaveError(error);
          this.modalConfig.primaryButtonLoading = false;
        }
      });
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

  private resetForm(): void {
    this.userForm.reset({
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      roleId: '',
      isActive: true
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['pattern']) {
        if (fieldName === 'phoneNumber') return 'Phone number must be 10 digits';
        if (fieldName === 'password') return 'Password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      password: 'Password',
      roleId: 'Role'
    };
    return labels[fieldName] || fieldName;
  }
}
