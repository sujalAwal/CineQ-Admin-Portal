import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { MultiSelectDropdownComponent } from '../multi-select-dropdown/multi-select-dropdown.component';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { ToastService } from '../../services/toast.service';
import { UserDetailResponse, UserRegisterRequest, UserUpdateRequest } from '../../interfaces/user.interface';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent, MultiSelectDropdownComponent],
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
  selectedRoleIds: string[] = [];
  multiSelectTouched: boolean = false;
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
      
      roleIds: [[], [Validators.required]],  // Changed to roleIds (array)
      isActive: [true]
    });

    // Set password validators for create mode
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
      }

  private populateForm(): void {
    if (this.user && this.userForm) {
      this.selectedRoleIds = this.user.roleIds?.length ? [...this.user.roleIds] : [];
      this.userForm.patchValue({
        name: this.user.name,
        email: this.user.email,
        phoneNumber: this.user.phoneNumber || '',
        
        roleIds: this.selectedRoleIds,
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
    this.multiSelectTouched = true;
    this.userForm.get('roleIds')?.markAsTouched();
    this.userForm.patchValue({ roleIds: [...this.selectedRoleIds] });

    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.userForm.getRawValue();

    this.modalConfig.primaryButtonLoading = true;

    const roleIds: string[] = Array.isArray(this.selectedRoleIds)
      ? this.selectedRoleIds.map((id: string) => String(id))
      : [];

    if (this.user) {
      // Update existing user
      const updateData: Partial<UserUpdateRequest> = {
        name: formValue.name.trim(),
        email: formValue.email.trim().toLowerCase(),
        phoneNumber: formValue.phoneNumber.trim(),
        roleIds,
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
        
        phoneNumber: formValue.phoneNumber.trim(),
        roleIds
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
    this.selectedRoleIds = [];
    this.multiSelectTouched = false;
    this.userForm.reset({
      name: '',
      email: '',
      phoneNumber: '',
      
      roleIds: [],
      isActive: true
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });
  }

  onRoleSelectionChange(selectedIds: string[]): void {
    this.selectedRoleIds = selectedIds;
    this.userForm.get('roleIds')?.setValue([...selectedIds]);
    this.userForm.get('roleIds')?.markAsDirty();
    this.cdr.markForCheck();
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
              }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
            roleIds: 'Role'
    };
    return labels[fieldName] || fieldName;
  }
}
