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
import { PaymentsService } from 'src/app/shared/services/payments.service';
import { DataTableComponent } from 'src/app/shared/components/data-table/data-table.component';
import { ToastService } from 'src/app/shared/services/toast.service';
import { TableConfig } from 'src/app/shared/interfaces/table.interface';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

interface Payment {
  id: string;
  paymentReference: string;
  bookingReference: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: any;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, DataTableComponent, ReactiveFormsModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsComponent implements OnInit, OnDestroy {
  private paymentsService = inject(PaymentsService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  data: Payment[] = [];
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

  tableConfig: TableConfig = {
    title: 'Payments',
    entityName: 'Payments',
    apiEndpoint: '/payments/list',
    columns: [
      { header: 'Payment Reference', field: 'paymentReference', type: 'text' as const },
      { header: 'Booking Reference', field: 'bookingReference', type: 'text' as const },
      { header: 'Amount', field: 'amount', type: 'currency' as const },
      { header: 'Payment Method', field: 'paymentMethod', type: 'text' as const },
      { header: 'Status', field: 'status', type: 'badge' as const },
      { header: 'Created At', field: 'createdAt', type: 'date' as const }
    ],
    actions: [
      { type: 'view' as const, label: 'View', icon: 'ti ti-eye' }
    ],
    searchable: true,
    paginated: true
  };

  ngOnInit(): void {
    this.initializeFilterForm();
    this.setupFilterListeners();
    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      paymentStatus: [''],
      paymentMethod: [''],
      paymentReference: [''],
      bookingReference: [''],
      fromDate: [''],
      toDate: ['']
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
        this.loadPayments();
      });
  }

  private loadPayments(): void {
    this.loading = true;
    const filters = this.buildFilterParams();

    this.paymentsService.getPayments(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data?.payments) {
            this.data = response.data.payments;
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
          this.toastService.error('Failed to load payments');
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
    if (formValue.paymentReference) {
      params.paymentReference = formValue.paymentReference;
    }
    if (formValue.bookingReference) {
      params.bookingReference = formValue.bookingReference;
    }

    // Add date range filters
    if (formValue.fromDate) {
      params.fromDate = formValue.fromDate;
    }
    if (formValue.toDate) {
      params.toDate = formValue.toDate;
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
    this.loadPayments();
  }

  onSearch(searchTerm: string): void {
    if (searchTerm.trim()) {
      this.filterForm.patchValue({ paymentReference: searchTerm });
    }
  }

  onPageChange(page: number): void {
    this.currentFilters.page = page;
    this.loadPayments();
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
    this.loadPayments();
  }
}

