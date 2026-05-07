import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiResponse, LoginRequest, LoginResponse, ProfileResponse, User } from '../interfaces/auth.interface';
import { AuthorizationService } from './authorization.service';
import { MasterDataService } from './master-data.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  // Public observables (like Laravel's Auth::user())
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private authorizationService: AuthorizationService,
    private masterDataService: MasterDataService
  ) {
    // Check if user is logged in on service initialization
    this.checkAuthStatus();
  }

  /**
   * Login user (like Laravel Auth::attempt())
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${environment.api.baseUrl}/auth/login`;
    
    return this.http.post<ApiResponse<LoginResponse>>(url, credentials, {
      withCredentials: true  // Include cookies (like fetch credentials: 'include')
    })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Login failed');
        }),
        switchMap((loginResponse) => {
          // Store authentication data (like Laravel session)
          this.setAuthData(loginResponse);
          return this.bootstrapAuthorization().pipe(map(() => loginResponse));
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Fetch user profile
   */
  private fetchProfile(): Observable<ProfileResponse> {
    const url = `${environment.api.baseUrl}/auth/profile`;
    
    return this.http.get<ApiResponse<ProfileResponse>>(url, {
      withCredentials: true
    }).pipe(
      map((response) => {
        if (response?.success && response?.data) {
          return response.data;
        }
        throw new Error(response?.message || 'Failed to fetch profile');
      })
    );
  }

  /**
   * Load profile + permission definitions and build authorization maps
   */
  bootstrapAuthorization(): Observable<void> {
    if (!this.isAuthenticated()) {
      this.authorizationService.reset();
      return of(void 0);
    }

    return forkJoin({
      profile: this.fetchProfile(),
      permissions: this.masterDataService.getPermissions$().pipe(catchError(() => of([])))
    }).pipe(
      tap(({ profile, permissions }) => {
        this.authorizationService.initialize(profile?.modules || [], permissions || []);
      }),
      map(() => void 0),
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.authorizationService.reset();
          return throwError(() => error);
        }
        this.setPermissionDefinitionsFromCache();
        this.authorizationService.hydrateFromStorage();
        return of(void 0);
      })
    );
  }

  isRouteAllowed(path: string): boolean {
    return this.authorizationService.canAccessRoute(path);
  }

  hasModulePermission(moduleApi: string, action: 'create' | 'read' | 'update' | 'delete'): boolean {
    return this.authorizationService.can(moduleApi, action);
  }

  getAllowedNavigationApis(): Set<string> {
    return this.authorizationService.getAllowedNavigationApis();
  }

  normalizePath(path: string): string {
    return this.authorizationService.normalizePath(path);
  }

  clearSessionAndRedirectToLogin(returnUrl?: string): void {
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.authorizationService.reset();
    this.masterDataService.clearCache();

    if (returnUrl) {
      this.router.navigate([environment.app.loginRoute], { queryParams: { returnUrl } });
      return;
    }
    this.router.navigate([environment.app.loginRoute]);
  }

  redirectToDashboard(): void {
    this.router.navigate([environment.app.defaultRoute]);
  }

  ensureRouteAccess(path: string): boolean {
    if (!this.isAuthenticated()) {
      this.clearSessionAndRedirectToLogin(path);
      return false;
    }

    if (!this.isRouteAllowed(path)) {
      this.redirectToDashboard();
      return false;
    }

    return true;
  }

  isAuthorizationReady$(): Observable<boolean> {
    return this.authorizationService.initialized$;
  }

  clearAuthorization(): void {
    this.authorizationService.reset();
  }

  getAuthorizationService(): AuthorizationService {
    return this.authorizationService;
  }

  canForCurrentRoute(routePath: string, action: 'create' | 'read' | 'update' | 'delete'): boolean {
    const normalizedPath = this.normalizePath(routePath);
    return this.authorizationService.canForRoute(normalizedPath, action);
  }

  setPermissionDefinitionsFromCache(): void {
    this.authorizationService.setPermissionDefinitions(this.masterDataService.getPermissions());
  }

  getDashboardRoute(): string {
    return environment.app.defaultRoute;
  }

  getLoginRoute(): string {
    return environment.app.loginRoute;
  }

  navigateToLogin(returnUrl?: string): void {
    if (returnUrl) {
      this.router.navigate([environment.app.loginRoute], { queryParams: { returnUrl } });
      return;
    }
    this.router.navigate([environment.app.loginRoute]);
  }

  clearSessionWithoutRedirect(): void {
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.authorizationService.reset();
    this.masterDataService.clearCache();
  }

  initializeAuthorizationOnStartup(): void {
    if (!this.isAuthenticated()) {
      return;
    }
    this.bootstrapAuthorization().subscribe({
      error: (err) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.clearSessionAndRedirectToLogin();
        }
      }
    });
  }

  /**
   * Logout user (like Laravel Auth::logout())
   */
  logout(): Observable<any> {
    const url = `${environment.api.baseUrl}/auth/logout`;
    
    return this.http.post(url, {}, {
      withCredentials: true  // Include cookies for logout
    })
      .pipe(
        tap(() => {
          this.clearSessionAndRedirectToLogin();
        }),
        catchError((error) => {
          // Even if logout API fails, clear local data
          this.clearSessionAndRedirectToLogin();
          return throwError(error);
        })
      );
  }

  /**
   * Get current user (like Laravel Auth::user())
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated (like Laravel Auth::check())
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get the cookie key name used by server for authentication
   * This is the name Laravel uses for the httpOnly cookie
   */
  getTokenCookieName(): string {
    return environment.auth.tokenKey; // 'auth_token' from your environment
  }

  /**
   * Get stored token (cookie-based auth)
   * For cookie auth, we can't access httpOnly cookies directly from JS
   * But we can check if auth is available by checking user data
   * The actual token is sent automatically via cookie named 'auth_token' (or whatever your Laravel uses)
   */
  getToken(): string | null {
    // For cookie-based auth, return the token key name that server expects
    // This helps interceptor know which cookie name to work with
    return this.isAuthenticated() ? environment.auth.tokenKey : null;
  }

  /**
   * Refresh token (cookie-based)
   */
  refreshToken(): Observable<LoginResponse> {
    const url = `${environment.api.baseUrl}/auth/refresh`;

    return this.http.post<ApiResponse<LoginResponse>>(url, {}, {
      withCredentials: true
    }).pipe(
      map((response) => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Token refresh failed');
      }),
      tap((loginResponse) => {
        this.setAuthData(loginResponse);
      }),
      catchError((err: HttpErrorResponse | Error) => throwError(() => err))
    );
  }

  /**
   * Check authentication status on app initialization
   * For cookie-based auth, we check if user data exists in localStorage
   */
  private checkAuthStatus(): void {
    const userStr = localStorage.getItem('current_user');
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        this.initializeAuthorizationOnStartup();
      } catch (error) {
        this.clearSessionWithoutRedirect();
      }
    }
  }

  /**
   * Set authentication data after successful login
   */
  private setAuthData(loginResponse: LoginResponse): void { 
    // Store user data
    localStorage.setItem('current_user', JSON.stringify(loginResponse.user));
    
    // Update subjects
    this.currentUserSubject.next(loginResponse.user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication data (like Laravel Auth::logout())
   */
  private clearAuthData(): void {
    this.clearSessionAndRedirectToLogin();
  }

  /**
   * Handle unauthorized (401) - called by HTTP interceptor
   * Clears auth state without redirect (interceptor handles redirect)
   */
  public handleUnauthorized(): void {
    // Clear only the auth state, not localStorage yet
    // (the interceptor will clear all storage before calling this)
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.authorizationService.reset();
  }

  /**
   * Handle HTTP errors (like Laravel exception handling)
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side/Network error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Network connection failed. Please check your internet.';
          break;
        case 401:
          errorMessage = 'Invalid credentials. Please check your email and password.';
          this.clearAuthData();
          break;
        case 403:
          errorMessage = 'Access forbidden. You do not have permission.';
          break;
        case 404:
          errorMessage = 'Service not found. Please contact support.';
          break;
        case 422:
          // Laravel validation errors
          if (error.error.errors) {
            const validationErrors = error.error.errors;
            const firstError = Object.values(validationErrors)[0] as string[];
            errorMessage = firstError[0] || 'Please check your input fields.';
          } else {
            errorMessage = error.error.message || 'Please check your input fields.';
          }
          break;
        case 429:
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again in a few minutes.';
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || `Unexpected error occurred (${error.status})`;
      }
    }
    
    return throwError(errorMessage);
  };

  /**
   * Validates a password setup token
   */
  validateToken(token: string): Observable<ApiResponse<{valid: boolean, email: string}>> {
    return this.http.post<ApiResponse<{valid: boolean, email: string}>>(`${environment.api.baseUrl}/auth/validate-token`, { token });
  }

  /**
   * Sets password using magic link token
   */
  setPassword(token: string, password: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.api.baseUrl}/auth/set-password`, { token, password });
  }

  /**
   * Resends a password setup link
   */
  resendLink(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.api.baseUrl}/auth/resend-link`, { email });
  }
}
