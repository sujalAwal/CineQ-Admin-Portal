import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import {
  Module,
  Role,
  RoleRequest,
  RoleResponse,
  RoleListItem,
  RoleDetailResponse,
  ApiResponse,
  PaginatedApiResponse,
  RolePageRequest
} from '../interfaces/role.interface';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly moduleUrl = `${environment.api.baseUrl}/modules`;
  private readonly roleUrl = `${environment.api.baseUrl}/v1/submit/role`;
  private readonly roleListUrl = `${environment.api.baseUrl}/v1/list/role`;
  private readonly roleViewUrl = `${environment.api.baseUrl}/v1/view/role`;

  // Cache for role list
  private roleCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  /**
   * Get roles list (for data table)
   */
  getRoles(request?: RolePageRequest): Observable<PaginatedApiResponse<RoleListItem>> {
    const cacheKey = this.buildCacheKey(request);
    
    // Check cache first
    const cached = this.roleCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return of(cached.data);
    }

    let httpParams = new HttpParams();
    
    if (request) {
      if (request.page) httpParams = httpParams.set('page', request.page.toString());
      if (request.size) httpParams = httpParams.set('size', request.size.toString());
      if (request.sortBy) httpParams = httpParams.set('sortBy', request.sortBy);
      if (request.sortDirection) httpParams = httpParams.set('sortDirection', request.sortDirection);
      if (request.search) httpParams = httpParams.set('search', request.search);
      if (request.active !== undefined) httpParams = httpParams.set('active', request.active.toString());
    }

    return this.http.get<PaginatedApiResponse<RoleListItem>>(this.roleListUrl, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response && response.success) {
          // Cache successful response
          this.roleCache.set(cacheKey, { data: response, timestamp: Date.now() });
          return response;
        }
        throw new Error(response?.message || 'Failed to fetch roles');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get role dropdown options (simple list with id and name)
   * Uses api/v1/list/role and extracts name field
   */
  getRoleOptions(): Observable<Array<{id: string, name: string}>> {
    return this.http.get<any>(this.roleListUrl, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response && response.success && Array.isArray(response.data)) {
          // Extract id and name from the nested formData structure
          return response.data.map((item: any) => ({
            id: item.id,
            name: item.formData?.name || item.name || 'Unnamed Role'
          }));
        }
        throw new Error(response?.message || 'Failed to fetch role options');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get role by ID (for view/edit)
   */
  getRoleById(id: string): Observable<RoleDetailResponse> {
    const url = `${this.roleViewUrl}/${id}`;
    return this.http.get<ApiResponse<any>>(url, { withCredentials: true }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const data = response.data;
          
          // Map the nested formData structure to RoleDetailResponse
          return {
            id: data.id,
            name: data.formData?.name || '',
            permissions: data.formData?.permissions || {},
            isActive: data.formData?.isActive ?? true,
            createdAt: data.formData?.createdAt ? new Date(data.formData.createdAt).toISOString() : '',
            updatedAt: data.formData?.updatedAt ? new Date(data.formData.updatedAt).toISOString() : ''
          } as RoleDetailResponse;
        }
        throw new Error(response?.message || 'Failed to fetch role details');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete role
   */
  deleteRole(id: string): Observable<boolean> {
    return this.submitRole({
      stepSlug: 'v1',
      action: 'delete',
      formData: {
        name: '', // Not needed for delete
        permissions: {},
        isActive: true
      }
    } as any).pipe(
      map(() => {
        this.invalidateCache();
        this.toastr.success('Role deleted successfully!', 'Success');
        return true;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Enable roles (bulk operation)
   */
  enableRoles(ids: string[]): Observable<boolean> {
    // Implement based on your API
    return of(true); // Placeholder
  }

  /**
   * Disable roles (bulk operation)
   */
  disableRoles(ids: string[]): Observable<boolean> {
    // Implement based on your API
    return of(true); // Placeholder
  }

  /**
   * Build cache key from request parameters
   */
  private buildCacheKey(request?: RolePageRequest): string {
    if (!request) return 'roles_default';
    
    const parts = [
      'roles',
      request.page || 1,
      request.size || 20,
      request.sortBy || 'name',
      request.sortDirection || 'asc',
      request.search || '',
      request.active !== undefined ? request.active : 'all'
    ];
    
    return parts.join('_');
  }

  /**
   * Invalidate cache on mutations
   */
  private invalidateCache() {
    this.roleCache.clear();
  }

  /**
   * Get modules (parent modules for permissions)
   */
  getModules(page: number = 1, size: number = 20, search: string = ''): Observable<PaginatedApiResponse<Module>> {
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) {
      httpParams = httpParams.set('search', search);
    }

    return this.http.get<PaginatedApiResponse<Module>>(this.moduleUrl, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response && response.success) {
          return response;
        }
        throw new Error(response?.message || 'Failed to fetch modules');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Submit role data (create/update)
   */
  submitRole(roleData: RoleRequest): Observable<RoleResponse> {
    return this.http.post<ApiResponse<RoleResponse>>(this.roleUrl, roleData, {
      withCredentials: true
    }).pipe(
      map(response => {
        // Success case
        if (response && response.success && response.data) {
          const successMsg = response.message || 'Role saved successfully!';
          this.toastr.success(successMsg, 'Success');
          this.invalidateCache(); // Invalidate cache after mutation
          return response.data;
        }
        
        // Handle success: false case (API returns error in 200 response)
        const errorMsg = response?.message || 'Failed to save role';
        this.toastr.error(errorMsg, 'Request Failed');
        throw new Error(errorMsg);
      }),
      catchError((error) => {
        // Only handle HTTP errors here, not thrown errors from map
        if (error instanceof HttpErrorResponse) {
          return this.handleError(error);
        }
        // If it's a thrown error from map (success: false), just propagate it
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse | any): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'Error';

    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Network error: ${error?.message}`;
        errorTitle = 'Network Error';
      } else {
        errorMessage = error?.error?.message ;
        switch (error.status) {
          case 0:
            errorMessage = '🔌 Internal Server Error.';
            errorTitle = 'Server Offline';
            break;

          case 401:
            errorMessage = '🔐 Authentication failed. Please login again.';
            errorTitle = 'Unauthorized';
            this.router.navigate([environment.app.loginRoute]);
            break;

          case 403:
            errorMessage = errorMessage || 'Access forbidden. You do not have permission to perform this action.';
            errorTitle = 'Access Denied';
            break;

          case 404:
            errorMessage = errorMessage || 'API endpoint not found. Please contact support if this persists.';
            errorTitle = 'Service Not Found';
            break;

          case 422:
            errorTitle =errorMessage ||  'Validation Error';
            // Prioritize API message first
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error && error.error.errors) {
              const validationErrors = error.error.errors;
              const firstError = Object.values(validationErrors)[0] as string[];
              errorMessage = firstError[0] || 'Please check your input fields.';
            } else {
              errorMessage = 'Please check your input fields and try again.';
            }
            break;

          case 429:
            errorMessage = errorMessage || 'Too many requests. Please wait a moment and try again.';
            errorTitle = 'Rate Limited';
            break;

          case 500:
            errorMessage = errorMessage || '🚨 Internal server error. The backend encountered an issue. Please try again in a few minutes.';
            errorTitle = 'Server Error';
            break;

          case 502:
            errorMessage = errorMessage || '🔗 Bad gateway. The server is temporarily unavailable.';
            errorTitle = 'Gateway Error';
            break;

          case 503:
            errorMessage = errorMessage || '⚠️ Service temporarily unavailable. Please try again later.';
            errorTitle = 'Service Unavailable';
            break;

          case 504:
            errorMessage = errorMessage || '⏰ Gateway timeout. The server took too long to respond.';
            errorTitle = 'Timeout';
            break;

          default:
            // Prioritize API message first (for all status codes)
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
              errorTitle = error.error.success === false ? 'Request Failed' : 'Error';
            } else {
              errorMessage = `Unexpected error occurred (HTTP ${error.status})`;
              errorTitle = `HTTP ${error.status} Error`;
            }
        }
      }
    } else {
      if (error.name === 'TimeoutError') {
        errorMessage = '⏰ Request timed out. Please try again.';
        errorTitle = 'Timeout';
      } else if (error.message) {
        errorMessage = error.message;
        errorTitle = 'Error';
      }
    }

    this.toastr.error(errorMessage, errorTitle, {
      timeOut: 8000,
      extendedTimeOut: 2000,
      progressBar: true
    });

    return throwError(() => new Error(errorMessage));
  };
}
