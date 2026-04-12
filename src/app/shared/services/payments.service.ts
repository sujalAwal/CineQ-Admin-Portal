import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly baseUrl = `${environment.api.baseUrl}/v1`;
  
  private paymentsSubject = new BehaviorSubject<any>({ payments: [], pagination: {} });
  payments$ = this.paymentsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getPayments(filters?: any): Observable<any> {
    const payload: any = {};

    // Add filter parameters to payload
    if (filters) {
      if (filters.paymentStatus) payload.paymentStatus = filters.paymentStatus;
      if (filters.paymentMethod) payload.paymentMethod = filters.paymentMethod;
      if (filters.paymentReference) payload.paymentReference = filters.paymentReference;
      if (filters.bookingReference) payload.bookingReference = filters.bookingReference;
      if (filters.fromDate) payload.fromDate = filters.fromDate;
      if (filters.toDate) payload.toDate = filters.toDate;
      if (filters.page !== undefined) payload.page = filters.page;
      if (filters.size !== undefined) payload.size = filters.size;
    }

    return this.http.post<any>(`${this.baseUrl}/payments/list`, payload, { withCredentials: true });
  }

  getPaymentById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/payments/${id}`, { withCredentials: true });
  }
}
