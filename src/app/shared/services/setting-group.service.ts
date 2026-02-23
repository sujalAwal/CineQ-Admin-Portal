import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  SettingGroup,
  SettingGroupResponse,
  SettingGroupRequest,
  SettingGroupPageRequest,
  SettingGroupListResponse,
  SettingGroupBulkStatusRequest,
  SettingGroupBulkStatusResponse,
  SettingGroupBulkDeleteRequest,
  SettingGroupBulkDeleteResponse
} from '../interfaces/setting-group.interface';
import { PaginatedApiResponse } from '../interfaces/genre.interface';

@Injectable({
  providedIn: 'root'
})
export class SettingGroupService {
  // Form identifier — single source of truth used across all API calls
  readonly FORM_SLUG = 'settings-groups';

  // API endpoints based on Universal Form System
  private readonly formSubmitUrl = `${environment.api.baseUrl}/v1/submit/${this.FORM_SLUG}`;
  private readonly listUrl = `${environment.api.baseUrl}/v1/list/${this.FORM_SLUG}`;
  private readonly bulkStatusUrl = `${environment.api.baseUrl}/v1/update-status`;
  private readonly deleteUrl = `${environment.api.baseUrl}/v1/delete`;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of setting groups
   * GET /v1/list/{FORM_SLUG}?page=1&size=10
   */
  getSettingGroups(request?: SettingGroupPageRequest): Observable<PaginatedApiResponse<SettingGroup>> {
    let httpParams = new HttpParams();

    if (request) {
      if (request.page) httpParams = httpParams.set('page', request.page.toString());
      if (request.size) httpParams = httpParams.set('size', request.size.toString());
      if (request.search) httpParams = httpParams.set('search', request.search);
    }

    return this.http
      .get<SettingGroupListResponse>(this.listUrl, {
        params: httpParams,
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            // Extract and flatten from nested structure: { data: [{ "formSlug": [...] }] }
            const settingGroups: SettingGroup[] = (response.data || []).flatMap((item: any) => {
              const records = item[this.FORM_SLUG] || item['settings_groups'] || item['settingsGroups'] || [];
              if (Array.isArray(records)) return records;
              // Fallback: if item has 'id', it's already a flat record
              return item.id ? [item] : [];
            });

            // Transform to PaginatedApiResponse format
            const paginatedResponse: PaginatedApiResponse<SettingGroup> = {
              success: response.success,
              message: response.message,
              data: settingGroups,
              page: response.page,
              size: response.size,
              totalPages: response.totalPages,
              totalElements: response.totalElements,
              hasNext: response.hasNext,
              hasPrevious: response.hasPrevious
            };

            return paginatedResponse;
          }
          throw new Error(response?.message || 'Failed to fetch setting groups');
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Create or Update Setting Group
   * POST /v1/submit/{FORM_SLUG} with action: CREATE or UPDATE
   */
  storeSettingGroup(settingGroup: SettingGroupRequest): Observable<SettingGroupResponse> {
    const isUpdate = !!settingGroup.id;

    const requestPayload = {
      stepSlug: 'v1',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      formData: settingGroup
    };

    return this.http
      .post<SettingGroupResponse>(this.formSubmitUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            return response;
          }
          throw new Error(response?.message || 'Failed to save setting group');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Get single setting group by ID
   * GET /v1/view/{FORM_SLUG}/{id}
   */
  getSettingGroupById(id: string): Observable<SettingGroup> {
    const viewUrl = `${environment.api.baseUrl}/v1/view/${this.FORM_SLUG}/${id}`;

    return this.http
      .get<SettingGroupResponse>(viewUrl, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to fetch setting group');
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Delete single setting group
   */
  deleteSettingGroup(id: string): Observable<SettingGroupBulkDeleteResponse> {
    return this.bulkDeleteSettingGroups([id]);
  }

  /**
   * Bulk enable setting groups
   * PATCH /v1/update-status
   */
  enableSettingGroup(ids: string[]): Observable<boolean> {
    const requestPayload: SettingGroupBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: true
    };

    return this.http
      .patch<SettingGroupBulkStatusResponse>(this.bulkStatusUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            return true;
          }
          throw new Error(response?.message || 'Failed to enable setting groups');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Bulk disable setting groups
   * PATCH /v1/update-status
   */
  disableSettingGroup(ids: string[]): Observable<boolean> {
    const requestPayload: SettingGroupBulkStatusRequest = {
      ids,
      formSlug: this.FORM_SLUG,
      isActive: false
    };

    return this.http
      .patch<SettingGroupBulkStatusResponse>(this.bulkStatusUrl, requestPayload, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            return true;
          }
          throw new Error(response?.message || 'Failed to disable setting groups');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Bulk delete setting groups
   * DELETE /v1/delete
   */
  bulkDeleteSettingGroups(ids: string[]): Observable<SettingGroupBulkDeleteResponse> {
    const requestPayload: SettingGroupBulkDeleteRequest = {
      formSlug: this.FORM_SLUG,
      ids
    };

    return this.http
      .delete<SettingGroupBulkDeleteResponse>(this.deleteUrl, {
        body: requestPayload,
        withCredentials: true
      })
      .pipe(
        map((response) => {
          if (response && response.success) {
            return response;
          }
          throw new Error(response?.message || 'Failed to delete setting groups');
        }),
        catchError((error: any) => this.handleError(error))
      );
  }

  /**
   * Handle HTTP errors — returns Observable<never> for piping.
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
