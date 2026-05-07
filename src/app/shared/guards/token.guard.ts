import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const token = route.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/']);
      return false;
    }

    return this.authService.validateToken(token).pipe(
      map(response => {
        if (response && response.success) {
          return true;
        }
        this.router.navigate(['/resend-link']);
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/resend-link']);
        return of(false);
      })
    );
  }
}
