import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ModuleModalComponent } from '../../../shared/components/module-modal/module-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ModuleResponseDTO, ModuleRequestDTO } from '../../../shared/interfaces/module.interface';
import { 
  TableConfig, 
  TableColumn, 
  TableAction, 
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent,
  BulkAction 
} from '../../../shared/interfaces/table.interface';
import { ModuleService } from 'src/app/shared/services/module.service';
import { ModulePageRequest, PaginationResponse } from '../../../shared/interfaces/module.interface';

@Component({
  selector: 'app-modulemanagement',
  imports: [CommonModule, SharedModule, DataTableComponent, ModuleModalComponent, ConfirmationModalComponent],
  templateUrl: './modulemanagement.component.html',
  styleUrls: ['./modulemanagement.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulemanagementComponent implements OnInit, OnDestroy {
  
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Module Management',
    entityName: 'Module',
    apiEndpoint: '/modules',
    searchable: true,
    paginated: true,
    pageSize: 25,
    sortable: true,
    // 🆕 Enable bulk selection
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
        width: '80px',
        align: 'center'
      },
      {
        header: 'Name',
        field: 'name',
        type: 'text',
        sortable: true,
        width: '200px'
      },
      {
        header: 'API',
        field: 'api',
        type: 'text',
        sortable: false,
        width: '300px'
      },
      {
        header: 'Status',
        field: 'is_enabled',
        type: 'toggle',
        width: '60px',
        align: 'center'
      }
    ],
    actions: [
      // {
      //   label: 'View',
      //   icon: 'ti ti-eye',
      //   type: 'view',
      //   class: 'btn-outline-primary',
      //   visible: true
      // },
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
  modulesData: ModuleResponseDTO[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 25
  };

  // Parent modules for dropdown
  parentModules: ModuleResponseDTO[] = [];

  // Search and filter state
  currentFilters: ModulePageRequest = {
    page: 1,
    size: 25,
    sortBy: 'name',
    sortDirection: 'asc'
  };

  // Modal state
  showModuleModal: boolean = false;
  selectedModule: ModuleRequestDTO | null = null;
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
  moduleToDelete: ModuleResponseDTO | null = null;

  // 🆕 Memory leak prevention
  private destroy$ = new Subject<void>();
  
  // 🆕 Debounced search
  private searchSubject = new Subject<string>();

  // 🆕 Bulk operation state
  bulkOperation: {
    type: 'enable' | 'disable' | null;
    selectedIds: string[];
  } = {
    type: null,
    selectedIds: []
  };

  constructor(private toastService: ToastService,
              private moduleService: ModuleService,
              private cdr: ChangeDetectorRef
  ) {}


  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadModules();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 🚀 Setup debounced search to reduce API calls
   */
  private setupDebouncedSearch() {
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only search if term actually changed
      takeUntil(this.destroy$) // Cleanup on component destroy
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  /**
   * 🚀 Optimized search with debouncing
   */
  private performSearch(searchTerm: string) {
    this.currentFilters = {
      ...this.currentFilters,
      search: searchTerm || undefined,
      page: 1
    };
    this.loadModules();
  }

  /**
   * 🚀 Optimized load modules with change detection
   */
  loadModules(additionalFilters?: Partial<ModulePageRequest>) {
    this.loading = true;
    this.cdr.markForCheck(); // Trigger change detection for loading state
    
    // Merge current filters with any additional filters
    const requestParams: ModulePageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.moduleService.getAllModules(requestParams)
      .pipe(takeUntil(this.destroy$)) // Prevent memory leaks
      .subscribe({
        next: (response: PaginationResponse<ModuleResponseDTO>) => {
          // Extract data and pagination info from response
          this.modulesData = response.data;
          
          // Update pagination info
          this.pagination = {
            currentPage: response.page,
            totalPages: response.totalPages,
            totalItems: response.totalElements,
            pageSize: response.size
          };

          this.loading = false;
          this.cdr.markForCheck(); // Trigger change detection for data update
        },
        error: (error) => {
          console.error('Failed to load modules:', error);
          this.modulesData = [];
          this.loading = false;
          this.cdr.markForCheck(); // Trigger change detection for error state
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
        this.editModule(item);
        break;
      case 'delete':
        this.deleteModule(item);
        break;
    }
  }

  /**
   * 🚀 Optimized search with debouncing
   */
  onSearch(searchTerm: string) {
    this.searchSubject.next(searchTerm); // Use debounced search
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    console.log('Page changed to:', page);
    
    this.currentFilters.page = page;
    this.loadModules();
  }

  /**
   * Handle sorting
   */
  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    console.log('Sorting by:', sortInfo);
    
    // Update current filters with new sorting
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1 // Reset to first page when sorting
    };
    
    this.loadModules();
  }

  /**
   * 🚀 Optimistic UI update for toggle
   */
  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const moduleId = event.item.id;
    const moduleName = event.item.name;
    
    // 1. Optimistic update - update UI immediately
    this.updateModuleInList(moduleId, { is_enabled: event.value });
    this.cdr.markForCheck();
    
    // 2. Sync with server
    const formData: ModuleRequestDTO = {
      name: event.item.name,
      displayName: event.item.displayName,
      api: event.item.api,
      description: event.item.description,
      icon: event.item.icon,
      is_enabled: event.value,
      parentId: event.item.parentId
    };
    
    this.moduleService.updateModule(moduleId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const message = event.value 
            ? `Module "${moduleName}" is now active and available.`
            : `Module "${moduleName}" has been set to inactive.`;
          const title = event.value ? 'Module Activated' : 'Module Deactivated';
          
          if (event.value) {
            this.toastService.activated(message, title);
          } else {
            this.toastService.inactive(message, title);
          }
        },
        error: (error) => {
          console.error('Failed to update module:', error);
          // Revert on error
          this.revertToggleState(moduleId, !event.value);
          this.handleApiError(error);
        }
      });
  }

  /**
   * 🚀 Update module in local list (optimistic update)
   */
  private updateModuleInList(id: string, updates: Partial<ModuleResponseDTO>) {
    this.modulesData = this.modulesData.map(module => 
      module.id === id ? { ...module, ...updates } : module
    );
  }

  // 🆕 BULK OPERATIONS

  /**
   * Handle bulk actions from data table
   */
  onBulkAction(event: BulkSelectionEvent) {
    
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one module.', 'No Selection');
      return;
    }

    // Store bulk operation details
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
    const selectedModules = this.modulesData.filter(module => selectedIds.includes(module.id));
    const moduleNames = selectedModules.map(g => g.name).join(', ');
    const count = selectedIds.length;
    
    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable Modules',
        message: `Are you sure you want to <strong>enable</strong> ${count} module(s)?<br><br><div class="text-muted small">${moduleNames}</div>`,
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
        title: 'Disable Modules',
        message: `Are you sure you want to <strong>disable</strong> ${count} module(s)?<br><br><div class="text-muted small">${moduleNames}</div>`,
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
   * 🚀 Optimized revert with change detection
   */
  private revertToggleState(moduleId: string, originalValue: boolean) {
    this.updateModuleInList(moduleId, { is_enabled: originalValue });
    this.cdr.markForCheck();
  }

  /**
   * Load parent modules from the new API endpoint
   */
  private loadParentModules() {
    this.moduleService.getParentModules()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.parentModules = response.data;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to load parent modules:', error);
          this.parentModules = [];
        }
      });
  }

  /**
   * Open Add Module Modal
   */
  openAddModuleModal() {
    this.selectedModule = null;
    this.loadParentModules(); // Load parent modules for dropdown
    this.showModuleModal = true;
  }

  /**
   * Edit module
   */
  private editModule(module: any) {
    console.log('Editing module:', module);
    this.selectedModule = {
      id: module.id,
      name: module.name,
      displayName: module.displayName,
      api: module.api,
      description: module.description,
      icon: module.icon,
      is_enabled: module.is_enabled,
      parentId: module.parentId
    } as ModuleRequestDTO;
    this.loadParentModules(); // Load parent modules for dropdown
    this.showModuleModal = true;
  }

  /**
   * Handle modal close
   */
  onModuleModalClosed() {
    this.showModuleModal = false;
    this.selectedModule = null;
    this.modalLoading = false;
  }

  /**
   * Handle module save from modal
   */
  onModuleSaved(moduleData: ModuleRequestDTO) {
    this.modalLoading = true;
    
    // Check if we have an ID to determine if it's an update or create
    const moduleId = this.selectedModule?.id;
    
    if (moduleId) {
      // Update existing module
      this.moduleService.updateModule(moduleId, moduleData).subscribe({
        next: (response) => {
          console.log('Module update response:', response);
          
          this.toastService.success(
            `"${moduleData.name}" has been updated successfully!`,
            'Module Updated'
          );
          
          this.modalLoading = false;
          this.onModuleModalClosed();
          
          // Refresh the module list to show the latest data
          this.loadModules();
        },
        error: (error) => {
          console.error('Failed to update module:', error);
          this.handleApiError(error);
          this.modalLoading = false;
          // Don't close modal on error so user can try again
        }
      });
    } else {
      // Create new module
      this.moduleService.createModule(moduleData).subscribe({
        next: (response) => {
          console.log('Module create response:', response);
          
          this.toastService.success(
            `"${moduleData.name}" has been created successfully!`,
            'Module Created'
          );
          
          this.modalLoading = false;
          this.onModuleModalClosed();
          
          // Refresh the module list to show the latest data
          this.loadModules();
        },
        error: (error) => {
          console.error('Failed to create module:', error);
          this.handleApiError(error);
          this.modalLoading = false;
          // Don't close modal on error so user can try again
        }
      });
    }
  }

  /**
   * Delete module
   */
  private deleteModule(module: any) {
    console.log('Deleting module:', module);
    
    // Set up confirmation modal
    this.moduleToDelete = module;
    this.confirmationConfig = {
      title: 'Delete Module',
      message: `Are you sure you want to delete <strong>"${module.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
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
    // Handle single module deletion
    if (this.moduleToDelete) {
      this.confirmationConfig.loading = true;
      
      this.moduleService.deleteModule(this.moduleToDelete.id).subscribe({
        next: (response) => {
          this.toastService.success(
            `Module "${this.moduleToDelete!.name}" has been deleted successfully!`,
            'Module Deleted'
          );
          // Refresh the data to show updated list
          this.loadModules();
          
          // Reset state
          this.showConfirmationModal = false;
          this.moduleToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete module:', error);
          this.handleApiError(error);
          // Reset state on error
          this.showConfirmationModal = false;
          this.moduleToDelete = null;
          this.confirmationConfig.loading = false;
        }
      });
      return;
    }

    // 🆕 Handle bulk operations
    if (this.bulkOperation.type && this.bulkOperation.selectedIds.length > 0) {
      this.confirmationConfig.loading = true;
      
      const selectedIds = this.bulkOperation.selectedIds;
      const operation = this.bulkOperation.type;
      
      if (operation === 'enable') {
        this.moduleService.bulkEnableModules(selectedIds).subscribe({
          next: (response) => {
            this.toastService.activated(
              `${selectedIds.length} module(s) have been enabled successfully!`,
              'Modules Enabled'
            );
            this.loadModules(); // Refresh data from API
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable modules:', error);
            this.handleApiError(error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.moduleService.bulkDisableModules(selectedIds).subscribe({
          next: (response) => {
            this.toastService.inactive(
              `${selectedIds.length} module(s) have been disabled successfully!`,
              'Modules Disabled'
            );
            this.loadModules(); // Refresh data from API
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable modules:', error);
            this.handleApiError(error);
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.moduleToDelete = null;
    this.confirmationConfig.loading = false;
    
    // 🆕 Reset bulk operation state
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

  private handleApiError(error: any): void {
    if (error.error?.message) {
      this.toastService.error(error.error.message, 'Error');
    } else {
      this.toastService.error('Operation failed. Please try again.', 'Error');
    }
  }

  protected readonly Math = Math;
}