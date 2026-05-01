import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PaymentsService } from 'src/app/shared/services/payments.service';
import { DataTableComponent } from 'src/app/shared/components/data-table/data-table.component';
import { ToastService } from 'src/app/shared/services/toast.service';
import { TableConfig } from 'src/app/shared/interfaces/table.interface';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

interface Payment {
  id: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  gatewayTransactionId: string;
  paymentUrl: string;
  gatewayMetadata: Record<string, any>;
  createdAt: any;
  updatedAt: any;
  userDetails: {
    customerId: string;
    email: string;
    customerName?: string;
  };
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
  @ViewChild('metadataModal') metadataModal!: TemplateRef<any>;

  private paymentsService = inject(PaymentsService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private destroy$ = new Subject<void>();

  data: Payment[] = [];
  loading = false;
  pagination = { currentPage: 0, totalPages: 0, totalItems: 0, pageSize: 10 };
  currentFilters = { page: 0, size: 10 };

  // Modal properties
  selectedPayment: Payment | null = null;
  modalRef: NgbModalRef | null = null;

  // Filter form
  filterForm!: FormGroup;
  showFilters = false;

  // Filter options
  paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'INITIATED', label: 'Initiated' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  paymentMethodOptions = [
    { value: '', label: 'All Payment Methods' },
    { value: 'KHALTI', label: 'Khalti' },
    { value: 'ESEWA', label: 'eSewa' }
  ];

  sortByOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'paymentMethod', label: 'Payment Method' }
  ];

  sortDirectionOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' }
  ];

  tableConfig: TableConfig = {
    title: 'Payments',
    entityName: 'Payments',
    apiEndpoint: '/payments/list',
    columns: [
      { header: 'S.N', field: 'sn', type: 'sn' as const, sortable: false, width: '60px', align: 'center' as const },
      { header: 'Customer', field: 'userDetails.customerName', type: 'text' as const },
      { header: 'Payment ID', field: 'paymentId', type: 'text' as const },
      { header: 'Amount', field: 'amount', type: 'currency' as const },
      { header: 'Method', field: 'paymentMethod', type: 'text' as const },
      { header: 'Status', field: 'status', type: 'badge' as const },
      { header: 'Date', field: 'createdAt', type: 'date' as const }
    ],
    actions: [
      { type: 'view' as const, label: 'View Metadata', icon: 'ti ti-eye', class: 'btn-outline-primary' }
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
    if (this.modalRef) {
      this.modalRef.close();
    }
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      status: [''],
      paymentMethod: [''],
      customerId: [''],
      bookingId: [''],
      amountMin: [''],
      amountMax: [''],
      startDate: [''],
      endDate: [''],
      sortBy: ['updatedAt'],
      sortDirection: ['desc']
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
        this.currentFilters = { page: 0, size: 10 };
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
            // Add customer name to userDetails for display
            this.data = response.data.payments.map((payment: Payment) => ({
              ...payment,
              userDetails: {
                ...payment.userDetails
              }
            }));
            
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
      page: this.currentFilters.page,
      size: this.currentFilters.size
    };

    // Add payment filters
    if (formValue.status) {
      params.status = formValue.status;
    }
    if (formValue.paymentMethod) {
      params.paymentMethod = formValue.paymentMethod;
    }
    if (formValue.customerId) {
      params.customerId = formValue.customerId;
    }
    if (formValue.bookingId) {
      params.bookingId = formValue.bookingId;
    }

    // Add amount range filters
    if (formValue.amountMin) {
      params.amountMin = formValue.amountMin;
    }
    if (formValue.amountMax) {
      params.amountMax = formValue.amountMax;
    }

    // Add date range filters
    if (formValue.startDate) {
      params.startDate = formValue.startDate;
    }
    if (formValue.endDate) {
      params.endDate = formValue.endDate;
    }

    // Add sorting parameters
    if (formValue.sortBy) {
      params.sortBy = formValue.sortBy;
    }
    if (formValue.sortDirection) {
      params.sortDirection = formValue.sortDirection;
    }

    return params;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.currentFilters = { page: 0, size: 10 };
    this.loadPayments();
  }

  onSearch(searchTerm: string): void {
    if (searchTerm.trim()) {
      this.filterForm.patchValue({ paymentId: searchTerm });
    }
  }

  onPageChange(page: number): void {
    this.currentFilters.page = page;
    this.loadPayments();
  }

  onActionClick(event: any): void {
    const { action, item } = event;
    
    if (action === 'view') {
      this.viewGatewayMetadata(item);
    }
  }

  private viewGatewayMetadata(payment: Payment): void {
    this.selectedPayment = payment;
    this.modalRef = this.modalService.open(this.metadataModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.selectedPayment = null;
    }
  }

  onRefresh(): void {
    this.loadPayments();
  }
}

