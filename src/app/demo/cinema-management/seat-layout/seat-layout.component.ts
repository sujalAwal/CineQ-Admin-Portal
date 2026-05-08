import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SeatLayoutModalComponent } from '../../../shared/components/seat-layout-modal/seat-layout-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SeatLayoutService } from '../../../shared/services/seat-layout.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TableConfig, PaginationInfo, TableActionEvent, BulkSelectionEvent } from '../../../shared/interfaces/table.interface';
import { PaginatedApiResponse } from '../../../shared/interfaces/genre.interface';

@Component({
  selector: 'app-seat-layout',
  imports: [CommonModule, SharedModule, DataTableComponent, SeatLayoutModalComponent, ConfirmationModalComponent],
  templateUrl: './seat-layout.component.html',
  styleUrls: ['./seat-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeatLayoutComponent implements OnInit, OnDestroy {

  tableConfig: TableConfig = {
    title: 'Seat Layout Management',
    entityName: 'Seat Layout',
    apiEndpoint: '/api/v1/list/seat-layouts',
    searchable: true,
    paginated: true,
    pageSize: 20,
    sortable: true,
    bulkSelectable: true,
    bulkActions: [
      { label: 'Enable', icon: '', type: 'bulk-enable', class: 'btn-success' },
      { label: 'Disable', icon: '', type: 'bulk-disable', class: 'btn-warning' },
      { label: 'Delete', icon: '', type: 'bulk-delete', class: 'btn-danger' }
    ],
    columns: [
      { header: 'S.N', field: 'sn', type: 'sn', sortable: false, width: '60px', align: 'center' },
      { header: 'Layout Name', field: 'name', type: 'text', sortable: true, width: '200px' },
      { header: 'Type', field: 'isDefault', type: 'badge', sortable: false, width: '100px', align: 'center' },
      { header: 'Screen', field: 'screens.screenName', type: 'text', sortable: false, width: '150px' },
      { header: 'Status', field: 'isActive', type: 'toggle', width: '60px', align: 'center' }
    ],
    actions: [
      { label: 'Edit', icon: 'ti ti-edit', type: 'edit', class: 'btn-outline-success', visible: true },
      { label: 'Delete', icon: 'ti ti-trash', type: 'delete', class: 'btn-outline-danger', visible: true }
    ]
  };

  seatLayoutData: any[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: 20 };
  currentFilters: any = { page: 1, size: 20 };

  showModal: boolean = false;
  selectedItem: any = null;
  modalLoading: boolean = false;

  showConfirmationModal: boolean = false;
  confirmationConfig: ConfirmationConfig = {
    title: 'Confirm Delete',
    message: '',
    icon: 'ti ti-trash',
    iconColor: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'btn-danger'
  };
  itemToDelete: any = null;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  bulkOperation: { type: 'enable' | 'disable' | 'delete' | null; selectedIds: string[] } = {
    type: null,
    selectedIds: []
  };

  constructor(
    private service: SeatLayoutService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupDebouncedSearch();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDebouncedSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.currentFilters = { ...this.currentFilters, search: searchTerm || undefined, page: 1 };
      this.loadData();
    });
  }

  loadData(additionalFilters?: Partial<any>): void {
    this.loading = true;
    this.cdr.markForCheck();

    const requestParams = { ...this.currentFilters, ...additionalFilters };

    this.service.getList(requestParams).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: PaginatedApiResponse<any>) => {
        const raw = response.data;
        this.seatLayoutData = Array.isArray(raw)
          ? raw.flatMap((item: any) => {
              const records = item['seat-layouts'] || item['seat-layout'] || item['seatLayouts'] || [];
              if (Array.isArray(records)) return records;
              return item.id ? [item] : [];
            })
          : [];

        // Flatten isDefault to a display-friendly badge value
        this.seatLayoutData = this.seatLayoutData.map(item => ({
          ...item,
          isDefault: item.isDefault,
          screenName: item.screenId ? (item.screenName || item.screenId) : '—'
        }));

        this.pagination = {
          currentPage: response.page,
          totalPages: response.totalPages,
          totalItems: response.totalElements,
          pageSize: response.size
        };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load seat layouts:', error);
        this.seatLayoutData = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onTableAction(event: TableActionEvent): void {
    switch (event.action) {
      case 'edit': this.editItem(event.item); break;
      case 'delete': this.deleteItem(event.item); break;
    }
  }

  onSearch(searchTerm: string): void { this.searchSubject.next(searchTerm); }

  onRefresh(): void {
    this.currentFilters = { page: 1, size: this.currentFilters.size || 20 };
    this.loadData();
  }

  onPageChange(page: number): void {
    this.currentFilters.page = page;
    this.loadData();
  }

  onSort(sortInfo: { field: string, order: 'asc' | 'desc' }): void {
    this.currentFilters = { ...this.currentFilters, sortBy: sortInfo.field, sortDirection: sortInfo.order, page: 1 };
    this.loadData();
  }

  onToggleChange(event: { item: any, field: string, value: boolean }): void {
    this.updateInList(event.item.id, { isActive: event.value });
    this.cdr.markForCheck();

    const operation = event.value ? this.service.enable.bind(this.service) : this.service.disable.bind(this.service);
    operation([event.item.id]).pipe(takeUntil(this.destroy$)).subscribe({
      next: (success) => {
        if (success) {
          const message = event.value ? `"${event.item.name}" is now active.` : `"${event.item.name}" has been deactivated.`;
          event.value ? this.toastService.activated(message, 'Activated') : this.toastService.inactive(message, 'Deactivated');
        } else {
          this.revertToggle(event.item.id, !event.value);
        }
      },
      error: () => this.revertToggle(event.item.id, !event.value)
    });
  }

  private updateInList(id: string, updates: Partial<any>): void {
    this.seatLayoutData = this.seatLayoutData.map(item => item.id === id ? { ...item, ...updates } : item);
  }

  private revertToggle(id: string, value: boolean): void {
    this.updateInList(id, { isActive: value });
    this.cdr.markForCheck();
  }

  onBulkAction(event: BulkSelectionEvent): void {
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one item.', 'No Selection');
      return;
    }

    this.bulkOperation.selectedIds = event.selectedIds;

    switch (event.action) {
      case 'bulk-enable':
        this.bulkOperation.type = 'enable';
        this.showBulkConfirmation('enable', event.selectedIds);
        break;
      case 'bulk-disable':
        this.bulkOperation.type = 'disable';
        this.showBulkConfirmation('disable', event.selectedIds);
        break;
      case 'bulk-delete':
        this.bulkOperation.type = 'delete';
        this.showBulkConfirmation('delete', event.selectedIds);
        break;
    }
  }

  private showBulkConfirmation(operation: 'enable' | 'disable' | 'delete', selectedIds: string[]): void {
    const count = selectedIds.length;
    if (operation === 'enable') {
      this.confirmationConfig = { title: 'Enable Items', message: `Are you sure you want to <strong>enable</strong> ${count} item(s)?`, icon: 'ti ti-toggle-right', iconColor: 'success', confirmText: 'Enable', cancelText: 'Cancel', confirmButtonClass: 'btn-success', loading: false, size: 'sm' };
    } else if (operation === 'disable') {
      this.confirmationConfig = { title: 'Disable Items', message: `Are you sure you want to <strong>disable</strong> ${count} item(s)?`, icon: 'ti ti-toggle-left', iconColor: 'warning', confirmText: 'Disable', cancelText: 'Cancel', confirmButtonClass: 'btn-warning', loading: false, size: 'sm' };
    } else {
      this.confirmationConfig = { title: 'Delete Items', message: `Are you sure you want to <strong>delete</strong> ${count} item(s)?<br><small class="text-danger">This action cannot be undone.</small>`, icon: 'ti ti-trash-x', iconColor: 'danger', confirmText: 'Delete', cancelText: 'Cancel', confirmButtonClass: 'btn-danger', loading: false, size: 'sm' };
    }
    this.showConfirmationModal = true;
  }

  openAddModal(): void {
    this.selectedItem = null;
    this.showModal = true;
    this.cdr.markForCheck();
  }

  private editItem(item: any): void {
    this.modalLoading = true;
    this.cdr.markForCheck();
    this.service.getById(item.id).subscribe({
      next: (fullItem) => {
        this.selectedItem = fullItem;
        this.modalLoading = false;
        this.showModal = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLoading = false;
        this.selectedItem = item;
        this.showModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  onModalClosed(): void { this.showModal = false; this.selectedItem = null; this.modalLoading = false; }

  onItemSaved(itemData: any): void {
    const msg = itemData.id ? `"${itemData.name}" has been updated successfully!` : `"${itemData.name}" has been created successfully!`;
    this.toastService.success(msg, itemData.id ? 'Updated' : 'Created');
    this.onModalClosed();
    this.loadData();
  }

  private deleteItem(item: any): void {
    this.itemToDelete = item;
    this.confirmationConfig = {
      title: 'Delete Seat Layout',
      message: `Are you sure you want to delete <strong>"${item.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x', iconColor: 'danger', confirmText: 'Delete', cancelText: 'Cancel', loading: false
    };
    this.showConfirmationModal = true;
  }

  onDeleteConfirmed(): void {
    if (this.itemToDelete) {
      this.confirmationConfig.loading = true;
      this.service.delete(this.itemToDelete.id).subscribe({
        next: () => {
          this.toastService.success(`"${this.itemToDelete!.name}" has been deleted.`, 'Deleted');
          this.loadData();
          this.showConfirmationModal = false;
          this.itemToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: () => {
          this.showConfirmationModal = false;
          this.itemToDelete = null;
          this.confirmationConfig.loading = false;
        }
      });
      return;
    }

    if (this.bulkOperation.type && this.bulkOperation.selectedIds.length > 0) {
      this.confirmationConfig.loading = true;
      const selectedIds = this.bulkOperation.selectedIds;
      const operation = this.bulkOperation.type;

      if (operation === 'enable') {
        this.service.enable(selectedIds).subscribe({ next: () => { this.toastService.activated(`${selectedIds.length} item(s) enabled.`, 'Enabled'); this.loadData(); this.resetBulkOperation(); }, error: () => this.resetBulkOperation() });
      } else if (operation === 'disable') {
        this.service.disable(selectedIds).subscribe({ next: () => { this.toastService.inactive(`${selectedIds.length} item(s) disabled.`, 'Disabled'); this.loadData(); this.resetBulkOperation(); }, error: () => this.resetBulkOperation() });
      } else if (operation === 'delete') {
        this.service.bulkDelete(selectedIds).subscribe({ next: () => { this.toastService.success(`${selectedIds.length} item(s) deleted.`, 'Deleted'); this.loadData(); this.resetBulkOperation(); }, error: () => this.resetBulkOperation() });
      }
    }
  }

  onDeleteCancelled(): void {
    this.showConfirmationModal = false;
    this.itemToDelete = null;
    this.confirmationConfig.loading = false;
    this.resetBulkOperation();
  }

  private resetBulkOperation(): void {
    this.bulkOperation = { type: null, selectedIds: [] };
    this.showConfirmationModal = false;
    this.confirmationConfig.loading = false;
  }
}
