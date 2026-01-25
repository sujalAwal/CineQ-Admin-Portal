import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { UserModalComponent } from '../../../shared/components/user-modal/user-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { UserService } from '../../../shared/services/user.service';
import { UserListItem, UserDetailResponse, UserPageRequest, PaginatedUserResponse } from '../../../shared/interfaces/user.interface';
import {
  TableConfig,
  PaginationInfo,
  TableActionEvent
} from '../../../shared/interfaces/table.interface';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, SharedModule, DataTableComponent, UserModalComponent, ConfirmationModalComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit, OnDestroy {

  // Table configuration
  tableConfig: TableConfig = {
    title: 'Users Management',
    entityName: 'User',
    apiEndpoint: '/user',
    searchable: true,
    paginated: true,
    pageSize: 20,
    sortable: true,
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
        header: 'Email',
        field: 'email',
        type: 'text',
        sortable: true,
        width: '220px'
      },
      {
        header: 'Phone Number',
        field: 'phoneNumber',
        type: 'text',
        sortable: false,
        width: '150px'
      },
      {
        header: 'Role',
        field: 'role',
        type: 'badge',
        sortable: true,
        width: '130px',
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
  usersData: UserListItem[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: UserPageRequest = {
    page: 1,
    size: 20,
    sortBy: 'name',
    sortDirection: 'asc'
  };

  // Modal state
  showUserModal: boolean = false;
  selectedUser: UserDetailResponse | null = null;
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
  userToDelete: UserListItem | null = null;

  // Memory leak prevention
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private toastService: ToastService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadUsers();
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
    this.loadUsers();
  }

  loadUsers(additionalFilters?: Partial<UserPageRequest>) {
    this.loading = true;
    this.cdr.markForCheck();

    const requestParams: UserPageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.userService.getUsers(requestParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedUserResponse<UserListItem>) => {
          this.usersData = response.data;

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
          console.error('Failed to load users:', error);
          this.usersData = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'edit':
        this.editUser(item);
        break;
      case 'delete':
        this.deleteUser(item);
        break;
    }
  }

  onSearch(searchTerm: string) {
    this.searchSubject.next(searchTerm);
  }

  onPageChange(page: number) {
    this.currentFilters.page = page;
    this.loadUsers();
  }

  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1
    };
    this.loadUsers();
  }

  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const userId = event.item.id;
    const userName = event.item.name;

    this.userService.toggleUserStatus(userId, event.value).subscribe({
      next: () => {
        // Update the local data
        const userIndex = this.usersData.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          this.usersData[userIndex].isActive = event.value;
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        console.error('Failed to toggle user status:', error);
        // Reload the data on error to reset the toggle
        this.loadUsers();
      }
    });
  }

  openAddUserModal() {
    this.selectedUser = null;
    this.showUserModal = true;
  }

  private editUser(user: any) {
    this.userService.getUserById(user.id).subscribe({
      next: (userDetail) => {
        this.selectedUser = userDetail;
        this.showUserModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to fetch user details:', error);
      }
    });
  }

  onUserModalClosed() {
    this.showUserModal = false;
    this.selectedUser = null;
    this.modalLoading = false;
  }

  onUserSaved(userData: any) {
    this.onUserModalClosed();
    this.loadUsers();
  }

  private deleteUser(user: any) {
    this.userToDelete = user;
    this.confirmationConfig = {
      title: 'Delete User',
      message: `Are you sure you want to delete <strong>"${user.name}"</strong> (${user.email})?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-user-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      loading: false
    };
    this.showConfirmationModal = true;
  }

  onDeleteConfirmed() {
    if (this.userToDelete) {
      this.confirmationConfig.loading = true;

      this.userService.deleteUser(this.userToDelete.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `User "${this.userToDelete!.name}" has been deleted successfully!`,
              'User Deleted'
            );
            this.loadUsers();
          }
          this.showConfirmationModal = false;
          this.userToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete user:', error);
          this.showConfirmationModal = false;
          this.userToDelete = null;
          this.confirmationConfig.loading = false;
        }
      });
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.userToDelete = null;
    this.confirmationConfig.loading = false;
  }
}
