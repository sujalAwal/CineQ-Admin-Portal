import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly baseUrl = `${environment.api.baseUrl}`;
  
  private paymentsSubject = new BehaviorSubject<any>({ payments: [], pagination: {} });
  payments$ = this.paymentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get payments with filters using GET method with query parameters
   * Supports: status, paymentMethod, customerId, bookingId, amountMin, amountMax, startDate, endDate, page, size, sortBy, sortDirection
   */
  getPayments(filters?: any): Observable<any> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.paymentMethod) params = params.set('paymentMethod', filters.paymentMethod);
      if (filters.customerId) params = params.set('customerId', filters.customerId);
      if (filters.bookingId) params = params.set('bookingId', filters.bookingId);
      if (filters.amountMin !== undefined && filters.amountMin !== '') {
        params = params.set('amountMin', filters.amountMin);
      }
      if (filters.amountMax !== undefined && filters.amountMax !== '') {
        params = params.set('amountMax', filters.amountMax);
      }
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.page !== undefined) params = params.set('page', filters.page);
      if (filters.size !== undefined) params = params.set('size', filters.size);
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.sortDirection) params = params.set('sortDirection', filters.sortDirection);
    }

    return this.http.get<any>(`${this.baseUrl}/payments/list`, { params, withCredentials: true });
  }

  /**
   * Get single payment details by ID
   */
  getPaymentById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/payments/${id}`, { withCredentials: true });
  }
}
