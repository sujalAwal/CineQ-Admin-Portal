// Angular import
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

// third party import
import { SharedModule } from 'src/app/theme/shared/shared.module';

// project imports
import { AuthService } from '../../../../../shared/services/auth.service';
import { ToastService } from '../../../../../shared/services/toast.service';

@Component({
  selector: 'app-nav-right',
  imports: [RouterModule, SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss']
})
export class NavRightComponent {
  
  constructor(
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  /**
   * Handle logout (calls backend API and clears local data)
   */
  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Subtle success message - user is already being redirected
        this.toastService.info('You have been logged out.', 'Goodbye');
      },
      error: (error) => {
        // Handle logout errors gracefully
        if (error.includes('Network') || error.includes('connection')) {
          this.toastService.warning('Logged out locally due to connection issues.', 'Offline Logout');
        } else if (error.includes('401') || error.includes('token')) {
          // Token already expired - silent logout
          console.log('Token already expired, silent logout');
        } else {
          this.toastService.warning('Logged out locally.', 'Logout');
        }
        console.error('Logout error:', error);
      }
    });
  }
}
