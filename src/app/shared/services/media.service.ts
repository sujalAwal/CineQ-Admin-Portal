import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, timeout, retry, share } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { 
  MediaFile, 
  MediaFolder,
  CreateFolderRequest,
  DeleteMediaRequest,
  UploadProgress
} from '../interfaces/media.interface';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private currentFolderSubject = new BehaviorSubject<MediaFolder | null>(null);
  private folderTreeSubject = new BehaviorSubject<MediaFolder[]>([]);

  private readonly url = `${environment.api.baseUrl}/media`;
  private readonly folderUrl = `${this.url}/folder`;  // New folder endpoint
  private readonly storageBaseUrl = environment.supabase.storageBaseUrl;

  // 🚀 Performance optimizations
  private mediaCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private pendingRequests = new Map<string, Observable<any>>();

  // Public observables
  public currentFolder$ = this.currentFolderSubject.asObservable();
  public folderTree$ = this.folderTreeSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService
  ) {}

  /**
   * Get full file URL with Supabase storage base URL
   */
  getFileUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    
    // If URL already contains the base URL, return as is
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    
    // If URL starts with '/', remove it and prepend base URL
    const cleanUrl = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
    return `${this.storageBaseUrl}/${cleanUrl}`;
  }

  /**
   * 🚀 Get files and folders in a parent folder - matches your API: GET /api/media?parentId=xxx
   */
  getMedia(parentId?: string): Observable<any> {
    let httpParams = new HttpParams();
    if (parentId) {
      httpParams = httpParams.set('parentId', parentId);
    }

    const request$ = this.http.get<any>(this.url, { 
      params: httpParams, 
      withCredentials: true 
    }).pipe(
      map((response: any) => {
        // Transform your API response to match component expectations
        if (response.success && response.data && response.data.media) {
          const files = response.data.media.filter((item: any) => item.type !== 'FOLDER').map((file: any) => ({
            ...file,
            url: this.getFileUrl(file.url) // Transform URL with Supabase base URL
          }));
          const folders = response.data.media.filter((item: any) => item.type === 'FOLDER');
          
          return {
            files: files,
            folders: folders,
            pagination: {
              page: 1,
              totalPages: 1,
              totalElements: response.data.totalCount,
              size: 20
            }
          };
        }
        return { files: [], folders: [], pagination: { page: 1, totalPages: 1, totalElements: 0, size: 20 } };
      }),
      catchError(error => {
        return this.handleError(error);
      })
    );

    return request$;
  }

  /**
   * 🚀 Create a new folder using the new folder endpoint
   */
  createFolder(request: CreateFolderRequest): Observable<any> {
    return this.http.post<any>(this.folderUrl, request, { 
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      map(response => {
        // Invalidate cache after successful operation
        this.invalidateCache();
        return response;
      }),
      catchError((error: any) => {
        return this.handleError(error);
      })
    );
  }

  /**
   * 🚀 Delete multiple media items - matches your API: POST /api/media/delete-multiple
   */
  deleteMultiple(request: DeleteMediaRequest): Observable<any> {
    const url = `${this.url}/delete-multiple`;
    
    return this.http.post<any>(url, request, { withCredentials: true })
      .pipe(
        map(response => {
          // Invalidate cache after successful operation
          this.invalidateCache();
          return response;
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * 🚀 Upload multiple files - matches your API: POST /api/media/upload-multiple
   */
  uploadMultiple(files: File[], parentId?: string | null): Observable<HttpEvent<any>> {
    const url = `${this.url}/upload-multiple`;
    
    const formData = new FormData();
    
    // Add files with 'files' key as required by API
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add parentId parameter (null for root directory)
    const parentIdValue = parentId || null;
    formData.append('parentId', parentIdValue || null);
    return this.http.post<any>(url, formData, {
      withCredentials: true,
      reportProgress: true,
      observe: 'events'
      // Content-Type will be handled by AuthInterceptor for FormData
    }).pipe(
      tap(event => {
        if (event.type === HttpEventType.Response) {
          this.invalidateCache();
        }
      }),
      catchError((error: any) => {
        console.error('❌ Upload failed:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get folder tree structure from the new folder endpoint
   */
  getFolderTree(): Observable<MediaFolder[]> {
    return this.http.get<any>(this.folderUrl, { withCredentials: true }).pipe(
      map(response => {
        if (response.success && response.data && response.data.media) {
          // Set expanded state based on folder level and process URLs
          const setExpandedState = (folders: MediaFolder[], isRootLevel: boolean = false): MediaFolder[] => {
            return folders.map(folder => ({
              ...folder,
              // Set expanded true only for root level folders (parentId is null)
              expanded: isRootLevel,
              children: folder.children ? setExpandedState(folder.children, false) : [],
              // Process files if they exist in the folder
              files: folder.files ? folder.files.map((file: any) => ({
                ...file,
                url: this.getFileUrl(file.url)
              })) : []
            }));
          };

          const processedFolders = setExpandedState(response.data.media, true);
          

          return processedFolders;
        }
        return [];
      }),
      tap(folders => {
        // Update the BehaviorSubject
        this.folderTreeSubject.next(folders);
      }),
      catchError(error => {
        console.error('Failed to load folder tree:', error);
        return of([]);
      })
    );
  }



  /**
   * 🚀 Get thumbnail URL for a file
   */
  getThumbnailUrl(fileId: string, size: 'small' | 'medium' | 'large' = 'small'): string {
    // This would depend on your backend implementation
    // For now, return a placeholder
    return `${this.url}/thumbnail/${fileId}?size=${size}`;
  }

  /**
   * 🚀 Get file download URL
   */
  getDownloadUrl(fileId: string): string {
    return `${this.url}/download/${fileId}`;
  }

  /**
   * 🚀 Build cache key for requests
   */
  private buildCacheKey(operation: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${operation}_${paramString}`;
  }

  /**
   * 🚀 Invalidate all cache entries
   */
  private invalidateCache(): void {
    this.mediaCache.clear();
  }

  /**
   * 🚀 Handle HTTP errors with comprehensive error scenarios
   */
  private handleError = (error: HttpErrorResponse | any): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'Error';
    
    console.error('Media API Error Details:', error);
    
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
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
            errorTitle = 'Connection Error';
            break;
          case 400:
            errorMessage = error.error?.message || 'Bad request. Please check your input.';
            errorTitle = 'Invalid Request';
            break;
          case 401:
            errorMessage = 'Your session has expired. Please log in again.';
            errorTitle = 'Authentication Required';
            // Redirect to login
            this.router.navigate(['/auth/login']);
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action.';
            errorTitle = 'Access Denied';
            break;
          case 404:
            errorMessage = 'The requested media was not found.';
            errorTitle = 'Not Found';
            break;
          case 409:
            errorMessage = error.error?.message || 'A conflict occurred. The media may already exist.';
            errorTitle = 'Conflict';
            break;
          case 413:
            errorMessage = 'File too large. Please choose a smaller file.';
            errorTitle = 'File Too Large';
            break;
          case 415:
            errorMessage = 'Unsupported file type. Please choose a different file.';
            errorTitle = 'Unsupported File Type';
            break;
          case 422:
            errorMessage = error.error?.message || 'Validation failed. Please check your input.';
            errorTitle = 'Validation Error';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            errorTitle = 'Rate Limited';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            errorTitle = 'Server Error';
            break;
          case 502:
            errorMessage = 'Bad gateway. The server is temporarily unavailable.';
            errorTitle = 'Service Unavailable';
            break;
          case 503:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            errorTitle = 'Service Unavailable';
            break;
          case 504:
            errorMessage = 'Request timeout. The server took too long to respond.';
            errorTitle = 'Timeout';
            break;
          default:
            errorMessage = error.error?.message || `HTTP Error ${error.status}: ${error.statusText}`;
            errorTitle = 'HTTP Error';
        }
      }
    } else {
      // Non-HTTP error (JavaScript error, timeout, etc.)
      errorMessage = error?.message || 'An unexpected error occurred';
      errorTitle = 'Error';
    }

    // Show error toast
    this.toastr.error(errorMessage, errorTitle, {
      timeOut: 5000,
      closeButton: true,
      progressBar: true
    });

    // Return observable that errors
    return throwError(() => new Error(errorMessage));
  };
}
