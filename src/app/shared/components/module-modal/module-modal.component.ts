import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent } from '../base-modal/base-modal.component';
import { ModalConfig } from '../base-modal/base-modal.component';
import { ModuleService } from '../../services/module.service';
import { AuthService } from '../../services/auth.service';
import { ModuleResponseDTO, ModuleRequestDTO, ModulePageRequest } from '../../interfaces/module.interface';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-module-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BaseModalComponent
  ],
  templateUrl: './module-modal.component.html',
  styleUrls: ['./module-modal.component.scss']
})
export class ModuleModalComponent implements OnInit, OnChanges, OnDestroy {
  
  // Modal Properties
  @Input() isVisible: boolean = false;
  @Input() module: ModuleRequestDTO | null = null; // For edit mode
  @Input() isLoading: boolean = false;
  @Input() parentModules: ModuleResponseDTO[] = [];
  
  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() moduleSaved = new EventEmitter<ModuleRequestDTO>();
  
  // Form
  moduleForm!: FormGroup;
  
  // Modal Configuration
  modalConfig: ModalConfig = {
    title: 'Add Module',
    icon: 'category',
    size: 'sm',
    primaryButtonText: 'Save Module',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };
  
  constructor(
    private fb: FormBuilder, 
    private moduleService: ModuleService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.moduleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      displayName: ['', [Validators.maxLength(200)]],
      api: ['', [Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      icon: ['', [Validators.maxLength(100)]],
      is_enabled: [true, [Validators.required]],
      parentId: ['']
    });
    
    // Watch form validity for button state
    this.moduleForm.valueChanges.subscribe(() => {
      this.modalConfig.primaryButtonDisabled = this.moduleForm.invalid;
    });
  }
  
  ngOnInit(): void {
    this.updateModalConfig();
  }
  
  ngOnChanges(): void {
    if (this.moduleForm) {
      this.updateModalConfig();
      this.populateForm();
    }
    
    // Handle body scroll lock
    this.handleBodyScroll();
  }

  ngOnDestroy(): void {
    // Always restore body scroll on component destroy
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
  
  // Update modal config based on mode (add/edit)
  private updateModalConfig(): void {
    if (this.module) {
      // Edit Mode
      this.modalConfig.title = 'Edit Module';
      this.modalConfig.icon = 'edit';
      this.modalConfig.primaryButtonText = 'Update Module';
    } else {
      // Add Mode
      this.modalConfig.title = 'Add Module';
      this.modalConfig.icon = 'category';
      this.modalConfig.primaryButtonText = 'Create Module';
    }
    
    this.modalConfig.primaryButtonLoading = this.isLoading;
    this.modalConfig.primaryButtonDisabled = this.moduleForm?.invalid || this.isLoading;
  }
  
  // Populate form with module data (edit mode)
  private populateForm(): void {
    if (this.module && this.moduleForm) {
      this.moduleForm.patchValue({
        name: this.module.name,
        displayName: this.module.displayName || '',
        api: this.module.api || '',
        description: this.module.description || '',
        icon: this.module.icon || '',
        is_enabled: this.module.is_enabled ?? true,
        parentId: this.module.parentId || ''
      });
    }
  }
  
  // Modal Events
  onModalClose(): void {
    this.enableBodyScroll();
    this.resetForm();
    this.closed.emit();
  }
  
  onModalSave(): void {
    if (this.moduleForm.valid) {
      const formValue = this.moduleForm.value;
      
      const moduleData: ModuleRequestDTO = {
        name: formValue.name,
        displayName: formValue.displayName,
        api: formValue.api,
        description: formValue.description,
        icon: formValue.icon,
        is_enabled: formValue.is_enabled,
        parentId: formValue.parentId
      };
      
      // Include id if this is an update operation
      if (this.module?.id) {
        moduleData.id = this.module.id;
      }

      // Emit the module data to be saved by the parent component
      this.moduleSaved.emit(moduleData);
      
      // Reset loading state and close modal
      this.resetLoadingState();
      this.onModalClose();
    } else {
      // Form is invalid
      this.markFormGroupTouched();
    }
  }
  
  // Reset loading states
  private resetLoadingState(): void {
    this.modalConfig.primaryButtonLoading = false;
    this.modalConfig.primaryButtonDisabled = this.moduleForm.invalid;
  }
  
  // Form Helpers
  private resetForm(): void {
    this.moduleForm.reset({
      name: '',
      displayName: '',
      api: '',
      description: '',
      icon: '',
      is_enabled: true,
      parentId: ''
    });
    this.moduleForm.markAsUntouched();
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.moduleForm.controls).forEach(key => {
      this.moduleForm.get(key)?.markAsTouched();
    });
  }
  
  // Form Field Helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.moduleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.moduleForm.get(fieldName);
    
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
    }
    
    return '';
  }
  
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Module Name',
      displayName: 'Display Name',
      api: 'API',
      description: 'Description',
      parentId: 'Parent Module',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}