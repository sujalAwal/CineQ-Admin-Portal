import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../../environments/environment';
import { MasterDataResponse, Permission, RoleOptionData } from '../interfaces/role.interface';

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {
  private readonly STORAGE_KEY = 'cineq_master_data';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);
  public permissions$ = this.permissionsSubject.asObservable();

  private rolesSubject = new BehaviorSubject<RoleOptionData[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  private certificationsSubject = new BehaviorSubject<any[]>([]);
  public certifications$ = this.certificationsSubject.asObservable();

  private movieReleaseStatusesSubject = new BehaviorSubject<any[]>([]);
  public movieReleaseStatuses$ = this.movieReleaseStatusesSubject.asObservable();

  private readonly url = `${environment.api.baseUrl}/master-data`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    // Load permissions from localStorage on service initialization
    this.loadFromStorage();
  }

  /**
   * Fetch master data from API and cache it
   */
  fetchMasterData(): Observable<any> {
    return this.http.get<any>(this.url, { withCredentials: true }).pipe(
      tap(response => {
        if (response && response.success && response.data) {
          // Cache the data
          this.cacheData(response);
          // Update BehaviorSubjects
          this.permissionsSubject.next(response.data.permission || []);
          this.rolesSubject.next(response.data.role || []);
          this.certificationsSubject.next(response.data.certifications || []);
          this.movieReleaseStatusesSubject.next(response.data.movieReleaseStatuses || []);
        }
      }),
      catchError(error => {
        console.error('Failed to fetch master data:', error);
        this.toastr.error('Failed to load master data', 'Error');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get permissions from cache (synchronous)
   */
  getPermissions(): Permission[] {
    return this.permissionsSubject.value;
  }

  /**
   * Get permissions as Observable
   */
  getPermissions$(): Observable<Permission[]> {
    const cached = this.getFromStorage();
    if (cached && this.isCacheValid(cached.timestamp)) {
      return of(cached.data.permission);
    }
    
    // If cache is invalid or doesn't exist, fetch from API
    return this.fetchMasterData().pipe(
      map(response => response.data.permission)
    );
  }

  /**
   * Get roles from cache (synchronous)
   */
  getRoles(): RoleOptionData[] {
    return this.rolesSubject.value;
  }

  /**
   * Get roles as Observable
   */
  getRoles$(): Observable<RoleOptionData[]> {
    const cached = this.getFromStorage();
    if (cached && this.isCacheValid(cached.timestamp)) {
      return of(cached.data.role || []);
    }
    
    // If cache is invalid or doesn't exist, fetch from API
    return this.fetchMasterData().pipe(
      map(response => response.data.role || [])
    );
  }

  /**
   * Get certifications from cache (synchronous)
   */
  getCertifications(): any[] {
    return this.certificationsSubject.value;
  }

  /**
   * Get certifications as Observable
   */
  getCertifications$(): Observable<any[]> {
    const cached = this.getFromStorage();
    if (cached && this.isCacheValid(cached.timestamp)) {
      return of(cached.data.certifications || []);
    }
    
    // If cache is invalid or doesn't exist, fetch from API
    return this.fetchMasterData().pipe(
      map(response => response.data.certifications || [])
    );
  }

  /**
   * Get movie release statuses from cache (synchronous)
   */
  getMovieReleaseStatuses(): any[] {
    return this.movieReleaseStatusesSubject.value;
  }

  /**
   * Get movie release statuses as Observable
   */
  getMovieReleaseStatuses$(): Observable<any[]> {
    const cached = this.getFromStorage();
    if (cached && this.isCacheValid(cached.timestamp)) {
      return of(cached.data.movieReleaseStatuses || []);
    }
    
    // If cache is invalid or doesn't exist, fetch from API
    return this.fetchMasterData().pipe(
      map(response => response.data.movieReleaseStatuses || [])
    );
  }

  /**
   * Cache data to localStorage
   */
  private cacheData(response: any): void {
    const cacheData = {
      data: response.data,
      timestamp: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
  }

  /**
   * Get data from localStorage
   */
  private getFromStorage(): { data: any; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to parse cached master data:', error);
    }
    return null;
  }

  /**
   * Load permissions from localStorage
   */
  private loadFromStorage(): void {
    const cached = this.getFromStorage();
    if (cached && this.isCacheValid(cached.timestamp)) {
      this.permissionsSubject.next(cached.data.permission || []);
      this.rolesSubject.next(cached.data.role || []);
      this.certificationsSubject.next(cached.data.certifications || []);
      this.movieReleaseStatusesSubject.next(cached.data.movieReleaseStatuses || []);
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.CACHE_DURATION;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.permissionsSubject.next([]);
    this.rolesSubject.next([]);
    this.certificationsSubject.next([]);
    this.movieReleaseStatusesSubject.next([]);
  }

  /**
   * Refresh master data (force fetch from API)
   */
  refresh(): Observable<any> {
    this.clearCache();
    return this.fetchMasterData();
  }
}
