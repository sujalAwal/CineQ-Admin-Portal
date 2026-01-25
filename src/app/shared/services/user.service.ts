import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import {
  UserListItem,
  UserDetailResponse,
  UserRegisterRequest,
  UserUpdateRequest,
  UserPageRequest,
  PaginatedUserResponse,
  UserApiResponse
} from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly userUrl = `${environment.api.baseUrl}/user`;
  private readonly authUrl = `${environment.api.baseUrl}/auth`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  /**
   * Get paginated list of users
   * @param params Pagination and filter parameters
   */
  getUsers(params: UserPageRequest): Observable<PaginatedUserResponse<UserListItem>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.roleId) {
      httpParams = httpParams.set('roleId', params.roleId);
    }
    if (params.active !== undefined) {
      httpParams = httpParams.set('active', params.active.toString());
    }

    return this.http
      .get<PaginatedUserResponse<any>>(`${this.userUrl}`, {
        params: httpParams,
        withCredentials: true
      })
      .pipe(
        map(response => {
          // Map the response data to UserListItem format
          const mappedData = response.data.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber || user.phone_number || '',
            role: user.role?.name || user.roleName || 'USER',
            roleId: user.roleId || user.role?.id || '',
            isActive: user.isActive ?? user.is_active ?? true,
            createdAt: user.createdAt || user.created_at || '',
            updatedAt: user.updatedAt || user.updated_at || ''
          }));

          return {
            ...response,
            data: mappedData
          };
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get user by ID
   * @param userId User ID
   */
  getUserById(userId: string): Observable<UserDetailResponse> {
    return this.http
      .get<UserApiResponse<any>>(`${this.userUrl}/${userId}`, {
        withCredentials: true
      })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            const user = response.data;
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              phoneNumber: user.phoneNumber || user.phone_number || '',
              roleId: user.roleId || user.role?.id || '',
              role: user.role?.name || user.roleName || 'USER',
              isActive: user.isActive ?? user.is_active ?? true,
              emailVerifiedAt: user.emailVerifiedAt || user.email_verified_at || '',
              createdAt: user.createdAt || user.created_at || '',
              updatedAt: user.updatedAt || user.updated_at || ''
            };
          }
          throw new Error(response.message || 'Failed to fetch user details');
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Register a new user
   * @param userData User registration data
   */
  registerUser(userData: UserRegisterRequest): Observable<UserApiResponse> {
    return this.http
      .post<UserApiResponse>(`${this.authUrl}/register`, userData, {
        withCredentials: true
      })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastr.success(
              response.message || 'User registered successfully!',
              'Success'
            );
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Update an existing user
   * @param userId User ID
   * @param userData User update data
   */
  updateUser(userId: string, userData: Partial<UserUpdateRequest>): Observable<UserApiResponse> {
    return this.http
      .put<UserApiResponse>(`${this.userUrl}/${userId}`, userData, {
        withCredentials: true
      })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastr.success(
              response.message || 'User updated successfully!',
              'Success'
            );
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Delete a user (soft delete)
   * @param userId User ID
   */
  deleteUser(userId: string): Observable<boolean> {
    return this.http
      .delete<UserApiResponse>(`${this.userUrl}/${userId}`, {
        withCredentials: true
      })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastr.success(
              response.message || 'User deleted successfully!',
              'Success'
            );
            return true;
          }
          return false;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Bulk enable users
   * @param ids Array of user IDs
   */
  bulkEnableUsers(ids: string[]): Observable<UserApiResponse> {
    return this.http
      .post<UserApiResponse>(`${this.userUrl}/bulk-enable`, { ids }, {
        withCredentials: true
      })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastr.success(
              response.message || 'Users enabled successfully!',
              'Success'
            );
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Bulk disable users
   * @param ids Array of user IDs
   */
  bulkDisableUsers(ids: string[]): Observable<UserApiResponse> {
    return this.http
      .post<UserApiResponse>(`${this.userUrl}/bulk-disable`, { ids }, {
        withCredentials: true
      })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastr.success(
              response.message || 'Users disabled successfully!',
              'Success'
            );
          }
          return response;
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Toggle user active status (using bulk enable/disable)
   * @param userId User ID
   * @param isActive New status
   */
  toggleUserStatus(userId: string, isActive: boolean): Observable<UserApiResponse> {
    if (isActive) {
      return this.bulkEnableUsers([userId]);
    } else {
      return this.bulkDisableUsers([userId]);
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
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
        case 400:
          errorMessage = error.error?.message || 'Bad request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in again.';
          break;
        case 403:
          errorMessage = 'Access forbidden. You do not have permission.';
          break;
        case 404:
          errorMessage = 'User not found.';
          break;
        case 409:
          errorMessage = error.error?.message || 'User already exists.';
          break;
        case 422:
          // Validation errors
          if (error.error?.errors) {
            const validationErrors = error.error.errors;
            const firstError = Object.values(validationErrors)[0] as string[];
            errorMessage = firstError[0] || 'Please check your input fields.';
          } else {
            errorMessage = error.error?.message || 'Please check your input fields.';
          }
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || `Unexpected error occurred (${error.status})`;
      }
    }

    this.toastr.error(errorMessage, 'Error');
    return throwError(() => new Error(errorMessage));
  }
}
