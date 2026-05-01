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
        
        // Handle 401 errors - redirect to login and clear all cache/cookies
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
   * Handle 401 errors - clear cache, cookies and redirect to login
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      
      // Clear all authentication data, cache and cookies
      this.clearAuthenticationData();
      
      // Redirect to login after clearing
      this.router.navigate(['/login']);
      
      this.isRefreshing = false;
    }

    return throwError(() => new Error('Unauthorized'));
  }

  /**
   * Clear all authentication data, cache and cookies
   */
  private clearAuthenticationData(): void {
    // 1. Clear localStorage
    localStorage.clear();
    
    // 2. Clear sessionStorage
    sessionStorage.clear();
    
    // 3. Clear all cookies
    this.clearAllCookies();
    
    // 4. Clear auth service state
    this.authService.handleUnauthorized();
  }

  /**
   * Clear all cookies by setting expiration date to past
   */
  private clearAllCookies(): void {
    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // Delete each cookie
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName) {
        // Delete cookie by setting expiration to past
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        
        // Also try with SameSite attributes
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;`;
      }
    });
  }
}