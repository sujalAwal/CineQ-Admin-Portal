import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, timeout, retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { 
  Genre, 
  GenreResponse,
  ApiResponse,
  GenreRequest
} from '../interfaces/genre.interface';

@Injectable({
  providedIn: 'root'
})
export class GenreService {
  private currentGenreSubject = new BehaviorSubject<Genre | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  private readonly url = `${environment.api.baseUrl}/genre`;

  // Public observables (like Laravel's Auth::user())
  public currentGenre$ = this.currentGenreSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {
    
  }

  /**
   * Fetch all genres with basic error handling
   */
  getGenres(): Observable<Genre[]> {
    return this.http.get<ApiResponse<Genre[]>>(this.url, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to fetch genres');
        }),

        catchError(error => this.handleError(error))
      );
  }

  /**
   * Store genre with simplified error handling
   */
  storeGenre(genre: GenreRequest): Observable<GenreResponse> {

    let url = '';
    if(genre?.id){
       url = `${this.url}/${genre.id}`;
    }else{
     url = `${this.url}`;

    }
    console.log('Storing genre to URL:', url, 'with data:', genre);
    
    return this.http.post<ApiResponse<GenreResponse>>(url, genre, {
      withCredentials: true

    })

      .pipe(
          tap(response => {
      console.log('📥 Got response:', response);
    }),
        map(response => {
          console.log('Genre response:', response);
          
          // ✅ SIMPLE: Just check success and return data
          if (response && response.success && response.data) {
            this.toastr.success('Genre saved successfully!', 'Success');
            return response.data;
          }
          
          // ✅ SIMPLE: Just throw error, let catchError handle it
          throw new Error(response?.message || 'Failed to save genre');
        }),
        catchError((error: any) => {
          console.log('🚨 CatchError triggered with:', error);
          console.log('🚨 Error type:', typeof error);
          console.log('🚨 Error status:', error.status);
          console.log('🚨 Error instanceof HttpErrorResponse:', error instanceof HttpErrorResponse);
          
          // ✅ SIMPLE: One place handles ALL errors
          return this.handleError(error);
        })
      );
  }

  /**
   * Get current genre (like Laravel Auth::user())
   */
  getCurrentGenre(): Genre | null {
    return this.currentGenreSubject.value;
  }

  deleteGenre(id: string): Observable<boolean> {
    const url = `${this.url}/${id}`;
    return this.http.delete<ApiResponse<boolean>>(url, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            this.toastr.success(response.message || 'Genre deleted successfully!', 'Success');
            return true;
          }
          throw new Error(response?.message || 'Failed to delete genre');
        }),
        catchError((error: any) => {
          console.log('🚨 CatchError triggered with:', error);
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
    
    console.error('API Error Details:12', error);
    
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