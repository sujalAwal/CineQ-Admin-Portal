import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { RoleService } from '../../services/role.service';
import { MasterDataService } from '../../services/master-data.service';
import { Module, Permission, Role, RoleDetailResponse } from '../../interfaces/role.interface';

@Component({
  selector: 'app-role-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './role-modal.component.html',
  styleUrls: ['./role-modal.component.scss']
})
export class RoleModalComponent implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() role: RoleDetailResponse | null = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() roleSaved = new EventEmitter<any>();

  roleForm!: FormGroup;
  modules: Module[] = [];
  permissions: Permission[] = [];
  selectedPermissions: { [moduleCode: number]: number[] } = {};
  loading: boolean = false;

  modalConfig: ModalConfig = {
    title: 'Add Role',
    icon: 'shield-lock',
    size: 'lg',
    primaryButtonText: 'Save Role',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private masterDataService: MasterDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadPermissions();
    this.loadModules();
  }

  ngOnChanges(): void {
    if (this.roleForm) {
      this.updateModalConfig();
      this.populateForm();
    }
  }

  private initializeForm(): void {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      slug: [{ value: '', disabled: true }],
      isActive: [true, [Validators.required]]
    });
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const uppercaseValue = input.value.toUpperCase();
    const slugValue = this.generateSlug(uppercaseValue);

    this.roleForm.patchValue(
      {
        name: uppercaseValue,
        slug: slugValue
      },
      { emitEvent: false }
    );
    input.value = uppercaseValue;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  private updateModalConfig(): void {
    if (this.role) {
      this.modalConfig.title = 'Edit Role';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Role';
    } else {
      this.modalConfig.title = 'Add Role';
      this.modalConfig.icon = 'shield-lock';
      this.modalConfig.primaryButtonText = 'Create Role';
    }
  }

  private populateForm(): void {
    if (this.role && this.roleForm) {
      const slugValue = this.generateSlug(this.role.name);
      this.roleForm.patchValue({
        name: this.role.name,
        slug: slugValue,
        isActive: this.role.isActive
      });

      // Populate selected permissions
      this.selectedPermissions = { ...this.role.permissions };
      this.cdr.markForCheck();
    }
  }

  private loadPermissions(): void {
    this.masterDataService.getPermissions$().subscribe({
      next: (permissions) => {
        this.permissions = permissions;
        this.cdr.markForCheck();
      }
    });
  }

  private loadModules(): void {
    this.loading = true;
    this.roleService.getModules(1, 100).subscribe({
      next: (response) => {
        this.modules = response.data;
        this.modules.forEach(module => {
          if (!this.selectedPermissions[module.code]) {
            this.selectedPermissions[module.code] = [];
          }
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  isPermissionSelected(moduleCode: number, permissionCode: number): boolean {
    return this.selectedPermissions[moduleCode]?.includes(permissionCode) || false;
  }

  togglePermission(moduleCode: number, permissionCode: number): void {
    if (!this.selectedPermissions[moduleCode]) {
      this.selectedPermissions[moduleCode] = [];
    }

    const index = this.selectedPermissions[moduleCode].indexOf(permissionCode);
    if (index > -1) {
      this.selectedPermissions[moduleCode].splice(index, 1);
    } else {
      this.selectedPermissions[moduleCode].push(permissionCode);
    }
  }

  selectAllModulePermissions(moduleCode: number): void {
    this.selectedPermissions[moduleCode] = this.permissions.map(p => p.code);
    this.cdr.markForCheck();
  }

  clearAllModulePermissions(moduleCode: number): void {
    this.selectedPermissions[moduleCode] = [];
    this.cdr.markForCheck();
  }

  onModalClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  onModalSave(): void {
    if (this.roleForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.roleForm.getRawValue(); // Use getRawValue() to get disabled fields
    const permissions: { [moduleCode: number]: number[] } = {};

    Object.entries(this.selectedPermissions).forEach(([moduleCode, permCodes]) => {
      if (permCodes.length > 0) {
        permissions[Number(moduleCode)] = permCodes;
      }
    });

    const roleData = {
      ...(this.role?.id && { id: this.role.id }), // Include ID for update
      stepSlug: 'v1',
      action: this.role ? 'update' : 'create',
      formData: {
        ...(this.role?.id && { id: this.role.id }), // Include ID in formData for update
        name: formValue.name.trim(),
        slug: formValue.slug,
        permissions: permissions,
        isActive: formValue.isActive
      }
    };

    this.modalConfig.primaryButtonLoading = true;

    this.roleService.submitRole(roleData).subscribe({
      next: (response) => {
        this.roleSaved.emit(response);
        this.resetForm();
        this.modalConfig.primaryButtonLoading = false;
      },
      error: () => {
        this.modalConfig.primaryButtonLoading = false;
      }
    });
  }

  private resetForm(): void {
    this.roleForm.reset({
      name: '',
      slug: '',
      isActive: true
    });
    this.selectedPermissions = {};
    this.modules.forEach((module) => {
      this.selectedPermissions[module.code] = [];
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.roleForm.controls).forEach(key => {
      this.roleForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.roleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.roleForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${fieldName} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    return '';
  }
}
