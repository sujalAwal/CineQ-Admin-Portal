import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, share } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { 
  Banner, 
  BannerResponse,
  BannerRequest,
  BannerPageRequest,
  BannerFormSubmitRequest,
  BannerListResponse,
  BannerBulkStatusRequest,
  BannerBulkStatusResponse,
  BulkDeleteRequest,
  BulkDeleteResponse
} from '../interfaces/banner.interface';
import { 
  PaginatedApiResponse
} from '../interfaces/genre.interface';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  // Form identifier - used across all API calls
  private readonly FORM_SLUG = 'banner';
  
  private currentBannerSubject = new BehaviorSubject<Banner | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  // API endpoints based on documentation
  private readonly formSubmitUrl = `${environment.api.baseUrl}/v1/submit/${this.FORM_SLUG}`;
  private readonly listUrl = `${environment.api.baseUrl}/v1/list/${this.FORM_SLUG}`;
  private readonly bulkStatusUrl = `${environment.api.baseUrl}/v1/update-status`;
  private readonly deleteUrl = `${environment.api.baseUrl}/v1/delete`;

  // 🚀 Performance optimizations
  private bannerCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private pendingRequests = new Map<string, Observable<any>>();

  // Public observables
  public currentBanner$ = this.currentBannerSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {
    
  }

  /**
   * 🚀 Optimized fetch with caching and request deduplication
   * GET /api/v1/forms/list/banner?page=1&size=10
   */
  getBanners(request?: BannerPageRequest): Observable<PaginatedApiResponse<Banner>> {
    const cacheKey = this.buildCacheKey(request);
    
    // Check cache first
    const cached = this.bannerCache.get(cacheKey);
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
      if (request.search) httpParams = httpParams.set('search', request.search);
    }

    const request$ = this.http.get<BannerListResponse>(this.listUrl, { 
      params: httpParams, 
      withCredentials: true 
    }).pipe(
      map(response => {
        if (response && response.success) {
          // Extract banners from the nested structure: data[0].banner
          const banners = response.data?.[0]?.banner || [];
          
          // Transform to PaginatedApiResponse format for component compatibility
          const paginatedResponse: PaginatedApiResponse<Banner> = {
            success: response.success,
            message: response.message,
            data: banners,
            page: response.page,
            size: response.size,
            totalPages: response.totalPages,
            totalElements: response.totalElements,
            hasNext: response.hasNext,
            hasPrevious: response.hasPrevious
          };
          
          return paginatedResponse;
        }
        throw new Error(response?.message || 'Failed to fetch banners');
      }),
      tap(response => {
        // Cache successful response
        this.bannerCache.set(cacheKey, { data: response, timestamp: Date.now() });
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
  private buildCacheKey(request?: BannerPageRequest): string {
    if (!request) return 'banners_default';
    
    const parts = [
      'banners',
      request.page || 1,
      request.size || 20,
      request.search || ''
    ];
    
    return parts.join('_');
  }

  /**
   * 🚀 Invalidate cache on mutations
   */
  private invalidateCache() {
    this.bannerCache.clear();
  }

  /**
   * 🚀 Create or Update Banner using form submit API
   * POST /api/v1/forms/submit with action: CREATE or UPDATE
   */
  storeBanner(banner: BannerRequest): Observable<BannerResponse> {
    const isUpdate = !!banner.id;
    
    const requestPayload: BannerFormSubmitRequest = {
      // Include id at root level for updates (API requirement)
      ...(isUpdate && banner.id && { id: banner.id }),
      formSlug: this.FORM_SLUG,
      stepSlug: 'v1',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      formData: banner
    };
    
    return this.http.post<BannerResponse>(this.formSubmitUrl, requestPayload, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          const action = isUpdate ? 'updated' : 'created';
          this.toastr.success(`Banner ${action} successfully!`, 'Success');
          // Invalidate cache after successful mutation
          this.invalidateCache();
          return response;
        }
        
        throw new Error(response?.message || 'Failed to save banner');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Read a single banner by ID
   * GET /api/v1/view/banner/{id}
   */
  getBannerById(id: string): Observable<Banner> {
    const viewUrl = `${environment.api.baseUrl}/v1/view/${this.FORM_SLUG}/${id}`;
    
    return this.http.get<BannerResponse>(viewUrl, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        throw new Error(response?.message || 'Failed to fetch banner');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current banner
   */
  getCurrentBanner(): Banner | null {
    return this.currentBannerSubject.value;
  }

  /**
   * Delete banner (soft-delete) - single or bulk
   * DELETE /v1/delete
   */
  deleteBanner(id: string): Observable<BulkDeleteResponse> {
    return this.bulkDeleteBanners([id]);
  }

  /**
   * Bulk enable banners
   * PUT /api/v1/forms/bulk-status/banner
   */
  enableBanner(ids: string[]): Observable<boolean> {
    const requestPayload: BannerBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: true
    };
    
    return this.http.patch<BannerBulkStatusResponse>(this.bulkStatusUrl, requestPayload, { 
      withCredentials: true 
    }).pipe(
      map(response => {
        if (response && response.success) {
          // Invalidate cache after successful operation
          this.invalidateCache();
          return true;
        }
        throw new Error(response?.message || 'Failed to enable banners');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Bulk disable banners
   * PUT /api/v1/forms/bulk-status/banner
   */
  disableBanner(ids: string[]): Observable<boolean> {
    const requestPayload: BannerBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: false
    };
    
    return this.http.patch<BannerBulkStatusResponse>(this.bulkStatusUrl, requestPayload, { 
      withCredentials: true 
    }).pipe(
      map(response => {
        if (response && response.success) {
          // Invalidate cache after successful operation
          this.invalidateCache();
          return true;
        }
        throw new Error(response?.message || 'Failed to disable banners');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Bulk delete banners (soft-delete)
   * DELETE /v1/delete
   */
  bulkDeleteBanners(ids: string[]): Observable<BulkDeleteResponse> {
    const requestPayload: BulkDeleteRequest = {
      formSlug: this.FORM_SLUG,
      ids
    };
    
    return this.http.delete<BulkDeleteResponse>(this.deleteUrl, { 
      body: requestPayload,
      withCredentials: true 
    }).pipe(
      map(response => {
        if (response && response.success) {
          this.toastr.success(response.message || 'Banners deleted successfully!', 'Success');
          // Invalidate cache after successful deletion
          this.invalidateCache();
          return response;
        }
        throw new Error(response?.message || 'Failed to delete banners');
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

