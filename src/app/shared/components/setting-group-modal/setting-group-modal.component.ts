import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { SettingGroupService } from '../../services/setting-group.service';
import { SettingGroup, SettingGroupRequest } from '../../interfaces/setting-group.interface';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-setting-group-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './setting-group-modal.component.html',
  styleUrls: ['./setting-group-modal.component.scss']
})
export class SettingGroupModalComponent implements OnInit, OnChanges, OnDestroy {
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() settingGroup: SettingGroup | null = null;
  @Input() isLoading: boolean = false;

  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() settingGroupSaved = new EventEmitter<SettingGroup>();

  // Form
  settingGroupForm!: FormGroup;

  // Memory leak prevention
  private destroy$ = new Subject<void>();

  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Setting Group',
    icon: 'folder-cog',
    size: 'md',
    primaryButtonText: 'Save Setting Group',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private settingGroupService: SettingGroupService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }

  ngOnChanges(): void {
    if (this.settingGroupForm) {
      this.updateModalConfig();
      this.populateForm();
    }
    this.handleBodyScroll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.enableBodyScroll();
  }

  // Body scroll management
  private handleBodyScroll(): void {
    if (this.isVisible) {
      this.disableBodyScroll();
    } else {
      this.enableBodyScroll();
    }
  }

  private disableBodyScroll(): void {
    if (typeof document !== 'undefined') {
      const body = document.body;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      body.style.paddingRight = `${scrollBarWidth}px`;
    }
  }

  private enableBodyScroll(): void {
    if (typeof document !== 'undefined') {
      const body = document.body;
      body.style.overflow = '';
      body.style.paddingRight = '';
    }
  }

  // Initialize Reactive Form
  private initializeForm(): void {
    this.settingGroupForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      slug: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]+$/)]],
      isActive: [true, [Validators.required]]
    });

    // Watch form validity for button state
    this.settingGroupForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.settingGroupForm.invalid;
    });
  }

  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.settingGroup) {
      this.modalConfig.title = 'Edit Setting Group';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Setting Group';
    } else {
      this.modalConfig.title = 'Add Setting Group';
      this.modalConfig.icon = 'folder-cog';
      this.modalConfig.primaryButtonText = 'Create Setting Group';
    }

    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.settingGroupForm?.invalid || this.isLoading;
  }

  // Populate form with setting group data (edit mode)
  private populateForm(): void {
    if (this.settingGroup && this.settingGroupForm) {
      this.settingGroupForm.patchValue({
        title: this.settingGroup.title,
        slug: this.settingGroup.slug,
        isActive: this.settingGroup.isActive
      });
    } else if (this.settingGroupForm) {
      this.settingGroupForm.reset({
        title: '',
        slug: '',
        isActive: true
      });
    }
  }

  // Generate slug from title
  generateSlug(): void {
    if (!this.settingGroup) {
      const title = this.settingGroupForm.get('title')?.value || '';
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);

      this.settingGroupForm.patchValue({ slug });
    }
  }

  // Form field validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.settingGroupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.settingGroupForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (field.errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    if (field.errors['maxlength']) {
      return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    if (field.errors['pattern']) {
      if (fieldName === 'slug') {
        return 'Slug can only contain lowercase letters, numbers, and hyphens';
      }
      return `Invalid ${this.getFieldLabel(fieldName)} format`;
    }

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      slug: 'Slug',
      isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  // Modal actions
  onModalClose(): void {
    if (!this.modalConfig.primaryButtonLoading) {
      this.resetForm();
      this.closed.emit();
    }
  }

  onModalSave(): void {
    if (this.settingGroupForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.settingGroupForm.value;

    const settingGroupData: SettingGroupRequest = {
      ...(this.settingGroup?.id && { id: this.settingGroup.id }),
      title: formValue.title,
      slug: formValue.slug,
      isActive: formValue.isActive
    };

    this.settingGroupService.storeSettingGroup(settingGroupData).subscribe({
      next: (response) => {
        if (response.success) {
          this.settingGroupSaved.emit(response.data);
          this.resetForm();
        }
        this.modalConfig.primaryButtonLoading = false;
        this.modalConfig.primaryButtonDisabled = false;
      },
      error: (error) => {
        console.error('Failed to save setting group:', error);
        this.modalConfig.primaryButtonLoading = false;
        this.modalConfig.primaryButtonDisabled = false;
      }
    });
  }

  private markFormAsTouched(): void {
    Object.keys(this.settingGroupForm.controls).forEach((key) => {
      this.settingGroupForm.get(key)?.markAsTouched();
    });
  }

  private resetForm(): void {
    this.settingGroupForm.reset({
      title: '',
      slug: '',
      isActive: true
    });
  }
}
