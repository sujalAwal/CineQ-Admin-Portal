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
          <!-- Icon -->
          <div class="mb-2" *ngIf="config.icon">
            <i [class]="config.icon + ' fs-2 ' + getIconColorClass()"></i>
          </div>
          
          <!-- Message -->
          <p class="mb-0" [innerHTML]="config.message"></p>
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
      case 'primary': return 'text-primary';
      case 'warning': return 'text-warning';
      case 'danger': return 'text-danger';
      case 'success': return 'text-success';
      case 'info': return 'text-info';
      default: return 'text-warning';
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}