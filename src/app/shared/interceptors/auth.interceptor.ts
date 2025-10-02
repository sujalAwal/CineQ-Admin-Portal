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

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // For cookie-based auth, just ensure withCredentials is set
    let authReq = this.addCookieCredentials(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('🚨 AuthInterceptor caught error:', error.status, error.url);
        
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
    // For cookie-based auth, just ensure withCredentials is set to true
    // This allows the browser to send HttpOnly cookies automatically
    // The server expects cookies like 'auth_token', 'refresh_token', etc.
    return request.clone({
      setHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Note: No Authorization header needed - cookies handle this
        // Server will read: Cookie: auth_token=xyz; refresh_token=abc
      },
      withCredentials: true  // This is the key for cookie-based auth
    });
  }

  /**
   * Handle 401 errors with token refresh
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokenResponse.token);
          
          return next.handle(this.addCookieCredentials(request));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          // If refresh fails, logout user
          this.authService.logout().subscribe();
          return throwError(error);
        })
      );
    }

    // Wait for token refresh to complete
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(() => next.handle(this.addCookieCredentials(request)))
    );
  }
}