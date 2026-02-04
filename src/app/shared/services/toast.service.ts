import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private toastr: ToastrService) { }

  // ========================================
  // STATUS-SPECIFIC TOAST METHODS
  // ========================================

  /**
   * Show active status message (clean white toast with green tick)
   */
  activated(message: string, title?: string): void {
    this.toastr.success(message, title || 'Status Activated', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      toastClass: 'ngx-toastr toast-status-change',
      enableHtml: true
    });
  }

  /**
   * Show inactive status message (clean white toast with green tick)
   */
  inactive(message: string, title?: string): void {
    this.toastr.success(message, title || 'Status Changed', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      toastClass: 'ngx-toastr toast-status-change',
      enableHtml: true
    });
  }

  /**
   * Show general status change message (unified white design)
   */
  statusChange(message: string, title?: string): void {
    this.toastr.success(message, title || 'Status Updated', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      toastClass: 'ngx-toastr toast-status-change',
      enableHtml: true
    });
  }

  // ========================================
  // GENERAL TOAST METHODS
  // ========================================

  /**
   * Show success message (like Laravel session()->flash('success'))
   */
  success(message: string, title?: string): void {
    this.toastr.success(message, title || 'Success', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show error message (like Laravel session()->flash('error'))
   */
  error(message: string, title?: string): void {
    this.toastr.error(message, title || 'Error', {
      timeOut: 5000, // Longer for errors
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show warning message (like Laravel session()->flash('warning'))
   */
  warning(message: string, title?: string): void {
    this.toastr.warning(message, title || 'Warning', {
      timeOut: 4000,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show info message (like Laravel session()->flash('info'))
   */
  info(message: string, title?: string): void {
    this.toastr.info(message, title || 'Info', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show loading message (useful for long operations)
   */
  loading(message: string): void {
    this.toastr.info(message, 'Loading...', {
      timeOut: 0, // Don't auto-close
      extendedTimeOut: 0,
      progressBar: false,
      closeButton: false,
      disableTimeOut: true
    });
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toastr.clear();
  }

  /**
   * Laravel-style validation errors
   */
  validationErrors(errors: {[key: string]: string[]}): void {
    Object.keys(errors).forEach(field => {
      const fieldErrors = errors[field];
      fieldErrors.forEach(error => {
        this.error(error, `${field.charAt(0).toUpperCase() + field.slice(1)} Error`);
      });
    });
  }
}