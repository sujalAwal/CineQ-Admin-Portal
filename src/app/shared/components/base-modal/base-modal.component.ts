import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ModalConfig {
  title: string;
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showFooter?: boolean;
  primaryButtonText?: string;
  primaryButtonClass?: string;
  secondaryButtonText?: string;
  primaryButtonIcon?: string;
  primaryButtonLoading?: boolean;
  primaryButtonDisabled?: boolean;
  showSecondaryButton?: boolean;
}

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.component.html',
  styleUrls: ['./base-modal.component.scss']
})
export class BaseModalComponent implements OnInit {
  @Input() isVisible: boolean = false;
  @Input() config: ModalConfig = {
    title: 'Modal',
    showFooter: true,
    primaryButtonText: 'Save',
    secondaryButtonText: 'Cancel',
    primaryButtonIcon: 'device-floppy',
    showSecondaryButton: true,
    size: 'lg'
  };

  @Output() closed = new EventEmitter<void>();
  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  ngOnInit() {
    // Handle escape key
    if (this.isVisible) {
      document.addEventListener('keydown', this.handleEscapeKey);
    }
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  private handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isVisible) {
      this.onCancel();
    }
  };

  getModalSizeClass(): string {
    switch (this.config.size) {
      case 'xs': return 'modal-sm'; // Extra small uses same as small but we'll add custom CSS
      case 'sm': return 'modal-sm';
      case 'md': return '';
      case 'lg': return 'modal-lg';
      case 'xl': return 'modal-xl';
      default: return 'modal-lg';
    }
  }

  onCancel(): void {
    if (!this.config.primaryButtonLoading) {
      this.closed.emit();
    }
  }

  onPrimaryClick(): void {
    this.primaryAction.emit();
  }

  onSecondaryClick(): void {
    this.secondaryAction.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && !this.config.primaryButtonLoading) {
      this.onCancel();
    }
  }
}