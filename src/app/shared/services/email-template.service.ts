import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, share } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import {
  EmailTemplate,
  EmailTemplateResponse,
  EmailTemplateRequest,
  EmailTemplatePageRequest,
  EmailTemplateFormSubmitRequest,
  EmailTemplateListResponse,
  EmailTemplateBulkStatusRequest,
  EmailTemplateBulkStatusResponse,
  EmailTemplateBulkDeleteRequest,
  EmailTemplateBulkDeleteResponse
} from '../interfaces/email-template.interface';
import { PaginatedApiResponse } from '../interfaces/genre.interface';

@Injectable({
  providedIn: 'root'
})
export class EmailTemplateService {
  // Form identifier - used across all API calls
  private readonly FORM_SLUG = 'email-templates';

  // API endpoints based on Universal Form System
  private readonly formSubmitUrl = `${environment.api.baseUrl}/v1/submit/${this.FORM_SLUG}`;
  private readonly listUrl = `${environment.api.baseUrl}/v1/list/${this.FORM_SLUG}`;
  private readonly bulkStatusUrl = `${environment.api.baseUrl}/v1/update-status`;
  private readonly deleteUrl = `${environment.api.baseUrl}/v1/delete`;

  // Performance optimizations
  private templateCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private pendingRequests = new Map<string, Observable<any>>();

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  /**
   * Get paginated list of email templates
   * GET /v1/list/email-templates?page=1&size=10
   */
  getEmailTemplates(request?: EmailTemplatePageRequest): Observable<PaginatedApiResponse<EmailTemplate>> {
    const cacheKey = this.buildCacheKey(request);

    // Check cache first
    const cached = this.templateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
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

    const request$ = this.http
      .get<EmailTemplateListResponse>(this.listUrl, {
        params: httpParams,
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            // Extract templates - handle nested structure: data[0]['email-templates']
            let templates: EmailTemplate[] = [];
            
            if (Array.isArray(response.data) && response.data.length > 0) {
              const firstItem = response.data[0] as any;
              // Check for nested structure with hyphenated key: data[0]['email-templates']
              if (firstItem && 'email-templates' in firstItem) {
                const nestedTemplates = firstItem['email-templates'];
                templates = Array.isArray(nestedTemplates) ? nestedTemplates : [];
              } else if (firstItem?.emailTemplate) {
                // Also check camelCase version: data[0].emailTemplate
                templates = Array.isArray(firstItem.emailTemplate) ? firstItem.emailTemplate : [];
              } else if (firstItem?.id) {
                // Flat structure: data is directly the array of templates
                templates = response.data as unknown as EmailTemplate[];
              }
            }

            // Transform to PaginatedApiResponse format
            const paginatedResponse: PaginatedApiResponse<EmailTemplate> = {
              success: response.success,
              message: response.message,
              data: templates,
              page: response.page,
              size: response.size,
              totalPages: response.totalPages,
              totalElements: response.totalElements,
              hasNext: response.hasNext,
              hasPrevious: response.hasPrevious
            };

            return paginatedResponse;
          }
          throw new Error(response?.message || 'Failed to fetch email templates');
        }),
        tap((response) => {
          // Cache successful response
          this.templateCache.set(cacheKey, { data: response, timestamp: Date.now() });
          // Remove from pending requests
          this.pendingRequests.delete(cacheKey);
        }),
        catchError((error) => {
          this.pendingRequests.delete(cacheKey);
          return this.handleError(error);
        }),
        share()
      );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  /**
   * Build cache key from request parameters
   */
  private buildCacheKey(request?: EmailTemplatePageRequest): string {
    if (!request) return 'email_templates_default';
    return ['email_templates', request.page || 1, request.size || 20, request.search || ''].join('_');
  }

  /**
   * Invalidate cache on mutations
   */
  private invalidateCache() {
    this.templateCache.clear();
  }

  /**
   * Create or Update Email Template
   * POST /v1/submit/email-templates with action: CREATE or UPDATE
   */
  storeEmailTemplate(template: EmailTemplateRequest): Observable<EmailTemplateResponse> {
    const isUpdate = !!template.id;

    const requestPayload: EmailTemplateFormSubmitRequest = {
      ...(isUpdate && template.id && { id: template.id }),
      formSlug: this.FORM_SLUG,
      stepSlug: 'v1',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      formData: template
    };

    return this.http
      .post<EmailTemplateResponse>(this.formSubmitUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            this.invalidateCache();
            return response;
          }
          throw new Error(response?.message || 'Failed to save email template');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * Get single email template by ID
   * GET /v1/view/email-templates/{id}
   */
  getEmailTemplateById(id: string): Observable<EmailTemplate> {
    const viewUrl = `${environment.api.baseUrl}/v1/view/${this.FORM_SLUG}/${id}`;

    return this.http
      .get<EmailTemplateResponse>(viewUrl, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to fetch email template');
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Delete single email template
   */
  deleteEmailTemplate(id: string): Observable<EmailTemplateBulkDeleteResponse> {
    return this.bulkDeleteEmailTemplates([id]);
  }

  /**
   * Bulk enable email templates
   * PATCH /v1/update-status
   */
  enableEmailTemplate(ids: string[]): Observable<boolean> {
    const requestPayload: EmailTemplateBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: true
    };

    return this.http
      .patch<EmailTemplateBulkStatusResponse>(this.bulkStatusUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to enable email templates');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * Bulk disable email templates
   * PATCH /v1/update-status
   */
  disableEmailTemplate(ids: string[]): Observable<boolean> {
    const requestPayload: EmailTemplateBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: false
    };

    return this.http
      .patch<EmailTemplateBulkStatusResponse>(this.bulkStatusUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            this.invalidateCache();
            return true;
          }
          throw new Error(response?.message || 'Failed to disable email templates');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * Bulk delete email templates
   * DELETE /v1/delete
   */
  bulkDeleteEmailTemplates(ids: string[]): Observable<EmailTemplateBulkDeleteResponse> {
    const requestPayload: EmailTemplateBulkDeleteRequest = {
      formSlug: this.FORM_SLUG,
      ids
    };

    return this.http
      .delete<EmailTemplateBulkDeleteResponse>(this.deleteUrl, {
        body: requestPayload,
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            this.invalidateCache();
            return response;
          }
          throw new Error(response?.message || 'Failed to delete email templates');
        }),
        catchError((error: any) => {
          return this.handleError(error);
        })
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse | any): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'Error';

    console.error('API Error Details:', error);

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
          errorTitle = 'Connection Error';
          break;
        case 400:
          errorMessage = error.error?.message || 'Invalid request. Please check your input.';
          errorTitle = 'Bad Request';
          break;
        case 401:
          errorMessage = 'Your session has expired. Please log in again.';
          errorTitle = 'Unauthorized';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          errorTitle = 'Forbidden';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          errorTitle = 'Not Found';
          break;
        case 409:
          errorMessage = error.error?.message || 'A conflict occurred. The resource may already exist.';
          errorTitle = 'Conflict';
          break;
        case 422:
          errorMessage = error.error?.message || 'Validation failed. Please check your input.';
          errorTitle = 'Validation Error';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          errorTitle = 'Server Error';
          break;
        default:
          errorMessage = error.error?.message || `HTTP Error: ${error.status}`;
          errorTitle = 'Error';
      }
    } else {
      if (error.name === 'TimeoutError') {
        errorMessage = 'Request timed out. Please try again.';
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
