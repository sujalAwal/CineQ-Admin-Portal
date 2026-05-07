import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.authService.isAuthenticated$.pipe(
      take(1),
      switchMap(isAuthenticated => {
        if (isAuthenticated) {
          return this.authService.bootstrapAuthorization().pipe(
            map(() => true),
            catchError((err) => {
              if (err instanceof HttpErrorResponse && err.status === 401) {
                this.authService.navigateToLogin(state.url);
                return of(false);
              }
              return of(true);
            })
          );
        }

        // Not authenticated, redirect to login
        this.router.navigate([environment.app.loginRoute], {
          queryParams: { returnUrl: state.url }
        });
        return of(false);
      })
    );
  }
}