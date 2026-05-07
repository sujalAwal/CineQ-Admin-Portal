import { Injectable, Injector } from '@angular/core';
import {
  HttpContextToken,
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Set on the retried request after a successful token refresh (avoids infinite refresh loops). */
const AUTH_REFRESH_RETRIED = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly injector: Injector,
    private router: Router
  ) {}

  /** Lazy: AuthService uses HttpClient; injecting it in the constructor causes NG0200 with HTTP_INTERCEPTORS. */
  private auth(): AuthService {
    return this.injector.get(AuthService);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authReq = this.addCookieCredentials(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || authReq.url.includes('/auth/login')) {
          return throwError(() => error);
        }

        if (authReq.url.includes('/auth/refresh')) {
          this.clearAuthenticationData();
          this.router.navigate(['/login']);
          return throwError(() => error);
        }

        if (authReq.context.get(AUTH_REFRESH_RETRIED)) {
          this.clearAuthenticationData();
          this.router.navigate(['/login']);
          return throwError(() => error);
        }

        return this.tryRefreshSessionAndRetry(authReq, next);
      })
    );
  }

  private tryRefreshSessionAndRetry(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return this.auth().refreshToken().pipe(
      switchMap(() =>
        next.handle(
          this.addCookieCredentials(
            request.clone({ context: request.context.set(AUTH_REFRESH_RETRIED, true) })
          )
        )
      ),
      catchError(() => {
        this.clearAuthenticationData();
        this.router.navigate(['/login']);
        return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
      })
    );
  }

  /**
   * Add cookie credentials to request (for Laravel Sanctum cookie auth)
   */
  private addCookieCredentials(request: HttpRequest<any>): HttpRequest<any> {
    const isFormData = request.body instanceof FormData;

    const headers: Record<string, string> = {
      Accept: 'application/json'
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return request.clone({
      setHeaders: headers,
      withCredentials: true
    });
  }

  /**
   * Clear all authentication data, cache and cookies
   */
  private clearAuthenticationData(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.clearAllCookies();
    this.auth().handleUnauthorized();
  }

  /**
   * Clear all cookies by setting expiration date to past
   */
  private clearAllCookies(): void {
    const cookies = document.cookie.split(';');

    cookies.forEach((cookie) => {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;`;
      }
    });
  }
}
