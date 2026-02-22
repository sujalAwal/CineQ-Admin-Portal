import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ShowtimeStatusService {
  private readonly baseUrl = `${environment.api.baseUrl}/v1`;

  constructor(private http: HttpClient) {}

  getShowtimeStatuses(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.size) httpParams = httpParams.set('size', params.size.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }
    return this.http.get<any>(`${this.baseUrl}/list/showtime-status`, { params: httpParams, withCredentials: true })
      .pipe(map(r => r.success ? r : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  getShowtimeStatusById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/view/showtime-status/${id}`, { withCredentials: true })
      .pipe(map(r => r.success && r.data ? r.data : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  save(itemData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit/showtime-status`, itemData, { withCredentials: true })
      .pipe(map(r => r.success && r.data ? r.data : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  delete(id: string): Observable<boolean> {
    return this.http.post<any>(`${this.baseUrl}/submit/showtime-status`, { stepSlug: 'v1', action: 'DELETE', id, formData: {} }, { withCredentials: true })
      .pipe(map(r => r.success ? true : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  enable(ids: string[]): Observable<boolean> {
    return this.http.patch<any>(`${this.baseUrl}/update-status`, { documentIds: ids, isActive: true }, { withCredentials: true })
      .pipe(map(r => r.success ? true : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  disable(ids: string[]): Observable<boolean> {
    return this.http.patch<any>(`${this.baseUrl}/update-status`, { documentIds: ids, isActive: false }, { withCredentials: true })
      .pipe(map(r => r.success ? true : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  bulkDelete(ids: string[]): Observable<boolean> {
    return this.http.post<any>(`${this.baseUrl}/delete`, { documentIds: ids, collectionName: 'showtime_statuses' }, { withCredentials: true })
      .pipe(map(r => r.success ? true : (() => { throw new Error(r?.message || 'Failed'); })()),
        catchError(e => this.handleError(e)));
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error(error?.error?.message || error?.message || 'An error occurred'));
  }
}
