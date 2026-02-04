import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { FormManagerModalComponent } from '../../../shared/components/form-manager-modal/form-manager-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { FormManager } from '../../../shared/interfaces/form-manager.interface';
import { 
  TableConfig, 
  TableColumn, 
  TableAction, 
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent,
  BulkAction 
} from '../../../shared/interfaces/table.interface';
import { FormManagerService } from 'src/app/shared/services/form-manager.service';
import { FormManagerPageRequest, PaginatedApiResponse } from '../../../shared/interfaces/form-manager.interface';

@Component({
  selector: 'app-form-managers',
  imports: [CommonModule, SharedModule, DataTableComponent, FormManagerModalComponent, ConfirmationModalComponent],
  templateUrl: './form-managers.component.html',
  styleUrls: ['./form-managers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormManagersComponent implements OnInit, OnDestroy {
  
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Form Managers',
    entityName: 'Form',
    apiEndpoint: '/api/form-manager',
    searchable: true,
    paginated: true,
    pageSize: 20,
    sortable: true,
    bulkSelectable: true,
    bulkActions: [
      {
        label: 'Enable',
        icon: '',
        type: 'bulk-enable',
        class: 'btn-success'
      },
      {
        label: 'Disable',
        icon: '',
        type: 'bulk-disable',
        class: 'btn-warning'
      }
    ],
    columns: [
      {
        header: 'S.N',
        field: 'sn',
        type: 'sn',
        sortable: false,
        width: '20px',
        align: 'center'
      },
      {
        header: 'Title',
        field: 'title',
        type: 'text',
        sortable: true,
        width: '200px'
      },
      {
        header: 'Slug',
        field: 'slug',
        type: 'text',
        sortable: true,
        width: '180px'
      },
      {
        header: 'Status',
        field: 'isActive',
        type: 'toggle',
        width: '60px',
        align: 'center'
      }
    ],
    actions: [
       {
        label: 'View',
        icon: 'ti ti-eye',
        type: 'view',
        class: 'btn-outline-success',
        visible: true
      },
      {
        label: 'Edit',
        icon: 'ti ti-edit',
        type: 'edit',
        class: 'btn-outline-success',
        visible: true
      },
      {
        label: 'Delete',
        icon: 'ti ti-trash',
        type: 'delete',
        class: 'btn-outline-danger',
        visible: true
      }
    ]
  };

  // Component state
  formManagersData: FormManager[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: FormManagerPageRequest = {
    page: 1,
    size: 20,
    sortBy: 'title',
    sortDirection: 'asc'
  };

  // Modal state
  showFormManagerModal: boolean = false;
  selectedFormManager: FormManager | null = null;
  modalLoading: boolean = false;

  // Confirmation modal state
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
  formManagerToDelete: FormManager | null = null;

  // Memory leak prevention
  private destroy$ = new Subject<void>();
  
  // Debounced search
  private searchSubject = new Subject<string>();

  private formManager: FormManager | null = null; 

  // Bulk operation state
  bulkOperation: {
    type: 'enable' | 'disable' | null;
    selectedIds: string[];
  } = {
    type: null,
    selectedIds: []
  };

  constructor(private toastService: ToastService,
              private formManagerService: FormManagerService,
              private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadFormManagers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup debounced search to reduce API calls
   */
  private setupDebouncedSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  /**
   * Optimized search with debouncing
   */
  private performSearch(searchTerm: string) {
    this.currentFilters = {
      ...this.currentFilters,
      search: searchTerm || undefined,
      page: 1
    };
    this.loadFormManagers();
  }

  /**
   * Optimized load form managers with change detection
   */
  loadFormManagers(additionalFilters?: Partial<FormManagerPageRequest>) {
    this.loading = true;
    this.cdr.markForCheck();
    
    const requestParams: FormManagerPageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.formManagerService.getFormManagers(requestParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedApiResponse<FormManager>) => {
          this.formManagersData = response.data;
          
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
          console.error('Failed to load form managers:', error);
          this.formManagersData = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Handle table actions (view, edit, delete)
   */
  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'edit':
        this.editFormManager(item);
        break;
      case 'delete':
        this.deleteFormManager(item);
        break;
    }
  }

  /**
   * Optimized search with debouncing
   */
  onSearch(searchTerm: string) {
    this.searchSubject.next(searchTerm);
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    console.log('Page changed to:', page);
    
    this.currentFilters.page = page;
    this.loadFormManagers();
  }

  /**
   * Handle sorting
   */
  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    console.log('Sorting by:', sortInfo);
    
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1
    };
    
    this.loadFormManagers();
  }

  /**
   * Optimistic UI update for toggle
   */
  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const formManagerId = event.item.id;
    const formManagerTitle = event.item.title;
    
    // Optimistic update
    this.updateFormManagerInList(formManagerId, { isActive: event.value });
    this.cdr.markForCheck();
    
    // Sync with server
    const operation = event.value ? this.formManagerService.enableFormManager : this.formManagerService.disableFormManager;
    
    operation.call(this.formManagerService, [formManagerId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const message = event.value 
              ? `Form "${formManagerTitle}" is now active and available.`
              : `Form "${formManagerTitle}" has been set to inactive.`;
            const title = event.value ? 'Form Activated' : 'Form Deactivated';
            
            if (event.value) {
              this.toastService.activated(message, title);
            } else {
              this.toastService.inactive(message, title);
            }
          } else {
            this.revertToggleState(formManagerId, !event.value);
          }
        },
        error: (error) => {
          console.error('Failed to update form manager:', error);
          this.revertToggleState(formManagerId, !event.value);
        }
      });
  }

  /**
   * Update form manager in local list (optimistic update)
   */
  private updateFormManagerInList(id: string, updates: Partial<FormManager>) {
    this.formManagersData = this.formManagersData.map(formManager => 
      formManager.id === id ? { ...formManager, ...updates } : formManager
    );
  }

  // BULK OPERATIONS

  /**
   * Handle bulk actions from data table
   */
  onBulkAction(event: BulkSelectionEvent) {
    
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one form.', 'No Selection');
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
      default:
        console.warn('Unknown bulk action:', event.action);
    }
  }

  /**
   * Show confirmation modal for bulk operations
   */
  private showBulkConfirmation(operation: 'enable' | 'disable', selectedIds: string[]) {
    const selectedForms = this.formManagersData.filter(fm => selectedIds.includes(fm.id));
    const formTitles = selectedForms.map(f => f.title).join(', ');
    const count = selectedIds.length;
    
    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable Forms',
        message: `Are you sure you want to <strong>enable</strong> ${count} form(s)?<br><br><div class="text-muted small">${formTitles}</div>`,
        icon: 'ti ti-toggle-right',
        iconColor: 'success',
        confirmText: 'Enable',
        cancelText: 'Cancel',
        confirmButtonClass: 'btn-success',
        loading: false,
        size: 'sm'
      };
    } else {
      this.confirmationConfig = {
        title: 'Disable Forms',
        message: `Are you sure you want to <strong>disable</strong> ${count} form(s)?<br><br><div class="text-muted small">${formTitles}</div>`,
        icon: 'ti ti-toggle-left',
        iconColor: 'warning',
        confirmText: 'Disable',
        cancelText: 'Cancel',
        confirmButtonClass: 'btn-warning',
        loading: false,
        size: 'sm'
      };
    }
    
    this.showConfirmationModal = true;
  }

  /**
   * Optimized revert with change detection
   */
  private revertToggleState(formManagerId: string, originalValue: boolean) {
    this.updateFormManagerInList(formManagerId, { isActive: originalValue });
    this.cdr.markForCheck();
  }

  /**
   * Open Add Form Manager Modal
   */
  openAddFormManagerModal() {
    this.selectedFormManager = null;
    this.showFormManagerModal = true;
    this.cdr.markForCheck(); // Trigger change detection for OnPush strategy
  }

  /**
   * Edit form manager
   */
  private editFormManager(formManager: any) {
    this.formManagerService.getFormManagerById(formManager.id).subscribe({
      next: (formManager) => {
        this.selectedFormManager = {
          id: formManager.id,
          title: formManager.title,
          slug: formManager.slug,
          description: formManager.description,
          isActive: formManager.isActive,
          version: formManager.version,
          formSteps: formManager.formSteps || []
        };

        this.showFormManagerModal = true;
        this.cdr.markForCheck(); // Trigger change detection for OnPush strategy
      },
      error: (error) => {
        console.error('Failed to fetch form manager details:', error);
        this.toastService.error('Failed to load form details. Please try again.', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle modal close
   */
  onFormManagerModalClosed() {
    this.showFormManagerModal = false;
    this.selectedFormManager = null;
    this.modalLoading = false;
  }

  /**
   * Handle form manager save from modal
   */
  onFormManagerSaved(formManagerData: any) {
    console.log('Form Manager save response:', formManagerData);

    if (formManagerData.id) {
      this.toastService.success(
        `"${formManagerData.title}" has been updated successfully!`,
        'Form Updated'
      );
    } else {
      this.toastService.success(
        `"${formManagerData.title}" has been created successfully!`,
        'Form Created'
      );
    }

    this.onFormManagerModalClosed();
    this.loadFormManagers();
  }

  /**
   * Delete form manager
   */
  private deleteFormManager(formManager: any) {
    console.log('Deleting form manager:', formManager);
    
    this.formManagerToDelete = formManager;
    this.confirmationConfig = {
      title: 'Delete Form',
      message: `Are you sure you want to delete <strong>"${formManager.title}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      loading: false
    };
    this.showConfirmationModal = true;
  }

  /**
   * Handle confirmation modal actions
   */
  onDeleteConfirmed() {
    // Handle single form manager deletion
    if (this.formManagerToDelete) {
      this.confirmationConfig.loading = true;
      
      this.formManagerService.deleteFormManager(this.formManagerToDelete.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `Form "${this.formManagerToDelete!.title}" has been deleted successfully!`,
              'Form Deleted'
            );
            this.loadFormManagers();
          }
          this.showConfirmationModal = false;
          this.formManagerToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete form manager:', error);
          this.showConfirmationModal = false;
          this.formManagerToDelete = null;
          this.confirmationConfig.loading = false;
        }
      });
      return;
    }

    // Handle bulk operations
    if (this.bulkOperation.type && this.bulkOperation.selectedIds.length > 0) {
      this.confirmationConfig.loading = true;
      
      const selectedIds = this.bulkOperation.selectedIds;
      const operation = this.bulkOperation.type;
      
      if (operation === 'enable') {
        this.formManagerService.enableFormManager(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.activated(
                `${selectedIds.length} form(s) have been enabled successfully!`,
                'Forms Enabled'
              );
              this.loadFormManagers();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable forms:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.formManagerService.disableFormManager(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.inactive(
                `${selectedIds.length} form(s) have been disabled successfully!`,
                'Forms Disabled'
              );
              this.loadFormManagers();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable forms:', error);
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.formManagerToDelete = null;
    this.confirmationConfig.loading = false;
    this.resetBulkOperation();
  }

  /**
   * Reset bulk operation state
   */
  private resetBulkOperation() {
    this.bulkOperation = {
      type: null,
      selectedIds: []
    };
    this.showConfirmationModal = false;
    this.confirmationConfig.loading = false;
  }
}
