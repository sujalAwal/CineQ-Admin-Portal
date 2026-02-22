import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CrewRolesService {

  private readonly baseUrl = `${environment.api.baseUrl}/v1`;

  constructor(private http: HttpClient) {}

  getList(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.size) httpParams = httpParams.set('size', params.size.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }

    return this.http.get<any>(`${this.baseUrl}/list/crew-roles`, { params: httpParams, withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) return response;
          throw new Error(response?.message || 'Failed to fetch data');
        }),
        catchError(error => this.handleError(error))
      );
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/view/crew-roles/${id}`, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success && response.data) return response.data;
          throw new Error(response?.message || 'Failed to fetch data');
        }),
        catchError(error => this.handleError(error))
      );
  }

  save(itemData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit/crew-roles`, itemData, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success && response.data) return response.data;
          throw new Error(response?.message || 'Failed to save');
        }),
        catchError(error => this.handleError(error))
      );
  }

  delete(id: string): Observable<boolean> {
    const deleteRequest = {
      stepSlug: 'v1',
      action: 'DELETE',
      id: id,
      formData: {}
    };

    return this.http.post<any>(`${this.baseUrl}/submit/crew-roles`, deleteRequest, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) return true;
          throw new Error(response?.message || 'Failed to delete');
        }),
        catchError(error => this.handleError(error))
      );
  }

  enable(ids: string[]): Observable<boolean> {
    const request = { documentIds: ids, isActive: true };
    return this.http.patch<any>(`${this.baseUrl}/update-status`, request, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) return true;
          throw new Error(response?.message || 'Failed to enable');
        }),
        catchError(error => this.handleError(error))
      );
  }

  disable(ids: string[]): Observable<boolean> {
    const request = { documentIds: ids, isActive: false };
    return this.http.patch<any>(`${this.baseUrl}/update-status`, request, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) return true;
          throw new Error(response?.message || 'Failed to disable');
        }),
        catchError(error => this.handleError(error))
      );
  }

  bulkDelete(ids: string[]): Observable<boolean> {
    const request = { documentIds: ids, collectionName: 'crew_roles' };
    return this.http.post<any>(`${this.baseUrl}/delete`, request, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) return true;
          throw new Error(response?.message || 'Failed to delete');
        }),
        catchError(error => this.handleError(error))
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error(error?.error?.message || error?.message || 'An error occurred'));
  }
}
