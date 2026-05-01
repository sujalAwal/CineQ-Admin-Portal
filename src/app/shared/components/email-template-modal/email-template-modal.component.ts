import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { EmailTemplateService } from '../../services/email-template.service';
import { EmailTemplate, EmailTemplateRequest } from '../../interfaces/email-template.interface';
import { ToastService } from '../../services/toast.service';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-email-template-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent, QuillModule],
  templateUrl: './email-template-modal.component.html',
  styleUrls: ['./email-template-modal.component.scss']
})
export class EmailTemplateModalComponent implements OnInit, OnChanges, OnDestroy {
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() template: EmailTemplate | null = null;
  @Input() isLoading: boolean = false;

  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() templateSaved = new EventEmitter<EmailTemplate>();

  // Form
  templateForm!: FormGroup;

  // Quill Editor Configuration
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Email Template',
    icon: 'mail',
    size: 'xl',
    primaryButtonText: 'Save Template',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private emailTemplateService: EmailTemplateService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }

  ngOnChanges(): void {
    if (this.templateForm) {
      this.updateModalConfig();
      this.populateForm();
    }
    this.handleBodyScroll();
  }

  ngOnDestroy(): void {
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
    this.templateForm = this.fb.group({
      slug: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]+$/)]],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      subject: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(500)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      adminSubject: ['', [Validators.maxLength(500)]],
      adminMessage: [''],
      isActive: [true, [Validators.required]]
    });

    // Watch form validity for button state
    this.templateForm.valueChanges.subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.templateForm.invalid;
    });
  }

  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.template) {
      this.modalConfig.title = 'Edit Email Template';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Template';
    } else {
      this.modalConfig.title = 'Add Email Template';
      this.modalConfig.icon = 'mail';
      this.modalConfig.primaryButtonText = 'Create Template';
    }

    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.templateForm?.invalid || this.isLoading;
  }

  // Populate form with template data (edit mode)
  private populateForm(): void {
    if (this.template && this.templateForm) {
      this.templateForm.patchValue({
        slug: this.template.slug,
        name: this.template.name,
        subject: this.template.subject,
        message: this.template.message,
        adminSubject: this.template.adminSubject || '',
        adminMessage: this.template.adminMessage || '',
        isActive: this.template.isActive
      });
    } else if (this.templateForm) {
      this.templateForm.reset({
        slug: '',
        name: '',
        subject: '',
        message: '',
        adminSubject: '',
        adminMessage: '',
        isActive: true
      });
    }
  }

  // Generate slug from name
  generateSlug(): void {
    if (!this.template) {
      const name = this.templateForm.get('name')?.value || '';
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);

      this.templateForm.patchValue({ slug });
    }
  }

  // Form field validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.templateForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.templateForm.get(fieldName);
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
      slug: 'Slug',
      name: 'Name',
      subject: 'Subject',
      message: 'Message',
      adminSubject: 'Admin Subject',
      adminMessage: 'Admin Message',
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
    if (this.templateForm.invalid) {
      this.markFormAsTouched();
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.templateForm.value;

    const templateData: EmailTemplateRequest = {
      ...(this.template?.id && { id: this.template.id }),
      name: formValue.name,
      slug: formValue.slug,
      subject: formValue.subject,
      message: formValue.message,
      adminSubject: formValue.adminSubject || undefined,
      adminMessage: formValue.adminMessage || undefined,
      isActive: formValue.isActive
    };

    this.emailTemplateService.storeEmailTemplate(templateData).subscribe({
      next: (response) => {
        if (response.success) {
          this.templateSaved.emit(response.data);
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
    Object.keys(this.templateForm.controls).forEach((key) => {
      this.templateForm.get(key)?.markAsTouched();
    });
  }

  private resetForm(): void {
    this.templateForm.reset({
      slug: '',
      name: '',
      subject: '',
      message: '',
      adminSubject: '',
      adminMessage: '',
      isActive: true
    });
  }
}
