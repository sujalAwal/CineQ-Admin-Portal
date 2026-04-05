import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PeopleService {

  private readonly baseUrl = `${environment.api.baseUrl}/v1`;
  private readonly SLUG = 'people';

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

    return this.http.get<any>(`${this.baseUrl}/list/${this.SLUG}`, { params: httpParams, withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            return response;
          }
          throw new Error(response?.message || 'Failed to fetch people');
        }),
        catchError(error => this.handleError(error))
      );
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/view/${this.SLUG}/${id}`, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to fetch person');
        }),
        catchError(error => this.handleError(error))
      );
  }

  save(personData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit/${this.SLUG}`, personData, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success && response.data) {
            return response.data;
          }
          throw new Error(response?.message || 'Failed to save person');
        }),
        catchError(error => this.handleError(error))
      );
  }

  delete(id: string): Observable<boolean> {
    return this.bulkDelete([id]);
  }

  enable(ids: string[]): Observable<boolean> {
    const request = {
      ids: ids,
      formSlug: this.SLUG,
      isActive: true
    };

    return this.http.patch<any>(`${this.baseUrl}/update-status`, request, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            return true;
          }
          throw new Error(response?.message || 'Failed to enable people');
        }),
        catchError(error => this.handleError(error))
      );
  }

  disable(ids: string[]): Observable<boolean> {
    const request = {
      ids: ids,
      formSlug: this.SLUG,
      isActive: false
    };

    return this.http.patch<any>(`${this.baseUrl}/update-status`, request, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            return true;
          }
          throw new Error(response?.message || 'Failed to disable people');
        }),
        catchError(error => this.handleError(error))
      );
  }

  bulkDelete(ids: string[]): Observable<boolean> {
    const request = {
      ids: ids,
      formSlug:  this.SLUG,
      collectionName: 'people'
    };

    return this.http.delete<any>(`${this.baseUrl}/delete`, { body: request, withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            return true;
          }
          throw new Error(response?.message || 'Failed to delete people');
        }),
        catchError(error => this.handleError(error))
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error(error?.error?.message || error?.message || 'An error occurred'));
  }
}
