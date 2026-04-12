import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly baseUrl = `${environment.api.baseUrl}`;
  
  private bookingsSubject = new BehaviorSubject<any>({ bookings: [], pagination: {} });
  bookings$ = this.bookingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getBookings(filters?: any): Observable<any> {
    const payload: any = {};

    // Add filter parameters to payload
    if (filters) {
      if (filters.paymentStatus) payload.paymentStatus = filters.paymentStatus;
      if (filters.paymentMethod) payload.paymentMethod = filters.paymentMethod;
      if (filters.seatStatusCode) payload.seatStatusCode = filters.seatStatusCode;
      if (filters.bookingReference) payload.bookingReference = filters.bookingReference;
      if (filters.customerId) payload.customerId = filters.customerId;
      if (filters.showtimeId) payload.showtimeId = filters.showtimeId;
      if (filters.fromDate) payload.fromDate = filters.fromDate;
      if (filters.toDate) payload.toDate = filters.toDate;
      if (filters.bookingStatus) payload.bookingStatus = filters.bookingStatus;
      if (filters.page !== undefined) payload.page = filters.page;
      if (filters.size !== undefined) payload.size = filters.size;
    }

    return this.http.get<any>(`${this.baseUrl}/bookings/list`, { params: payload, withCredentials: true });
  }

  getBookingById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/bookings/${id}`, { withCredentials: true });
  }
}
