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

  constructor(private http: HttpClient) {}

  getPeople(params?: any): Observable<any> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.size) httpParams = httpParams.set('size', params.size.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    }

    return this.http.get<any>(`${this.baseUrl}/list/people`, { params: httpParams, withCredentials: true })
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

  getPersonById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/view/people/${id}`, { withCredentials: true })
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

  savePerson(personData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit/people`, personData, { withCredentials: true })
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

  deletePerson(id: string): Observable<boolean> {
    const deleteRequest = {
      stepSlug: 'v1',
      action: 'DELETE',
      id: id,
      formData: {}
    };

    return this.http.post<any>(`${this.baseUrl}/submit/people`, deleteRequest, { withCredentials: true })
      .pipe(
        map(response => {
          if (response && response.success) {
            return true;
          }
          throw new Error(response?.message || 'Failed to delete person');
        }),
        catchError(error => this.handleError(error))
      );
  }

  enablePerson(ids: string[]): Observable<boolean> {
    const request = {
      documentIds: ids,
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

  disablePerson(ids: string[]): Observable<boolean> {
    const request = {
      documentIds: ids,
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

  bulkDeletePeople(ids: string[]): Observable<boolean> {
    const request = {
      documentIds: ids,
      collectionName: 'people'
    };

    return this.http.post<any>(`${this.baseUrl}/delete`, request, { withCredentials: true })
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
