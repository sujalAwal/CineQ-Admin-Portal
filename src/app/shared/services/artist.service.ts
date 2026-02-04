import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, timeout, retry, share } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { 
  Artist, 
  ArtistResponse,
  ApiResponse,
  ArtistRequest,
  PaginatedApiResponse,
  ArtistPageRequest
} from '../interfaces/artist.interface';

@Injectable({
  providedIn: 'root'
})
export class ArtistService {
  private currentArtistSubject = new BehaviorSubject<Artist | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  private readonly url = `${environment.api.baseUrl}/artist`;

  // 🚀 Performance optimizations
  private artistCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private pendingRequests = new Map<string, Observable<any>>();

  // Public observables
  public currentArtist$ = this.currentArtistSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  /**
   * 🚀 Optimized fetch with caching and request deduplication
   */
  getArtists(request?: ArtistPageRequest): Observable<PaginatedApiResponse<Artist>> {
    const cacheKey = this.buildCacheKey(request);
    
    // Check cache first
    const cached = this.artistCache.get(cacheKey);
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
      if (request.artist_type_id) httpParams = httpParams.set('artist_type_id', request.artist_type_id);
    }

    const request$ = this.http.get<PaginatedApiResponse<Artist>>(this.url, { 
      params: httpParams, 
      withCredentials: true 
    }).pipe(
      map(response => {
        if (response && response.success) {
          return response;
        }
        throw new Error(response?.message || 'Failed to fetch artists');
      }),
      tap(response => {
        // Cache successful response
        this.artistCache.set(cacheKey, { data: response, timestamp: Date.now() });
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
  private buildCacheKey(request?: ArtistPageRequest): string {
    if (!request) return 'artists_default';
    
    const parts = [
      'artists',
      request.page || 1,
      request.size || 20,
      request.sortBy || 'full_name',
      request.sortDirection || 'asc',
      request.search || '',
      request.active !== undefined ? request.active : 'all',
      request.artist_type_id || ''
    ];
    
    return parts.join('_');
  }

  /**
   * 🚀 Optimized store with cache invalidation
   */
  storeArtist(artist: ArtistRequest): Observable<ArtistResponse> {
    let url = '';
    let httpMethod: Observable<ApiResponse<ArtistResponse>>;
    
    if(artist?.id){
      // Update existing artist - use PUT method
      url = `${this.url}/${artist.id}`;
      httpMethod = this.http.put<ApiResponse<ArtistResponse>>(url, artist, {
        withCredentials: true
      });
    } else {
      // Create new artist - use POST method
      url = `${this.url}`;
      httpMethod = this.http.post<ApiResponse<ArtistResponse>>(url, artist, {
        withCredentials: true
      });
    }
    
    return httpMethod.pipe(
      map(response => {
        if (response && response.success && response.data) {
          this.toastr.success('Artist saved successfully!', 'Success');
          // Invalidate cache after successful mutation
          this.invalidateCache();
          return response.data;
        }
        
        throw new Error(response?.message || 'Failed to save artist');
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current artist
   */
  getCurrentArtist(): Artist | null {
    return this.currentArtistSubject.value;
  }

  deleteArtist(id: string): Observable<boolean> {
    const url = `${this.url}/${id}`;
    return this.http.delete<ApiResponse<boolean>>(url, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            this.toastr.success(response.message || 'Artist deleted successfully!', 'Success');
            // Invalidate cache after successful deletion
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to delete artist');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  enableArtist(ids: string[]): Observable<boolean> {
    const url = `${this.url}/bulk-enable`;
    return this.http.post<ApiResponse<boolean>>(url, { ids }, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            // Invalidate cache after successful operation
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to enable artists');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  disableArtist(ids: string[]): Observable<boolean> {
    const url = `${this.url}/bulk-disable`;
    return this.http.post<ApiResponse<boolean>>(url, { ids }, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            // Invalidate cache after successful operation
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to disable artists');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * 🚀 Invalidate cache on mutations
   */
  private invalidateCache() {
    this.artistCache.clear();
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
      
      if (error.error instanceof ErrorEvent) {
        // Client-side/Network error
        errorMessage = `Network error: ${error?.message}`;
        errorTitle = 'Network Error';
      } else {
        // Server-side error responses
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
      // Handle non-HTTP errors
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