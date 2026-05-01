import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BookingsService } from 'src/app/shared/services/bookings.service';
import { DataTableComponent } from 'src/app/shared/components/data-table/data-table.component';
import { ToastService } from 'src/app/shared/services/toast.service';
import { TableConfig } from 'src/app/shared/interfaces/table.interface';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

interface Booking {
  id: string;
  bookingReference: string;
  customer: {
    name: string;
    email: string;
  };
  numberOfSeats: number;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  bookingDate: any;
}

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, DataTableComponent, ReactiveFormsModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingsComponent implements OnInit, OnDestroy {
  private bookingsService = inject(BookingsService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  data: Booking[] = [];
  loading = false;
  pagination = { currentPage: 0, totalPages: 0, totalItems: 0, pageSize: 10 };
  currentFilters = { page: 1, size: 10 };

  // Filter form
  filterForm!: FormGroup;
  showFilters = false;

  // Filter options
  paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'INITIATED', label: 'Initiated' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELED', label: 'Canceled' }
  ];

  paymentMethodOptions = [
    { value: '', label: 'All Payment Methods' },
    { value: 'KHALTI', label: 'Khalti' },
    { value: 'ESEWA', label: 'eSewa' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' }
  ];

  seatStatusOptions = [
    { value: '', label: 'All Seat Status' },
    { value: '1', label: 'Available' },
    { value: '2', label: 'Booked' },
    { value: '3', label: 'Reserved' },
    { value: '4', label: 'Blocked' }
  ];

  bookingStatusOptions = [
    { value: '', label: 'All Booking Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Completed', label: 'Completed' }
  ];

  tableConfig: TableConfig = {
    title: 'Bookings',
    entityName: 'Bookings',
    apiEndpoint: '/bookings/list',
    columns: [
      { header: 'S.N', field: 'sn', type: 'sn' as const, sortable: false, width: '60px', align: 'center' as const },
        { header: 'Customer Name', field: 'customer.name', type: 'text' as const },
      { header: 'Booking Ref', field: 'bookingReference', type: 'text' as const },
      { header: 'Customer Email', field: 'customer.email', type: 'email' as const },
      { header: 'Number of Seats', field: 'numberOfSeats', type: 'number' as const },
      { header: 'Total Amount', field: 'totalAmount', type: 'currency' as const },
      { header: 'Payment Status', field: 'paymentStatus', type: 'badge' as const },
      { header: 'Booking Status', field: 'status', type: 'badge' as const }
    ],
    actions: [
      { type: 'view' as const, label: 'View', icon: 'ti ti-eye', class: 'btn-outline-primary' }
    ],
    searchable: true,
    paginated: true
  };

  ngOnInit(): void {
    this.initializeFilterForm();
    this.setupFilterListeners();
    this.loadBookings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      paymentStatus: [''],
      paymentMethod: [''],
      seatStatusCode: [''],
      bookingReference: [''],
      customerId: [''],
      showtimeId: [''],
      fromDate: [''],
      toDate: [''],
      bookingStatus: ['']
    });
  }

  private setupFilterListeners(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentFilters = { page: 1, size: 10 };
        this.loadBookings();
      });
  }

  private loadBookings(): void {
    this.loading = true;
    const filters = this.buildFilterParams();

    this.bookingsService.getBookings(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data?.bookings) {
            this.data = response.data.bookings;
            this.pagination = {
              currentPage: response.data.page || 0,
              totalPages: response.data.totalPages || 0,
              totalItems: response.data.totalElements || 0,
              pageSize: response.data.size || 10
            };
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('Failed to load bookings');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private buildFilterParams(): any {
    const formValue = this.filterForm.value;
    const params: any = {
      page: this.currentFilters.page - 1,
      size: this.currentFilters.size
    };

    // Add payment filters
    if (formValue.paymentStatus) {
      params.paymentStatus = formValue.paymentStatus;
    }
    if (formValue.paymentMethod) {
      params.paymentMethod = formValue.paymentMethod;
    }

    // Add booking filters
    if (formValue.seatStatusCode) {
      params.seatStatusCode = parseInt(formValue.seatStatusCode);
    }
    if (formValue.bookingReference) {
      params.bookingReference = formValue.bookingReference;
    }
    if (formValue.customerId) {
      params.customerId = formValue.customerId;
    }
    if (formValue.showtimeId) {
      params.showtimeId = formValue.showtimeId;
    }

    // Add date range filters
    if (formValue.fromDate) {
      params.fromDate = formValue.fromDate;
    }
    if (formValue.toDate) {
      params.toDate = formValue.toDate;
    }

    // Add booking status filter
    if (formValue.bookingStatus) {
      params.bookingStatus = formValue.bookingStatus;
    }

    return params;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.currentFilters = { page: 1, size: 10 };
    this.loadBookings();
  }

  onSearch(searchTerm: string): void {
    if (searchTerm.trim()) {
      this.filterForm.patchValue({ bookingReference: searchTerm });
    }
  }

  onPageChange(page: number): void {
    this.currentFilters.page = page;
    this.loadBookings();
  }

  onActionClick(event: any): void {
    const { action, item } = event;
    switch (action) {
      case 'view':
        // Handle view action
        break;
    }
  }

  onRefresh(): void {
    this.loadBookings();
  }
}
