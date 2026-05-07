import { Injectable, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

@Injectable()
export class PermissionInterceptor implements HttpInterceptor {
  constructor(
    private readonly injector: Injector,
    private router: Router
  ) {}

  private auth(): AuthService {
    return this.injector.get(AuthService);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.auth().isAuthenticated()) {
      return next.handle(req);
    }

    if (this.shouldSkip(req.url, req.method)) {
      return next.handle(req);
    }

    const action = this.methodToAction(req.method);
    if (!action) {
      return next.handle(req);
    }

    const normalizedRoute = this.auth().normalizePath(this.router.url);
    const hasPermission = this.auth().hasModulePermission(normalizedRoute, action);
    if (hasPermission) {
      return next.handle(req);
    }

    this.auth().redirectToDashboard();
    return throwError(() => new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      error: {
        message: 'You do not have permission to perform this action.'
      }
    }));
  }

  private methodToAction(method: string): 'create' | 'update' | 'delete' | null {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return null;
    }
  }

  private shouldSkip(url: string, method: string): boolean {
    if (method.toUpperCase() === 'GET') {
      return true;
    }

    const skipFragments = [
      '/auth/login',
      '/auth/logout',
      '/auth/refresh',
      '/auth/profile',
      '/master-data'
    ];

    return skipFragments.some((fragment) => url.includes(fragment));
  }
}
