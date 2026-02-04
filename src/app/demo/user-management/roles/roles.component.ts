import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { RoleModalComponent } from '../../../shared/components/role-modal/role-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { RoleService } from '../../../shared/services/role.service';
import { RoleListItem, RoleDetailResponse, RolePageRequest, PaginatedApiResponse } from '../../../shared/interfaces/role.interface';
import {
  TableConfig,
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent
} from '../../../shared/interfaces/table.interface';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, SharedModule, DataTableComponent, RoleModalComponent, ConfirmationModalComponent],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolesComponent implements OnInit, OnDestroy {

  // Table configuration
  tableConfig: TableConfig = {
    title: 'Roles Management',
    entityName: 'Role',
    apiEndpoint: '/api/v1/list/role',
    searchable: true,
    paginated: true,
    pageSize: 20,
    sortable: true,
    bulkSelectable: true,
    bulkActions: [
      {
        label: 'Enable Selected',
        icon: 'ti ti-check',
        type: 'bulk-enable',
        class: 'btn-success'
      },
      {
        label: 'Disable Selected',
        icon: 'ti ti-x',
        type: 'bulk-disable',
        class: 'btn-warning'
      },
      {
        label: 'Delete Selected',
        icon: 'ti ti-trash',
        type: 'bulk-delete',
        class: 'btn-danger',
        confirmationRequired: true
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
        header: 'Role Name',
        field: 'name',
        type: 'text',
        sortable: true,
        width: '250px'
      },
      {
        header: 'Permissions',
        field: 'permissionCount',
        type: 'text',
        sortable: false,
        width: '120px',
        align: 'center'
      },
      {
        header: 'Status',
        field: 'isActive',
        type: 'toggle',
        width: '80px',
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
  rolesData: RoleListItem[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: RolePageRequest = {
    page: 1,
    size: 20,
    sortBy: 'name',
    sortDirection: 'asc'
  };

  // Modal state
  showRoleModal: boolean = false;
  selectedRole: RoleDetailResponse | null = null;
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
  roleToDelete: RoleListItem | null = null;

  // Memory leak prevention
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private toastService: ToastService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadRoles();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDebouncedSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  private performSearch(searchTerm: string) {
    this.currentFilters = {
      ...this.currentFilters,
      search: searchTerm || undefined,
      page: 1
    };
    this.loadRoles();
  }

  loadRoles(additionalFilters?: Partial<RolePageRequest>) {
    this.loading = true;
    this.cdr.markForCheck();

    const requestParams: RolePageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.roleService.getRoles(requestParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedApiResponse<any>) => {
          // Extract and flatten roles from the nested structure
          this.rolesData = response.data.flatMap((item: any) => {
            // Each data item has a 'role' array
            const roles = item.role || [];
            return roles.map((role: any) => ({
              id: role.id,
              name: role.name || 'Unnamed Role',
              permissionCount: this.countPermissions(role.permissions || {}),
              isActive: role.isActive ?? true,
              createdAt: role.createdAt || '',
              updatedAt: role.updatedAt || ''
            }));
          });

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
          console.error('Failed to load roles:', error);
          this.rolesData = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Count total permissions across all modules
   */
  private countPermissions(permissions: { [key: string]: number[] }): number {
    if (!permissions || typeof permissions !== 'object') return 0;
    
    return Object.values(permissions).reduce((total, perms) => {
      return total + (Array.isArray(perms) ? perms.length : 0);
    }, 0);
  }

  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'edit':
        this.editRole(item);
        break;
      case 'delete':
        this.deleteRole(item);
        break;
    }
  }

  onSearch(searchTerm: string) {
    this.searchSubject.next(searchTerm);
  }

  onPageChange(page: number) {
    this.currentFilters.page = page;
    this.loadRoles();
  }

  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1
    };
    this.loadRoles();
  }

  onRefresh() {
    this.loadRoles();
  }

  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const roleId = event.item.id;
    const roleName = event.item.name;

    this.roleService.updateStatus([roleId], event.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update local data to reflect the change
          const roleIndex = this.rolesData.findIndex(r => r.id === roleId);
          if (roleIndex !== -1) {
            this.rolesData[roleIndex].isActive = event.value;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Failed to toggle role status:', error);
          // Revert the toggle in UI by reloading
          this.loadRoles();
        }
      });
  }

  openAddRoleModal() {
    this.selectedRole = null;
    this.showRoleModal = true;
  }

  private editRole(role: any) {
    this.roleService.getRoleById(role.id).subscribe({
      next: (roleDetail: RoleDetailResponse) => {
        this.selectedRole = roleDetail;
        this.showRoleModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to fetch role details:', error);
        this.toastService.error('Failed to load role details', 'Error');
      }
    });
  }

  onRoleModalClosed() {
    this.showRoleModal = false;
    this.selectedRole = null;
    this.modalLoading = false;
  }

  onRoleSaved(roleData: any) {
    this.onRoleModalClosed();
    this.loadRoles();
  }

  private deleteRole(role: any) {
    this.roleToDelete = role;
    this.confirmationConfig = {
      title: 'Delete Role',
      message: `Are you sure you want to delete <strong>"${role.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      loading: false
    };
    this.showConfirmationModal = true;
  }

  onDeleteConfirmed() {
    if (this.roleToDelete) {
      this.confirmationConfig.loading = true;

      this.roleService.deleteRole(this.roleToDelete.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `Role "${this.roleToDelete!.name}" has been deleted successfully!`,
              'Role Deleted'
            );
            this.loadRoles();
          }
          this.showConfirmationModal = false;
          this.roleToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete role:', error);
          this.showConfirmationModal = false;
          this.roleToDelete = null;
          this.confirmationConfig.loading = false;
        }
      });
    }
  }

  onBulkAction(event: BulkSelectionEvent) {
    const { selectedIds, action } = event;

    if (selectedIds.length === 0) {
      this.toastService.warning('Please select at least one role', 'No Selection');
      return;
    }

    switch (action) {
      case 'bulk-enable':
        this.bulkEnableRoles(selectedIds);
        break;
      case 'bulk-disable':
        this.bulkDisableRoles(selectedIds);
        break;
      case 'bulk-delete':
        this.bulkDeleteRoles(selectedIds);
        break;
    }
  }

  private bulkEnableRoles(ids: string[]) {
    this.roleService.enableRoles(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRoles();
        },
        error: (error) => {
          console.error('Failed to enable roles:', error);
        }
      });
  }

  private bulkDisableRoles(ids: string[]) {
    this.roleService.disableRoles(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRoles();
        },
        error: (error) => {
          console.error('Failed to disable roles:', error);
        }
      });
  }

  private bulkDeleteRoles(ids: string[]) {
    // TODO: Implement bulk delete confirmation and API call
    this.toastService.info('Bulk delete not implemented yet', 'Info');
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.roleToDelete = null;
    this.confirmationConfig.loading = false;
  }
}
