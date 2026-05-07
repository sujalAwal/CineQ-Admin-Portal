import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ModulePermissionGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkAccess(state.url);
  }

  canActivateChild(_childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkAccess(state.url);
  }

  private checkAccess(path: string): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      switchMap((isAuthenticated) => {
        if (!isAuthenticated) {
          this.authService.navigateToLogin(path);
          return of(false);
        }

        return this.authService.isAuthorizationReady$().pipe(
          take(1),
          switchMap((isReady) => {
            if (isReady) {
              return of(this.redirectIfForbidden(path));
            }

            return this.authService.bootstrapAuthorization().pipe(
              map(() => this.redirectIfForbidden(path)),
              catchError((err) => {
                if (err instanceof HttpErrorResponse && err.status === 401) {
                  this.authService.clearSessionAndRedirectToLogin(path);
                  return of(false);
                }
                return of(this.redirectIfForbidden(path));
              })
            );
          })
        );
      })
    );
  }

  private redirectIfForbidden(path: string): boolean {
    const normalized = this.authService.normalizePath(path);
    const allowed = this.authService.isRouteAllowed(normalized);
    if (!allowed) {
      this.router.navigate([this.authService.getDashboardRoute()]);
      return false;
    }
    return true;
  }
}
