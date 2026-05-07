import { environment } from '../../../../../environments/environment';
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../shared/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-resend-link',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './resend-link.component.html',
  styleUrls: ['./resend-link.component.scss']
})
export class ResendLinkComponent implements OnDestroy {
  environment = environment;
  resendForm: FormGroup;
  loading = false;
  submitted = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email } = this.resendForm.value;

    this.authService.resendLink(email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.submitted = true;
          this.toastService.success('Link Sent', 'If the email exists, a new link has been sent.');
        },
        error: (error) => {
          this.loading = false;
          let msg = 'Failed to resend link.';
          if (error.status === 429) {
            msg = 'Too many requests. Please try again later.';
          } else if (error.error?.message) {
            msg = error.error.message;
          }
          this.toastService.error('Error', msg);
        }
      });
  }
}
