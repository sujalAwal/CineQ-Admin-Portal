import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PeopleModalComponent } from '../../../shared/components/people-modal/people-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import {
  TableConfig,
  TableColumn,
  TableAction,
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent,
  BulkAction
} from '../../../shared/interfaces/table.interface';
import { PeopleService } from 'src/app/shared/services/people.service';
import { PaginatedApiResponse } from '../../../shared/interfaces/genre.interface';

@Component({
  selector: 'app-people',
  imports: [CommonModule, SharedModule, DataTableComponent, PeopleModalComponent, ConfirmationModalComponent],
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PeopleComponent implements OnInit, OnDestroy {

  // Table configuration
  tableConfig: TableConfig = {
    title: 'People Management',
    entityName: 'Person',
    apiEndpoint: '/api/v1/list/people',
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
        width: '60px',
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
        header: 'Image',
        field: 'image',
        type: 'image',
        sortable: false,
        width: '80px',
        align: 'center'
      },
      {
        header: 'Description',
        field: 'description',
        type: 'text',
        sortable: false,
        width: '250px',
        maxLength: 50
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
  peopleData: any[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: any = {
    page: 1,
    size: 20
  };

  // Modal state
  showPeopleModal: boolean = false;
  selectedPerson: any = null;
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
  personToDelete: any = null;

  // Memory leak prevention
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Bulk operation state
  bulkOperation: {
    type: 'enable' | 'disable' | 'delete' | null;
    selectedIds: string[];
  } = {
    type: null,
    selectedIds: []
  };

  constructor(private toastService: ToastService,
              private peopleService: PeopleService,
              private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadPeople();
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
    this.loadPeople();
  }

  loadPeople(additionalFilters?: Partial<any>) {
    this.loading = true;
    this.cdr.markForCheck();

    const requestParams = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.peopleService.getList(requestParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedApiResponse<any>) => {
          // Extract and flatten people from the nested structure
          // API returns: { data: [{ "people": [...] }] } - flatMap unwraps this
          this.peopleData = response.data.flatMap((item: any) => {
            const people = item.people || item.person || [];
            if (Array.isArray(people)) {
              return people;
            }
            // If item has 'id', it's already a flat record
            return item.id ? [item] : [];
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
          console.error('Failed to load people:', error);
          this.peopleData = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'edit':
        this.editPerson(item);
        break;
      case 'delete':
        this.deletePerson(item);
        break;
    }
  }

  onSearch(searchTerm: string) {
    this.searchSubject.next(searchTerm);
  }

  onRefresh() {
    this.currentFilters = {
      page: 1,
      size: this.currentFilters.size || 20
    };
    this.loadPeople();
    this.cdr.markForCheck();
  }

  onPageChange(page: number) {
    this.currentFilters.page = page;
    this.loadPeople();
  }

  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1
    };
    this.loadPeople();
  }

  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const personId = event.item.id;
    const personName = event.item.name;

    this.updatePersonInList(personId, { isActive: event.value });
    this.cdr.markForCheck();

    const operation = event.value ? this.peopleService.enable : this.peopleService.disable;

    operation.call(this.peopleService, [personId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const message = event.value
              ? `"${personName}" is now active.`
              : `"${personName}" has been deactivated.`;
            const title = event.value ? 'Activated' : 'Deactivated';

            if (event.value) {
              this.toastService.activated(message, title);
            } else {
              this.toastService.inactive(message, title);
            }
          } else {
            this.revertToggleState(personId, !event.value);
          }
        },
        error: (error) => {
          console.error('Failed to update person:', error);
          this.revertToggleState(personId, !event.value);
        }
      });
  }

  private updatePersonInList(id: string, updates: Partial<any>) {
    this.peopleData = this.peopleData.map(person =>
      person.id === id ? { ...person, ...updates } : person
    );
  }

  onBulkAction(event: BulkSelectionEvent) {
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one person.', 'No Selection');
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

  private showBulkConfirmation(operation: 'enable' | 'disable' | 'delete', selectedIds: string[]) {
    const selectedPeople = this.peopleData.filter(person => selectedIds.includes(person.id));
    const names = selectedPeople.map(p => p.name).join(', ');
    const count = selectedIds.length;

    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable People',
        message: `Are you sure you want to <strong>enable</strong> ${count} person(s)?`,
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
        title: 'Disable People',
        message: `Are you sure you want to <strong>disable</strong> ${count} person(s)?`,
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
        title: 'Delete People',
        message: `Are you sure you want to <strong>delete</strong> ${count} person(s)?<br><small class="text-danger">This action cannot be undone.</small>`,
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

  private revertToggleState(personId: string, originalValue: boolean) {
    this.updatePersonInList(personId, { isActive: originalValue });
    this.cdr.markForCheck();
  }

  openAddPeopleModal() {
    this.selectedPerson = null;
    this.showPeopleModal = true;
    this.cdr.markForCheck();
  }

  private editPerson(person: any) {
    this.modalLoading = true;
    this.cdr.markForCheck();

    this.peopleService.getById(person.id).subscribe({
      next: (fullPerson) => {
        this.selectedPerson = fullPerson;
        this.modalLoading = false;
        this.showPeopleModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to fetch person details:', error);
        this.modalLoading = false;
        this.selectedPerson = person;
        this.showPeopleModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  onPeopleModalClosed() {
    this.showPeopleModal = false;
    this.selectedPerson = null;
    this.modalLoading = false;
  }

  onPersonSaved(personData: any) {
    if (personData.id) {
      this.toastService.success(
        `"${personData.name}" has been updated successfully!`,
        'Updated'
      );
    } else {
      this.toastService.success(
        `"${personData.name}" has been created successfully!`,
        'Created'
      );
    }

    this.onPeopleModalClosed();
    this.loadPeople();
  }

  private deletePerson(person: any) {
    this.personToDelete = person;
    this.confirmationConfig = {
      title: 'Delete Person',
      message: `Are you sure you want to delete <strong>"${person.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      loading: false
    };
    this.showConfirmationModal = true;
  }

  onDeleteConfirmed() {
    if (this.personToDelete) {
      this.confirmationConfig.loading = true;

      this.peopleService.delete(this.personToDelete.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `Person "${this.personToDelete!.name}" has been deleted successfully!`,
              'Deleted'
            );
            this.loadPeople();
          }
          this.showConfirmationModal = false;
          this.personToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete person:', error);
          this.showConfirmationModal = false;
          this.personToDelete = null;
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
        this.peopleService.enable(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.activated(
                `${selectedIds.length} person(s) have been enabled successfully!`,
                'Enabled'
              );
              this.loadPeople();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable people:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.peopleService.disable(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.inactive(
                `${selectedIds.length} person(s) have been disabled successfully!`,
                'Disabled'
              );
              this.loadPeople();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable people:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'delete') {
        this.peopleService.bulkDelete(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.success(
                `${selectedIds.length} person(s) have been deleted successfully!`,
                'Deleted'
              );
              this.loadPeople();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to delete people:', error);
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.personToDelete = null;
    this.confirmationConfig.loading = false;
    this.resetBulkOperation();
  }

  private resetBulkOperation() {
    this.bulkOperation = {
      type: null,
      selectedIds: []
    };
    this.showConfirmationModal = false;
    this.confirmationConfig.loading = false;
  }
}
