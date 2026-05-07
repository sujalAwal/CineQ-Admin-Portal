/**
 * User Management Interfaces
 * These interfaces are used for CRUD operations on users
 */

import { User } from './auth.interface';

/**
 * Extended User interface for management operations
 */
export interface UserManagement extends User {
  phoneNumber?: string;
  isActive?: boolean;
}

/**
 * User List Item - Used in data table
 */
export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  /** All role names from API (order matches roleIds when present) */
  roleNames: string[];
  roleIds: string[];
  /** Badge text: first role or "First +N" when multiple */
  roleDisplay: string;
  isActive: boolean;
  passwordStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User Detail Response - Full user data from API
 */
export interface UserDetailResponse {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  roleNames: string[];
  roleIds: string[];
  isActive: boolean;
  passwordStatus?: string;
  emailVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User Registration Request
 */
export interface UserRegisterRequest {
  name: string;
  email: string;
  phoneNumber: string;
  roleIds: string[];
}

/**
 * User Update Request
 */
export interface UserUpdateRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  roleIds?: string[];
  isActive?: boolean;
}

/**
 * User Page Request - Pagination and filtering
 */
export interface UserPageRequest {
  page: number;
  size: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  roleId?: string;
  active?: boolean;
}

/**
 * Paginated User Response
 */
export interface PaginatedUserResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

/**
 * User API Response wrapper
 */
export interface UserApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

/**
 * Role option for dropdown (from master-data)
 */
export interface RoleOption {
  key: string;
  value: string;
}
