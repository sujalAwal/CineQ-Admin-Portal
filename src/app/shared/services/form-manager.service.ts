import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, share } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { 
  FormManager, 
  FormManagerResponse,
  ApiResponse,
  FormManagerRequest,
  PaginatedApiResponse,
  FormManagerPageRequest
} from '../interfaces/form-manager.interface';

@Injectable({
  providedIn: 'root'
})
export class FormManagerService {
  private currentFormManagerSubject = new BehaviorSubject<FormManager | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  private readonly url = `${environment.api.baseUrl}/form-manager`;

  // 🚀 Performance optimizations
  private formManagerCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private pendingRequests = new Map<string, Observable<any>>();

  // Public observables
  public currentFormManager$ = this.currentFormManagerSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  /**
   * 🚀 Optimized fetch with caching and request deduplication
   */
  getFormManagers(request?: FormManagerPageRequest): Observable<PaginatedApiResponse<FormManager>> {
    const cacheKey = this.buildCacheKey(request);
    
    // Check cache first
    const cached = this.formManagerCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return of(cached.data);
    }
    
    // Check for pending request to avoid duplicates
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
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

    const request$ = this.http.get<PaginatedApiResponse<FormManager>>(this.url, { 
      params: httpParams, 
      withCredentials: true 
    }).pipe(
      map(response => {
        if (response && response.success) {
          return response;
        }
        throw new Error(response?.message || 'Failed to fetch form managers');
      }),
      tap(response => {
        // Cache successful response
        this.formManagerCache.set(cacheKey, { data: response, timestamp: Date.now() });
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey);
      }),
      catchError(error => {
        // Remove from pending requests on error
        this.pendingRequests.delete(cacheKey);
        return this.handleError(error);
      }),
      share() // Share the observable among multiple subscribers
    );

    // Store pending request
    this.pendingRequests.set(cacheKey, request$);
    
    return request$;
  }

  /**
   * 🚀 Build cache key from request parameters
   */
  private buildCacheKey(request?: FormManagerPageRequest): string {
    if (!request) return 'form_managers_default';
    
    const parts = [
      'form_managers',
      request.page || 1,
      request.size || 20,
      request.sortBy || 'title',
      request.sortDirection || 'asc',
      request.search || '',
      request.active !== undefined ? request.active : 'all'
    ];
    
    return parts.join('_');
  }

  /**
   * 🚀 Invalidate cache on mutations
   */
  private invalidateCache() {
    this.formManagerCache.clear();
  }

  /**
   * 🚀 Optimized store with cache invalidation
   */
  storeFormManager(formManager: any): Observable<FormManagerResponse> {
    let url = '';
    let httpMethod: Observable<ApiResponse<FormManagerResponse>>;

    if(formManager?.id){
      // Update existing form manager - use PUT method
      url = `${this.url}/${formManager.id}`;
      httpMethod = this.http.put<ApiResponse<FormManagerResponse>>(url, formManager, {
        withCredentials: true,
        headers: { 'X-HTTP-Method-Override': 'PUT' ,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Create new form manager - use POST method
      url = `${this.url}`;
      httpMethod = this.http.post<ApiResponse<FormManagerResponse>>(url, formManager, {
        withCredentials: true
      });
    }

    return httpMethod.pipe(
      map(response => {
        if (response && response.success && response.data) {
          this.toastr.success('Form Manager saved successfully!', 'Success');
          // Invalidate cache after successful mutation
          this.invalidateCache();
          return response.data;
        }

        throw new Error(response?.message || 'Failed to save form manager');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }
  /**
   * Get form manager by ID
   */
  getFormManagerById(id: string): Observable<FormManager> {
    const url = `${this.url}/${id}`;
    return this.http.get<ApiResponse<FormManager>>(url, { withCredentials: true }).pipe(
      map(response => {
        if (response && response.success) {
          return response.data;
        }
        this.toastr.error(response?.message || 'Failed to fetch form manager');
        throw new Error(response?.message || 'Failed to fetch form manager');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current form manager
   */
  getCurrentFormManager(): FormManager | null {
    return this.currentFormManagerSubject.value;
  }

  deleteFormManager(id: string): Observable<boolean> {
    const url = `${this.url}/${id}`;
    return this.http.delete<ApiResponse<boolean>>(url, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            this.toastr.success(response.message || 'Form Manager deleted successfully!', 'Success');
            // Invalidate cache after successful deletion
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to delete form manager');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  enableFormManager(ids: string[]): Observable<boolean> {
    const url = `${this.url}/bulk-enable`;
    return this.http.post<ApiResponse<boolean>>(url, { ids }, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            // Invalidate cache after successful operation
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to enable form managers');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  disableFormManager(ids: string[]): Observable<boolean> {
    const url = `${this.url}/bulk-disable`;
    return this.http.post<ApiResponse<boolean>>(url, { ids }, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            // Invalidate cache after successful operation
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to disable form managers');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * Handle HTTP errors with comprehensive error scenarios
   */
  private handleError = (error: HttpErrorResponse | any): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'Error';
    
    console.error('API Error Details:', error);
    
    // Check if it's an HttpErrorResponse
    if (error instanceof HttpErrorResponse) {
      
      console.log('HTTP Error Status:', error.status);
      
      if (error.error instanceof ErrorEvent) {
        // Client-side/Network error (no internet, DNS issues, etc.)
        errorMessage = `Network error: ${error?.message}`;
        errorTitle = 'Network Error';
      } else {
        // Server-side error responses
        switch (error.status) {
          case 0:
            // Server is completely unreachable (server off, CORS, network issues)
            errorMessage = '🔌Internal Server Error.';
            errorTitle = 'Server Offline';
            break;
            
          case 401:
            errorMessage = '🔐 Authentication failed. Please login again.';
            errorTitle = 'Unauthorized';
            this.router.navigate([environment.app.loginRoute]);
            break;
            
          case 403:
            errorMessage = 'Access forbidden. You do not have permission to perform this action.';
            errorTitle = 'Access Denied';
            break;
            
          case 404:
            errorMessage = 'API endpoint not found. Please contact support if this persists.';
            errorTitle = 'Service Not Found';
            break;
            
          case 422:
            // Laravel validation errors
            errorTitle = 'Validation Error';
            if (error.error && error.error.errors) {
              const validationErrors = error.error.errors;
              const firstError = Object.values(validationErrors)[0] as string[];
              errorMessage = firstError[0] || 'Please check your input fields.';
            } else if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else {
              errorMessage = 'Please check your input fields and try again.';
            }
            break;
            
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            errorTitle = 'Rate Limited';
            break;
            
          case 500:
            errorMessage = '🚨 Internal server error. The backend encountered an issue. Please try again in a few minutes.';
            errorTitle = 'Server Error';
            break;
            
          case 502:
            errorMessage = '🔗 Bad gateway. The server is temporarily unavailable.';
            errorTitle = 'Gateway Error';
            break;
            
          case 503:
            errorMessage = '⚠️ Service temporarily unavailable. Please try again later.';
            errorTitle = 'Service Unavailable';
            break;
            
          case 504:
            errorMessage = '⏰ Gateway timeout. The server took too long to respond.';
            errorTitle = 'Timeout';
            break;
            
          default:
            errorMessage = error.error?.message || `Unexpected error occurred (HTTP ${error.status})`;
            errorTitle = `HTTP ${error.status} Error`;
        }
      }
    } else {
      // Handle non-HTTP errors (like thrown errors from map operator)
      if (error.name === 'TimeoutError') {
        errorMessage = '⏰ Request timed out. Please try again.';
        errorTitle = 'Timeout';
      } else if (error.message) {
        errorMessage = error.message;
        errorTitle = 'Error';
      }
    }
    
    // Show error toast
    this.toastr.error(errorMessage, errorTitle, {
      timeOut: 8000, // Show longer for server errors
      extendedTimeOut: 2000,
      progressBar: true
    });
    
    return throwError(() => new Error(errorMessage));
  };
}
