import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// Project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SettingGroupModalComponent } from '../../../shared/components/setting-group-modal/setting-group-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { SettingGroup, SettingGroupPageRequest } from '../../../shared/interfaces/setting-group.interface';
import {
  TableConfig,
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent
} from '../../../shared/interfaces/table.interface';
import { SettingGroupService } from '../../../shared/services/setting-group.service';

@Component({
  selector: 'app-setting-groups',
  standalone: true,
  imports: [CommonModule, SharedModule, DataTableComponent, SettingGroupModalComponent, ConfirmationModalComponent],
  templateUrl: './setting-groups.component.html',
  styleUrls: ['./setting-groups.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingGroupsComponent implements OnInit, OnDestroy {
  
  // Table configuration — uses service's FORM_SLUG as single source of truth
  tableConfig: TableConfig = {
    title: 'Setting Groups Management',
    entityName: 'Setting Group',
    apiEndpoint: '',  // Set in constructor from service.FORM_SLUG,
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
      },
      {
        label: 'Delete',
        icon: '',
        type: 'bulk-delete',
        class: 'btn-danger'
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
        header: 'Title',
        field: 'title',
        type: 'text',
        sortable: true,
        width: '250px'
      },
      {
        header: 'Slug',
        field: 'slug',
        type: 'text',
        sortable: false,
        width: '200px'
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
  settingGroupsData: SettingGroup[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: SettingGroupPageRequest = {
    page: 1,
    size: 20
  };

  // Modal state
  showSettingGroupModal: boolean = false;
  selectedSettingGroup: SettingGroup | null = null;
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
  settingGroupToDelete: SettingGroup | null = null;

  // Memory leak prevention
  private destroy$ = new Subject<void>();

  // Debounced search
  private searchSubject = new Subject<string>();

  // Bulk operation state
  bulkOperation: {
    type: 'enable' | 'disable' | 'delete' | null;
    selectedIds: string[];
  } = {
    type: null,
    selectedIds: []
  };

  constructor(
    private toastService: ToastService,
    private settingGroupService: SettingGroupService,
    private cdr: ChangeDetectorRef
  ) {
    // Set apiEndpoint from the service's single source of truth FORM_SLUG
    this.tableConfig.apiEndpoint = `/api/v1/list/${this.settingGroupService.FORM_SLUG}`;
  }

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadSettingGroups();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup debounced search to reduce API calls
   */
  private setupDebouncedSearch() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.performSearch(searchTerm);
      });
  }

  /**
   * Perform search
   */
  private performSearch(searchTerm: string) {
    this.currentFilters = {
      ...this.currentFilters,
      search: searchTerm || undefined,
      page: 1
    };
    this.loadSettingGroups();
  }

  /**
   * Load setting groups
   */
  loadSettingGroups(additionalFilters?: Partial<SettingGroupPageRequest>) {
    this.loading = true;
    this.cdr.markForCheck();

    const requestParams: SettingGroupPageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.settingGroupService
      .getSettingGroups(requestParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.settingGroupsData = response.data || [];

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
          console.error('Failed to load setting groups:', error);
          this.settingGroupsData = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Handle table actions (edit, delete)
   */
  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'edit':
        this.editSettingGroup(item);
        break;
      case 'delete':
        this.deleteSettingGroup(item);
        break;
    }
  }

  /**
   * Handle search
   */
  onSearch(searchTerm: string) {
    this.searchSubject.next(searchTerm);
  }

  /**
   * Handle refresh
   */
  onRefresh() {
    this.currentFilters = {
      page: 1,
      size: this.currentFilters.size || 20
    };
    this.loadSettingGroups();
    this.cdr.markForCheck();
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    this.currentFilters.page = page;
    this.loadSettingGroups();
  }

  /**
   * Handle sorting
   */
  onSort(sortInfo: { field: string; order: 'asc' | 'desc' }) {
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1
    };
    this.loadSettingGroups();
  }

  /**
   * Handle toggle change (enable/disable)
   */
  onToggleChange(event: { item: any; field: string; value: boolean }) {
    const settingGroupId = event.item.id;
    const settingGroupTitle = event.item.title;

    // Optimistic update
    this.updateSettingGroupInList(settingGroupId, { isActive: event.value });
    this.cdr.markForCheck();

    const operation = event.value
      ? this.settingGroupService.enableSettingGroup
      : this.settingGroupService.disableSettingGroup;

    operation
      .call(this.settingGroupService, [settingGroupId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const message = event.value
              ? `Setting group "${settingGroupTitle}" is now active.`
              : `Setting group "${settingGroupTitle}" has been deactivated.`;
            const title = event.value ? 'Setting Group Activated' : 'Setting Group Deactivated';

            if (event.value) {
              this.toastService.activated(message, title);
            } else {
              this.toastService.inactive(message, title);
            }
          } else {
            this.revertToggleState(settingGroupId, !event.value);
          }
        },
        error: (error) => {
          console.error('Failed to update setting group:', error);
          this.toastService.error(error?.message || 'Failed to update setting group status.', 'Update Failed');
          this.revertToggleState(settingGroupId, !event.value);
        }
      });
  }

  /**
   * Update setting group in local list
   */
  private updateSettingGroupInList(id: string, updates: Partial<SettingGroup>) {
    this.settingGroupsData = this.settingGroupsData.map((settingGroup) =>
      settingGroup.id === id ? { ...settingGroup, ...updates } : settingGroup
    );
  }

  /**
   * Handle bulk actions
   */
  onBulkAction(event: BulkSelectionEvent) {
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one setting group.', 'No Selection');
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
      default:
        console.warn('Unknown bulk action:', event.action);
    }
  }

  /**
   * Show confirmation modal for bulk operations
   */
  private showBulkConfirmation(operation: 'enable' | 'disable' | 'delete', selectedIds: string[]) {
    const selectedGroups = this.settingGroupsData.filter((sg) => selectedIds.includes(sg.id));
    const groupNames = selectedGroups.map((sg) => sg.title).join(', ');
    const count = selectedIds.length;

    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable Setting Groups',
        message: `Are you sure you want to <strong>enable</strong> ${count} setting group(s)?<br><br><div class="text-muted small">${groupNames}</div>`,
        icon: 'ti ti-toggle-right',
        iconColor: 'success',
        confirmText: 'Enable',
        cancelText: 'Cancel',
        confirmButtonClass: 'btn-success',
        loading: false,
        size: 'sm'
      };
    } else if (operation === 'disable') {
      this.confirmationConfig = {
        title: 'Disable Setting Groups',
        message: `Are you sure you want to <strong>disable</strong> ${count} setting group(s)?<br><br><div class="text-muted small">${groupNames}</div>`,
        icon: 'ti ti-toggle-left',
        iconColor: 'warning',
        confirmText: 'Disable',
        cancelText: 'Cancel',
        confirmButtonClass: 'btn-warning',
        loading: false,
        size: 'sm'
      };
    } else if (operation === 'delete') {
      this.confirmationConfig = {
        title: 'Delete Setting Groups',
        message: `Are you sure you want to <strong>delete</strong> ${count} setting group(s)?<br><br><div class="text-muted small">${groupNames}</div><br><small class="text-danger">This action cannot be undone.</small>`,
        icon: 'ti ti-trash-x',
        iconColor: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmButtonClass: 'btn-danger',
        loading: false,
        size: 'sm'
      };
    }

    this.showConfirmationModal = true;
  }

  /**
   * Revert toggle state
   */
  private revertToggleState(settingGroupId: string, originalValue: boolean) {
    this.updateSettingGroupInList(settingGroupId, { isActive: originalValue });
    this.cdr.markForCheck();
  }

  /**
   * Open Add Setting Group Modal
   */
  openAddSettingGroupModal() {
    this.selectedSettingGroup = null;
    this.showSettingGroupModal = true;
  }

  /**
   * Edit setting group
   */
  private editSettingGroup(settingGroup: any) {
    this.modalLoading = true;
    this.cdr.markForCheck();

    this.settingGroupService.getSettingGroupById(settingGroup.id).subscribe({
      next: (fullSettingGroup) => {
        this.selectedSettingGroup = fullSettingGroup;
        this.modalLoading = false;
        this.showSettingGroupModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to fetch setting group details:', error);
        this.modalLoading = false;
        // Fallback to row data
        this.selectedSettingGroup = settingGroup;
        this.showSettingGroupModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle modal close
   */
  onSettingGroupModalClosed() {
    this.showSettingGroupModal = false;
    this.selectedSettingGroup = null;
    this.modalLoading = false;
  }

  /**
   * Handle setting group save from modal
   */
  onSettingGroupSaved(settingGroupData: SettingGroup) {
    if (this.selectedSettingGroup?.id) {
      this.toastService.success(`"${settingGroupData.title}" has been updated successfully!`, 'Setting Group Updated');
    } else {
      this.toastService.success(`"${settingGroupData.title}" has been created successfully!`, 'Setting Group Created');
    }

    this.onSettingGroupModalClosed();
    this.loadSettingGroups();
  }

  /**
   * Delete setting group
   */
  private deleteSettingGroup(settingGroup: any) {
    this.settingGroupToDelete = settingGroup;
    this.confirmationConfig = {
      title: 'Delete Setting Group',
      message: `Are you sure you want to delete <strong>"${settingGroup.title}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      loading: false
    };
    this.showConfirmationModal = true;
  }

  /**
   * Handle delete confirmation
   */
  onDeleteConfirmed() {
    // Handle single setting group deletion
    if (this.settingGroupToDelete) {
      this.confirmationConfig.loading = true;

      this.settingGroupService.deleteSettingGroup(this.settingGroupToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success(
              `Setting group "${this.settingGroupToDelete!.title}" has been deleted successfully!`,
              'Setting Group Deleted'
            );
            this.loadSettingGroups();
          }
          this.showConfirmationModal = false;
          this.settingGroupToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete setting group:', error);
          this.toastService.error(error?.message || 'Failed to delete setting group.', 'Delete Failed');
          this.showConfirmationModal = false;
          this.settingGroupToDelete = null;
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
        this.settingGroupService.enableSettingGroup(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.activated(
                `${selectedIds.length} setting group(s) have been enabled successfully!`,
                'Setting Groups Enabled'
              );
              this.loadSettingGroups();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable setting groups:', error);
            this.toastService.error(error?.message || 'Failed to enable setting groups.', 'Enable Failed');
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.settingGroupService.disableSettingGroup(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.inactive(
                `${selectedIds.length} setting group(s) have been disabled successfully!`,
                'Setting Groups Disabled'
              );
              this.loadSettingGroups();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable setting groups:', error);
            this.toastService.error(error?.message || 'Failed to disable setting groups.', 'Disable Failed');
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'delete') {
        this.settingGroupService.bulkDeleteSettingGroups(selectedIds).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success(
                `${response.data.deleted} setting group(s) have been deleted successfully!`,
                'Setting Groups Deleted'
              );
              this.loadSettingGroups();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to delete setting groups:', error);
            this.toastService.error(error?.message || 'Failed to delete setting groups.', 'Delete Failed');
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.settingGroupToDelete = null;
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
