import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardApiResponse, DashboardStats } from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl = `${environment.api.baseUrl}/dashboard/stats`;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  public dashboardStats$ = this.dashboardStatsSubject.asObservable();

  private lastUpdated: number | null = null;
  private lastPeriod: number | null = null;

  constructor(private http: HttpClient) {}

  getDashboardStats(period: number = 7): Observable<DashboardStats> {
    const now = Date.now();
    const isCacheValid = this.lastUpdated && (now - this.lastUpdated) < this.CACHE_DURATION && this.lastPeriod === period;
    const cachedData = this.dashboardStatsSubject.getValue();

    if (isCacheValid && cachedData) {
      return of(cachedData);
    }

    return this.fetchDashboardStats(period);
  }

  refresh(period: number = 7): Observable<DashboardStats> {
    this.lastUpdated = null; // Invalidate cache
    this.lastPeriod = null;
    return this.fetchDashboardStats(period);
  }

  private fetchDashboardStats(period: number): Observable<DashboardStats> {
    return this.http.get<DashboardApiResponse>(this.baseUrl, {
      params: { period: period.toString() },
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.lastUpdated = Date.now();
          this.lastPeriod = period;
          this.dashboardStatsSubject.next(response.data);
          return response.data;
        }
        throw new Error('Failed to load dashboard stats');
      }),
      catchError(err => {
        this.dashboardStatsSubject.next(null); // Clear data on error
        return throwError(() => err);
      })
    );
  }
}
