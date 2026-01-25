import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { FormManagerService } from '../../services/form-manager.service';
import { AuthService } from '../../services/auth.service';
import { FormManager, FormStep, FormStepRequest } from '../../interfaces/form-manager.interface';
import { ToastrService } from 'ngx-toastr';
import { CodemirrorModule, CodemirrorComponent } from '@ctrl/ngx-codemirror';

@Component({
  selector: 'app-form-manager-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    BaseModalComponent,
    CodemirrorModule
  ],
  templateUrl: './form-manager-modal.component.html',
  styleUrls: ['./form-manager-modal.component.scss']
})
export class FormManagerModalComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {

  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() formManager: FormManager | null = null; // For edit mode
  @Input() isLoading: boolean = false;

  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() formManagerSaved = new EventEmitter<FormManager>();

  // Form
  formManagerForm!: FormGroup;
  formStepsForm!: FormGroup; // Reactive form for steps

  // Form Steps data
  formSteps: FormStep[] = [];

  // CodeMirror instances
  @ViewChildren(CodemirrorComponent) codeMirrorComponents!: QueryList<CodemirrorComponent>;

  // CodeMirror configuration
  codeMirrorOptions = {
    mode: 'application/json',
    theme: 'material',
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false
  };
  
  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Form Manager',
    icon: 'forms',
    size: 'xl',
    primaryButtonText: 'Save Form',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };
  
  constructor(
    private fb: FormBuilder, 
    private formManagerService: FormManagerService,
    private authService: AuthService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.initializeForm();
    this.updateModalConfig();
  }
  
  ngOnChanges(): void {
    if (this.formManagerForm) {
      this.updateModalConfig();
      this.populateForm();
      // Update button state after form is populated
      setTimeout(() => {
        this.updateButtonState();
      }, 0);
    }
    
    // Handle body scroll lock
    this.handleBodyScroll();
  }

  ngAfterViewInit(): void {
    // Refresh CodeMirror instances after view initialization
    this.refreshCodeMirrorEditors();
  }

  ngOnDestroy(): void {
    // Always restore body scroll on component destroy
    this.enableBodyScroll();
  }

  // Refresh all CodeMirror editors
  private refreshCodeMirrorEditors(): void {
    setTimeout(() => {
      if (this.codeMirrorComponents && this.codeMirrorComponents.length > 0) {
        this.codeMirrorComponents.forEach(editor => {
          try {
            // Access the CodeMirror instance and refresh it
            if (editor.codeMirror) {
              editor.codeMirror.refresh();
            }
            // Also try to trigger change detection on the component
            if (editor['_changeDetectorRef']) {
              editor['_changeDetectorRef'].markForCheck();
            }
          } catch (error) {
            // Silently handle errors if CodeMirror instance is not ready
            console.debug('CodeMirror refresh error:', error);
          }
        });
      }
    }, 150);
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
    this.formManagerForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      slug: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-z0-9-]+$/)]],
      description: ['', [Validators.maxLength(500)]],
      version: ['1.0.0', [Validators.required]],
      isActive: [true, [Validators.required]]
    });
    
    // Watch form validity for button state
    this.formManagerForm.valueChanges.subscribe(() => {
      this.updateButtonState();
    });
  }
  
  // Update button state based on form and JSON validity
  private updateButtonState(): void {
    const hasJsonErrors = this.hasJsonErrors();
    const hasSteps = this.formSteps.length > 0;
    const formInvalid = this.formManagerForm.invalid;
    
    this.modalConfig.primaryButtonDisabled = formInvalid || hasJsonErrors || !hasSteps || this.isLoading;
  }

  // Check if any form step has JSON errors
  private hasJsonErrors(): boolean {
    return this.formSteps.some(step => step.jsonErrors && Object.keys(step.jsonErrors).length > 0);
  }
  
  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.formManager) {
      // Edit Mode
      this.modalConfig.title = 'Edit Form Manager';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Form';
    } else {
      // Add Mode
      this.modalConfig.title = 'Add Form Manager';
      this.modalConfig.icon = 'forms';
      this.modalConfig.primaryButtonText = 'Create Form';
    }
    
    this.modalConfig.primaryButtonLoading = this.isLoading;
    // Don't update button state here - it will be updated after populateForm()
  }
  
      // Populate form with form manager data (edit mode)
  private populateForm(): void {
    if (this.formManager && this.formManagerForm) {
      this.formManagerForm.patchValue({
        title: this.formManager.title,
        slug: this.formManager.slug,
        description: this.formManager.description || '',
        version: this.formManager.version || '1.0.0',
        isActive: this.formManager.isActive
      }, { emitEvent: false });

      // Populate form steps - convert objects to strings for editing
      this.formSteps = this.formManager.formSteps.map((step, index) => ({
        ...step,
        // String versions for CodeMirror editing
        validationRulesJson: JSON.stringify(step.validationRules, null, 2),
        formSchemaJson: JSON.stringify(step.formSchema, null, 2),
        uiSchemaJson: JSON.stringify(step.uiSchema, null, 2),
        metadataJson: step.metadata ? JSON.stringify(step.metadata, null, 2) : JSON.stringify({}, null, 2),
        workflowRulesJson: JSON.stringify(step.workflowRules, null, 2),
        jsonErrors: {},
        expanded: false,
        // Add unique key for CodeMirror re-initialization
        codeMirrorKey: `${step.id || index}-${Date.now()}`
      }));

      // Validate all JSON fields for each step (they should be valid since they come from backend)
      this.formSteps.forEach(step => {
        this.validateStepJsonField(step, 'validationRules', step.validationRulesJson);
        this.validateStepJsonField(step, 'formSchema', step.formSchemaJson);
        this.validateStepJsonField(step, 'uiSchema', step.uiSchemaJson);
        this.validateStepJsonField(step, 'metadata', step.metadataJson);
        this.validateStepJsonField(step, 'workflowRules', step.workflowRulesJson);
      });
      
      // Force change detection and refresh CodeMirror editors
      this.cdr.detectChanges();
      
      // Update button state after populating form and validating
      setTimeout(() => {
        // Ensure form is valid after population
        this.formManagerForm.updateValueAndValidity();
        this.updateButtonState();
        // Refresh CodeMirror editors after data is loaded
        this.refreshCodeMirrorEditors();
      }, 200);
    } else {
      // Add mode - create default first step
      this.addDefaultStep();
      // Force change detection
      this.cdr.detectChanges();
      // Update button state after adding default step
      setTimeout(() => {
        this.updateButtonState();
        // Refresh CodeMirror editors
        this.refreshCodeMirrorEditors();
      }, 200);
    }
  }
  

  // JSON validation for form steps
  validateStepJsonField(step: FormStep, field: string, value: string): void {
    try {
      if (!value || value.trim() === '') {
        // Empty value - treat as empty object for optional fields, error for required
        if (field === 'metadata') {
          (step as any)[field] = {};
          if (step.jsonErrors) {
            delete step.jsonErrors[field as keyof typeof step.jsonErrors];
          }
        } else {
          // Required field is empty - set error
          if (!step.jsonErrors) {
            step.jsonErrors = {};
          }
          step.jsonErrors[field as keyof typeof step.jsonErrors] = 'This field is required';
        }
      } else {
        const parsed = JSON.parse(value);
        // Valid JSON - store parsed object and remove error if exists
        (step as any)[field] = parsed;
        if (step.jsonErrors) {
          delete step.jsonErrors[field as keyof typeof step.jsonErrors];
        }
      }
    } catch (error: any) {
      // Invalid JSON - set error
      if (!step.jsonErrors) {
        step.jsonErrors = {};
      }
      step.jsonErrors[field as keyof typeof step.jsonErrors] = error.message;
    }
    // Update button state after validation (use setTimeout to avoid multiple calls)
    setTimeout(() => {
      this.updateButtonState();
    }, 0);
  }

  // CodeMirror change handlers for form steps
  onStepValidationRulesChange(step: FormStep, value: string): void {
    // Ensure value is always a string (never undefined or null)
    step.validationRulesJson = value || '';
    this.validateStepJsonField(step, 'validationRules', step.validationRulesJson);
  }

  onStepFormSchemaChange(step: FormStep, value: string): void {
    // Ensure value is always a string (never undefined or null)
    step.formSchemaJson = value || '';
    this.validateStepJsonField(step, 'formSchema', step.formSchemaJson);
  }

  onStepUiSchemaChange(step: FormStep, value: string): void {
    // Ensure value is always a string (never undefined or null)
    step.uiSchemaJson = value || '';
    this.validateStepJsonField(step, 'uiSchema', step.uiSchemaJson);
  }

  onStepMetadataChange(step: FormStep, value: string): void {
    // Ensure value is always a string (never undefined or null)
    step.metadataJson = value || '';
    this.validateStepJsonField(step, 'metadata', step.metadataJson);
  }

  onStepWorkflowRulesChange(step: FormStep, value: string): void {
    // Ensure value is always a string (never undefined or null)
    step.workflowRulesJson = value || '';
    this.validateStepJsonField(step, 'workflowRules', step.workflowRulesJson);
  }

  // Auto-generate step slug from step title
  onStepTitleChange(step: FormStep): void {
    if (step.stepTitle) {
      step.stepSlug = step.stepTitle.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
  }

  // Add default step for new forms
  private addDefaultStep(): void {
    const defaultValidationRules = {};
    const defaultFormSchema = {};
    const defaultUiSchema = {};
    const defaultMetadata = {};
    const defaultWorkflowRules = {"permissions": []};

    const defaultStep: FormStep = {
      stepTitle: 'Step 1',
      stepSlug: 'v1',
      stepOrder: 1,
      // String versions for editing
      validationRulesJson: JSON.stringify(defaultValidationRules, null, 2),
      formSchemaJson: JSON.stringify(defaultFormSchema, null, 2),
      uiSchemaJson: JSON.stringify(defaultUiSchema, null, 2),
      metadataJson: JSON.stringify(defaultMetadata, null, 2),
      workflowRulesJson: JSON.stringify(defaultWorkflowRules, null, 2),
      // Parsed versions for backend
      validationRules: defaultValidationRules,
      formSchema: defaultFormSchema,
      uiSchema: defaultUiSchema,
      metadata: defaultMetadata,
      workflowRules: defaultWorkflowRules,
      jsonErrors: {},
      expanded: true,
      // Add unique key for CodeMirror re-initialization
      codeMirrorKey: `new-${Date.now()}`
    } as any;
    this.formSteps = [defaultStep];
  }

  // Add new step
  addStep(): void {
    const nextOrder = Math.max(...this.formSteps.map(s => s.stepOrder), 0) + 1;
    const defaultValidationRules = {};
    const defaultFormSchema = {};
    const defaultUiSchema = {};
    const defaultMetadata = {};
    const defaultWorkflowRules = {"permissions": []};

    const newStep: FormStep = {
      stepTitle: `Step ${nextOrder}`,
      stepSlug: `step-${nextOrder}`,
      stepOrder: nextOrder,
      // String versions for editing
      validationRulesJson: JSON.stringify(defaultValidationRules, null, 2),
      formSchemaJson: JSON.stringify(defaultFormSchema, null, 2),
      uiSchemaJson: JSON.stringify(defaultUiSchema, null, 2),
      metadataJson: JSON.stringify(defaultMetadata, null, 2),
      workflowRulesJson: JSON.stringify(defaultWorkflowRules, null, 2),
      // Parsed versions for backend
      validationRules: defaultValidationRules,
      formSchema: defaultFormSchema,
      uiSchema: defaultUiSchema,
      metadata: defaultMetadata,
      workflowRules: defaultWorkflowRules,
      jsonErrors: {},
      expanded: true,
      // Add unique key for CodeMirror re-initialization
      codeMirrorKey: `new-${Date.now()}`
    } as any;
    this.formSteps.push(newStep);

    // Trigger change detection for new CodeMirror instances
    this.cdr.detectChanges();
    setTimeout(() => {
      this.updateButtonState();
      // Refresh CodeMirror editors after adding new step
      this.refreshCodeMirrorEditors();
    }, 200);
  }

  // Remove step
  removeStep(index: number): void {
    if (this.formSteps.length > 1) {
      this.formSteps.splice(index, 1);
      // Reorder remaining steps
      this.formSteps.forEach((step, i) => {
        step.stepOrder = i + 1;
      });
    }
  }

  // Toggle step expansion
  toggleStepExpansion(step: FormStep): void {
    step.expanded = !step.expanded;
    // Refresh CodeMirror editors when step is expanded
    if (step.expanded) {
      setTimeout(() => {
        this.refreshCodeMirrorEditors();
      }, 100);
    }
  }

  // TrackBy function for ngFor
  trackByStepIndex(index: number, item: FormStep): any {
    return index;
  }
  
  // Auto-generate slug from title
  onTitleChange(): void {
    const title = this.formManagerForm.get('title')?.value;
    if (title && !this.formManager) { // Only auto-generate for new forms
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      this.formManagerForm.patchValue({ slug }, { emitEvent: false });
    }
  }
  
  // Modal Events
  onModalClose(): void {
    this.enableBodyScroll();
    this.resetForm();
    this.closed.emit();
  }
  
  onModalSave(): void {
    console.log("Modal Button is clicked");
    
    // Validate all JSON fields before saving
    this.formSteps.forEach(step => {
      if (step.validationRulesJson) {
        this.validateStepJsonField(step, 'validationRules', step.validationRulesJson);
      }
      if (step.formSchemaJson) {
        this.validateStepJsonField(step, 'formSchema', step.formSchemaJson);
      }
      if (step.uiSchemaJson) {
        this.validateStepJsonField(step, 'uiSchema', step.uiSchemaJson);
      }
      if (step.workflowRulesJson) {
        this.validateStepJsonField(step, 'workflowRules', step.workflowRulesJson);
      }
      if (step.metadataJson) {
        this.validateStepJsonField(step, 'metadata', step.metadataJson);
      }
    });

    // Check if form is valid and has no JSON errors
    if (!this.formManagerForm.valid) {
      console.log('Form is invalid:', this.formManagerForm.errors);
      this.markFormGroupTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    if (this.hasJsonErrors()) {
      console.log('JSON errors found:', this.formSteps.map(s => s.jsonErrors));
      this.toastr.error('Please fix all JSON errors in form steps', 'JSON Validation Error');
      return;
    }

    if (this.formSteps.length === 0) {
      this.toastr.error('Please add at least one form step', 'Validation Error');
      return;
    }

    // Check authentication
    const isAuthenticated = this.authService.isAuthenticated();
    const currentUser = this.authService.getCurrentUser();

    if (!isAuthenticated || !currentUser) {
      this.toastr.error('You must be logged in to perform this action', 'Authentication Required');
      return;
    }

    // Set loading state
    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.formManagerForm.value;

    // Prepare form steps for API (ensure all JSON fields are parsed)
    const formSteps: FormStepRequest[] = this.formSteps.map(step => {
      // Ensure all required fields are present
      if (!step.stepTitle || !step.stepSlug) {
        throw new Error(`Step ${step.stepOrder} is missing required fields (title or slug)`);
      }

      // Ensure all JSON fields are parsed objects, not strings
      const validationRules = step.validationRules || {};
      const formSchema = step.formSchema || {};
      const uiSchema = step.uiSchema || {};
      const workflowRules = step.workflowRules || {};
      const metadata = step.metadata || {};

      return {
        stepTitle: step.stepTitle.trim(),
        stepSlug: step.stepSlug.trim(),
        stepOrder: step.stepOrder,
        validationRules: validationRules,
        formSchema: formSchema,
        uiSchema: uiSchema,
        metadata: metadata,
        workflowRules: workflowRules
      };
    });

    const formManagerData = {
      title: formValue.title.trim(),
      slug: formValue.slug.trim(),
      description: formValue.description?.trim() || '',
      version: formValue.version.trim(),
      isActive: formValue.isActive,
      formSteps: formSteps,
      ...(this.formManager?.id && { id: this.formManager.id })
    };

    console.log('Saving form manager:', formManagerData);

    try {
      this.formManagerService.storeFormManager(formManagerData).subscribe({
        next: (savedFormManager) => {
          console.log('Form manager saved successfully:', savedFormManager);
          this.enableBodyScroll();
          this.formManagerSaved.emit(savedFormManager as any);
          this.resetLoadingState();
          this.resetForm();
        },
        error: (error) => {
          console.error('Failed to save form manager:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to save form manager. Please try again.';
          this.toastr.error(errorMessage, 'Save Error');
          this.resetLoadingState();
        }
      });
    } catch (error: any) {
      console.error('Unexpected error in onModalSave:', error);
      this.toastr.error(error?.message || 'An unexpected error occurred', 'Error');
      this.resetLoadingState();
    }
  }
  
  // Reset loading states
  private resetLoadingState(): void {
    this.modalConfig.primaryButtonLoading = false;
    this.updateButtonState();
  }
  
  // Form Helpers
  private resetForm(): void {
    this.formManagerForm.reset({
      title: '',
      slug: '',
      description: '',
      version: '1.0.0',
      isActive: true
    });
    this.formManagerForm.markAsUntouched();

    // Reset form steps
    this.formSteps = [];
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.formManagerForm.controls).forEach(key => {
      this.formManagerForm.get(key)?.markAsTouched();
    });
  }
  
  // Form Field Helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.formManagerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.formManagerForm.get(fieldName);
    
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return `${this.getFieldLabel(fieldName)} must contain only lowercase letters, numbers, and hyphens`;
      }
    }
    
    return '';
  }
  
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      slug: 'Slug',
      description: 'Description',
      version: 'Version',
      isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
