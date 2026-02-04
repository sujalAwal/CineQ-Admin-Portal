import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';

export interface ConfirmationConfig {
  title: string;
  message: string;
  icon?: string;
  iconColor?: 'primary' | 'warning' | 'danger' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  loading?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, BaseModalComponent],
  styleUrls: ['./confirmation-modal.component.scss'],
  template: `
    <div class="confirmation-modal">
      <app-base-modal 
        [isVisible]="isVisible"
        [config]="modalConfig"
        (closed)="onCancel()"
        (primaryAction)="onConfirm()"
        (secondaryAction)="onCancel()">
        
        <div class="modal-body text-center py-3">
          <!-- Icon with background circle -->
          <div class="mb-3" *ngIf="config.icon">
            <div class="icon-container d-inline-flex align-items-center justify-content-center rounded-circle"
                 [ngClass]="getIconBgClass()">
              <i [class]="config.icon + ' ' + getIconColorClass()" 
                 style="font-size: 2.5rem;"></i>
            </div>
          </div>
          
          <!-- Message -->
          <div class="message-container">
            <p class="mb-0 fw-medium" [innerHTML]="config.message"></p>
          </div>
        </div>
        
      </app-base-modal>
    </div>
  `
})
export class ConfirmationModalComponent {
  @Input() isVisible: boolean = false;
  @Input() config: ConfirmationConfig = {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    icon: 'ti ti-alert-circle',
    iconColor: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmButtonClass: 'btn-danger',
    size: 'xs'
  };

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get modalConfig(): ModalConfig {
    return {
      title: this.config.title,
      size: this.config.size || 'xs',
      showFooter: true,
      primaryButtonText: this.config.confirmText || 'Confirm',
      primaryButtonClass: this.config.confirmButtonClass || 'btn-danger',
      secondaryButtonText: this.config.cancelText || 'Cancel',
      primaryButtonLoading: this.config.loading || false,
      primaryButtonDisabled: this.config.loading || false,
      showSecondaryButton: true
    };
  }

  getIconColorClass(): string {
    switch (this.config.iconColor) {
      case 'primary': return 'text-white';
      case 'warning': return 'text-white';
      case 'danger': return 'text-white';
      case 'success': return 'text-white';
      case 'info': return 'text-white';
      default: return 'text-white';
    }
  }

  getIconBgClass(): string {
    switch (this.config.iconColor) {
      case 'primary': return 'bg-primary bg-opacity-15 text-primary-emphasis';
      case 'warning': return 'bg-warning bg-opacity-15 text-warning-emphasis';
      case 'danger': return 'bg-danger bg-opacity-15 text-danger-emphasis';
      case 'success': return 'bg-success bg-opacity-15 text-success-emphasis';
      case 'info': return 'bg-info bg-opacity-15 text-info-emphasis';
      default: return 'bg-warning bg-opacity-15 text-warning-emphasis';
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}