import { Inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  Setting,
  SettingResponse,
  SettingRequest,
  SettingPageRequest,
  SettingListResponse,
  SettingBulkStatusRequest,
  SettingBulkStatusResponse,
  SettingBulkDeleteRequest,
  SettingBulkDeleteResponse
} from '../interfaces/setting.interface';
import { PaginatedApiResponse } from '../interfaces/genre.interface';

/**
 * Configurable Setting Service — reusable for any settings formSlug.
 *
 * NOT provided in root. Each page component provides its own instance
 * via the `providers` array so the FORM_SLUG is scoped per module.
 *
 * Usage in a component:
 *   providers: [{ provide: SETTING_FORM_SLUG, useValue: 'backend-settings' }, SettingService]
 */

/** Injection token for the formSlug. Each page component supplies its own value. */
export const SETTING_FORM_SLUG = new InjectionToken<string>('SETTING_FORM_SLUG');

@Injectable() // NOT providedIn: 'root' — provided per-component
export class SettingService {
  // Form identifier — injected per module
  readonly FORM_SLUG: string;

  // API endpoints based on Universal Form System
  private readonly formSubmitUrl: string;
  private readonly listUrl: string;
  private readonly bulkStatusUrl: string;
  private readonly deleteUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(SETTING_FORM_SLUG) formSlug: string
  ) {
    this.FORM_SLUG = formSlug;
    this.formSubmitUrl = `${environment.api.baseUrl}/v1/submit/${this.FORM_SLUG}`;
    this.listUrl = `${environment.api.baseUrl}/v1/list/${this.FORM_SLUG}`;
    this.bulkStatusUrl = `${environment.api.baseUrl}/v1/update-status`;
    this.deleteUrl = `${environment.api.baseUrl}/v1/delete`;
  }

  /**
   * Get paginated list of settings
   */
  getSettings(request?: SettingPageRequest): Observable<PaginatedApiResponse<Setting>> {
    let httpParams = new HttpParams();

    if (request) {
      if (request.page) httpParams = httpParams.set('page', request.page.toString());
      if (request.size) httpParams = httpParams.set('size', request.size.toString());
      if (request.search) httpParams = httpParams.set('search', request.search);
    }

    return this.http
      .get<SettingListResponse>(this.listUrl, {
        params: httpParams,
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            // Extract and flatten from nested structure: { data: [{ "formSlug": [...] }] }
            const settings: Setting[] = (response.data || []).flatMap((item: any) => {
              const slug = this.FORM_SLUG;
              const records =
                item[slug] ||
                item[slug.replace(/-/g, '_')] ||
                item[slug.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())] ||
                [];
              if (Array.isArray(records)) return records;
              return item.id ? [item] : [];
            });

            const paginatedResponse: PaginatedApiResponse<Setting> = {
              success: response.success,
              message: response.message,
              data: settings,
              page: response.page,
              size: response.size,
              totalPages: response.totalPages,
              totalElements: response.totalElements,
              hasNext: response.hasNext,
              hasPrevious: response.hasPrevious
            };

            return paginatedResponse;
          }
          throw new Error(response?.message || 'Failed to fetch settings');
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Create or Update Setting
   */
  storeSetting(setting: SettingRequest): Observable<SettingResponse> {
    const isUpdate = !!setting.id;

    const requestPayload = {
      stepSlug: 'v1',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      formData: setting
    };

    return this.http
      .post<SettingResponse>(this.formSubmitUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            return response;
          }
          throw new Error(response?.message || 'Failed to save setting');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Get single setting by ID
   */
  getSettingById(id: string): Observable<Setting> {
    const viewUrl = `${environment.api.baseUrl}/v1/view/${this.FORM_SLUG}/${id}`;

    return this.http
      .get<SettingResponse>(viewUrl, { withCredentials: true })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to fetch setting');
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Delete single setting
   */
  deleteSetting(id: string): Observable<SettingBulkDeleteResponse> {
    return this.bulkDeleteSettings([id]);
  }

  /**
   * Bulk enable settings
   */
  enableSettings(ids: string[]): Observable<boolean> {
    const requestPayload: SettingBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: true
    };

    return this.http
      .patch<SettingBulkStatusResponse>(this.bulkStatusUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) return true;
          throw new Error(response?.message || 'Failed to enable settings');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Bulk disable settings
   */
  disableSettings(ids: string[]): Observable<boolean> {
    const requestPayload: SettingBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: false
    };

    return this.http
      .patch<SettingBulkStatusResponse>(this.bulkStatusUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) return true;
          throw new Error(response?.message || 'Failed to disable settings');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Bulk delete settings
   */
  bulkDeleteSettings(ids: string[]): Observable<SettingBulkDeleteResponse> {
    const requestPayload: SettingBulkDeleteRequest = {
      formSlug: this.FORM_SLUG,
      ids
    };

    return this.http
      .delete<SettingBulkDeleteResponse>(this.deleteUrl, {
        body: requestPayload,
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) return response;
          throw new Error(response?.message || 'Failed to delete settings');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Handle HTTP errors — returns Observable<never>.
   * Does NOT show toasts; components handle user-facing notifications.
   */
  private handleError = (error: HttpErrorResponse | any): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';

    console.error('API Error Details:', error);

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Your session has expired. Please log in again.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 409:
          errorMessage = error.error?.message || 'A conflict occurred. The resource may already exist.';
          break;
        case 422:
          errorMessage = error.error?.message || 'Validation failed. Please check your input.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || `HTTP Error: ${error.status}`;
      }
    } else {
      if (error.name === 'TimeoutError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
    }

    return throwError(() => new Error(errorMessage));
  };
}
