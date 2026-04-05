import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { MediaManagerModalComponent } from '../media-manager-modal/media-manager-modal.component';
import { SettingService } from '../../services/setting.service';
import { Setting, SettingRequest, SettingType } from '../../interfaces/setting.interface';
import { SettingGroup } from '../../interfaces/setting-group.interface';
import { MediaFile, MediaManagerConfig } from '../../interfaces/media.interface';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-setting-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent, MediaManagerModalComponent],
  templateUrl: './setting-modal.component.html',
  styleUrls: ['./setting-modal.component.scss']
})
export class SettingModalComponent implements OnInit, OnChanges, OnDestroy {
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() setting: Setting | null = null;
  @Input() isLoading: boolean = false;
  @Input() settingGroups: SettingGroup[] = [];
  @Input() moduleTitle: string = 'Setting';

  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() settingSaved = new EventEmitter<Setting>();

  // Form
  settingForm!: FormGroup;

  // Memory leak prevention
  private destroy$ = new Subject<void>();

  // Available setting types
  settingTypes: { value: SettingType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'media', label: 'Media' },
    { value: 'color', label: 'Color' },
    { value: 'date', label: 'Date' },
    { value: 'json', label: 'JSON' }
  ];

  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Setting',
    icon: 'settings',
    size: 'lg',
    primaryButtonText: 'Save Setting',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  // Media Manager state
  showMediaManager: boolean = false;
  selectedMediaFile: MediaFile | null = null;
  mediaManagerConfig: MediaManagerConfig = {
    title: 'Select Media',
    multipleSelection: false,
    showUploadButton: true,
    showCreateFolderButton: true,
    showDeleteButton: true,
    showPreviewButton: true
  };

  constructor(
    private fb: FormBuilder,
    private settingService: SettingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }

  ngOnChanges(): void {
    if (this.settingForm) {
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
    this.settingForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      slug: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9_-]+$/)]],
      type: ['text', [Validators.required]],
      value: [''],
      group: ['', [Validators.required]],
      isActive: [true, [Validators.required]]
    });

    // Watch form validity for button state
    this.settingForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.settingForm.invalid;
    });
  }

  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    const label = this.moduleTitle;
    if (this.setting) {
      this.modalConfig.title = `Edit ${label}`;
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = `Update ${label}`;
    } else {
      this.modalConfig.title = `Add ${label}`;
      this.modalConfig.icon = 'settings';
      this.modalConfig.primaryButtonText = `Create ${label}`;
    }

    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.settingForm?.invalid || this.isLoading;
  }

  // Populate form with setting data (edit mode)
  private populateForm(): void {
    if (this.setting && this.settingForm) {
      this.settingForm.patchValue({
        title: this.setting.title,
        slug: this.setting.slug,
        type: this.setting.type,
        value: this.setting.value || '',
        group: this.setting.group,
        isActive: this.setting.isActive
      });

      // If media type with a value, reconstruct selectedMediaFile placeholder
      if (this.setting.type === 'media' && this.setting.value) {
        this.selectedMediaFile = { id: '', fileName: this.extractFileName(this.setting.value), url: this.setting.value, type: 'IMAGE', parentId: null, filePath: this.setting.value, fileUuid: null, createdAt: '', updatedAt: '' };
      } else {
        this.selectedMediaFile = null;
      }
    } else if (this.settingForm) {
      this.settingForm.reset({
        title: '',
        slug: '',
        type: 'text',
        value: '',
        group: '',
        isActive: true
      });
      this.selectedMediaFile = null;
    }
  }

  /** Extract file name from URL */
  private extractFileName(url: string): string {
    if (!url) return '';
    return url.split('/').pop() || url;
  }

  /** Current type value */
  get currentType(): SettingType {
    return this.settingForm?.get('type')?.value || 'text';
  }

  // ── Media Manager ─────────────────────────────────────────────

  openMediaManager(): void {
    this.showMediaManager = true;
  }

  onMediaManagerClosed(): void {
    this.showMediaManager = false;
  }

  onMediaFileSelected(files: MediaFile[]): void {
    if (files && files.length > 0) {
      const file = files[0];
      this.selectedMediaFile = file;
      const url = file.url || file.filePath;
      this.settingForm.patchValue({ value: url });
      this.settingForm.get('value')?.markAsTouched();
      this.toastService.success(`"${file.fileName}" selected!`, 'Media Selected');
      this.showMediaManager = false;
    }
  }

  removeSelectedMedia(): void {
    this.selectedMediaFile = null;
    this.settingForm.patchValue({ value: '' });
    this.settingForm.get('value')?.markAsTouched();
  }

  /** URL for the currently selected media (for preview) */
  getSelectedMediaUrl(): string {
    if (this.selectedMediaFile) {
      return this.selectedMediaFile.url || this.selectedMediaFile.filePath || '';
    }
    return this.settingForm?.get('value')?.value || '';
  }

  // Generate slug from title
  generateSlug(): void {
    if (!this.setting) {
      const title = this.settingForm.get('title')?.value || '';
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);

      this.settingForm.patchValue({ slug });
    }
  }

  // Form field validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.settingForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.settingForm.get(fieldName);
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
        return 'Slug can only contain lowercase letters, numbers, hyphens and underscores';
      }
      return `Invalid ${this.getFieldLabel(fieldName)} format`;
    }

    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      slug: 'Slug',
      type: 'Type',
      value: 'Value',
      group: 'Group',
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
    if (this.settingForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.settingForm.value;

    const settingData: SettingRequest = {
      ...(this.setting?.id && { id: this.setting.id }),
      title: formValue.title,
      slug: formValue.slug,
      type: formValue.type,
      value: formValue.value || undefined,
      group: formValue.group,
      isActive: formValue.isActive
    };

    this.settingService.storeSetting(settingData).subscribe({
      next: (response) => {
        if (response.success) {
          this.settingSaved.emit(response.data);
          this.resetForm();
        }
        this.modalConfig.primaryButtonLoading = false;
        this.modalConfig.primaryButtonDisabled = false;
      },
      error: (error) => {
        this.handleSaveError(error);
        this.modalConfig.primaryButtonLoading = false;
        this.modalConfig.primaryButtonDisabled = false;
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

    this.toastService.error(errorMessage, 'Save Error');
  }

  private markFormAsTouched(): void {
    Object.keys(this.settingForm.controls).forEach((key) => {
      this.settingForm.get(key)?.markAsTouched();
    });
  }

  private resetForm(): void {
    this.settingForm.reset({
      title: '',
      slug: '',
      type: 'text',
      value: '',
      group: '',
      isActive: true
    });
    this.selectedMediaFile = null;
  }
}
