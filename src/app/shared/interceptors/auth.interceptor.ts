import { Injectable } from '@angular/core';
import { 
  HttpInterceptor, 
  HttpRequest, 
  HttpHandler, 
  HttpEvent,
  HttpErrorResponse 
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // For cookie-based auth, just ensure withCredentials is set
    let authReq = this.addCookieCredentials(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        
        // Handle 401 errors with token refresh (for cookie-based auth)
        if (error.status === 401 && !authReq.url.includes('/auth/login')) {
          return this.handle401Error(authReq, next);
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Add cookie credentials to request (for Laravel Sanctum cookie auth)
   */
  private addCookieCredentials(request: HttpRequest<any>): HttpRequest<any> {
    // Check if this is a FormData request (file upload)
    const isFormData = request.body instanceof FormData;
    
    // For cookie-based auth, just ensure withCredentials is set to true
    // This allows the browser to send HttpOnly cookies automatically
    // The server expects cookies like 'auth_token', 'refresh_token', etc.
    const headers: any = {
      'Accept': 'application/json'
    };
    
    // Only set Content-Type for non-FormData requests
    // FormData requests need multipart/form-data which the browser sets automatically
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    return request.clone({
      setHeaders: headers,
      withCredentials: true  // This is the key for cookie-based auth
    });
  }

  /**
   * Handle 401 errors with token refresh
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
     this.router.navigate(['/login']);
    }

    return throwError(() => new Error('Unauthorized'));
  }
}