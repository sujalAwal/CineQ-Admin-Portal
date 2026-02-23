import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// Project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { SettingModalComponent } from '../../../shared/components/setting-modal/setting-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { SettingService, SETTING_FORM_SLUG } from '../../../shared/services/setting.service';
import { SettingGroupService } from '../../../shared/services/setting-group.service';
import { Setting, SettingPageRequest } from '../../../shared/interfaces/setting.interface';
import { SettingGroup } from '../../../shared/interfaces/setting-group.interface';
import {
  TableConfig,
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent
} from '../../../shared/interfaces/table.interface';

@Component({
  selector: 'app-backend-settings',
  standalone: true,
  imports: [CommonModule, SharedModule, DataTableComponent, SettingModalComponent, ConfirmationModalComponent],
  providers: [
    { provide: SETTING_FORM_SLUG, useValue: 'backend-settings' },
    SettingService
  ],
  templateUrl: './backend-settings.component.html',
  styleUrls: ['./backend-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackendSettingsComponent implements OnInit, OnDestroy {

  readonly MODULE_TITLE = 'Backend Setting';
  readonly MODULE_TITLE_PLURAL = 'Backend Settings';

  // Table configuration
  tableConfig: TableConfig = {
    title: `${this.MODULE_TITLE_PLURAL} Management`,
    entityName: this.MODULE_TITLE,
    apiEndpoint: '',
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
      { header: 'Title', field: 'title', type: 'text', sortable: true, width: '200px' },
      { header: 'Slug', field: 'slug', type: 'text', sortable: false, width: '160px' },
      { header: 'Type', field: 'type', type: 'text', sortable: true, width: '100px' },
      { header: 'Group', field: 'group', type: 'text', sortable: true, width: '120px' },
      { header: 'Status', field: 'isActive', type: 'toggle', width: '60px', align: 'center' }
    ],
    actions: [
      { label: 'Edit', icon: 'ti ti-edit', type: 'edit', class: 'btn-outline-success', visible: true },
      { label: 'Delete', icon: 'ti ti-trash', type: 'delete', class: 'btn-outline-danger', visible: true }
    ]
  };

  // Component state
  settingsData: Setting[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: 20 };

  // Search and filter state
  currentFilters: SettingPageRequest = { page: 1, size: 20 };

  // Modal state
  showSettingModal: boolean = false;
  selectedSetting: Setting | null = null;
  modalLoading: boolean = false;

  // Setting groups loaded once for the group dropdown
  settingGroups: SettingGroup[] = [];

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
  settingToDelete: Setting | null = null;

  // Memory leak prevention
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Bulk operation state
  bulkOperation: { type: 'enable' | 'disable' | 'delete' | null; selectedIds: string[] } = {
    type: null,
    selectedIds: []
  };

  constructor(
    private toastService: ToastService,
    private settingService: SettingService,
    private settingGroupService: SettingGroupService,
    private cdr: ChangeDetectorRef
  ) {
    this.tableConfig.apiEndpoint = `/api/v1/list/${this.settingService.FORM_SLUG}`;
  }

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadSettings();
    this.loadSettingGroups();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ──────────────────────────────────────────────

  private setupDebouncedSearch() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.currentFilters = { ...this.currentFilters, search: term || undefined, page: 1 };
        this.loadSettings();
      });
  }

  loadSettings(extra?: Partial<SettingPageRequest>) {
    this.loading = true;
    this.cdr.markForCheck();

    this.settingService
      .getSettings({ ...this.currentFilters, ...extra })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.settingsData = res.data || [];
          this.pagination = {
            currentPage: res.page,
            totalPages: res.totalPages,
            totalItems: res.totalElements,
            pageSize: res.size
          };
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load settings:', err);
          this.settingsData = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /** Load setting groups once — used by the modal's group dropdown */
  private loadSettingGroups() {
    this.settingGroupService
      .getSettingGroups({ page: 1, size: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.settingGroups = (res.data || []).filter((g) => g.isActive);
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Failed to load setting groups:', err)
      });
  }

  // ── Table Event Handlers ──────────────────────────────────────

  onTableAction(event: TableActionEvent) {
    switch (event.action) {
      case 'edit':
        this.editSetting(event.item);
        break;
      case 'delete':
        this.confirmDeleteSetting(event.item);
        break;
    }
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  onRefresh() {
    this.currentFilters = { page: 1, size: this.currentFilters.size || 20 };
    this.loadSettings();
    this.cdr.markForCheck();
  }

  onPageChange(page: number) {
    this.currentFilters.page = page;
    this.loadSettings();
  }

  onSort(sortInfo: { field: string; order: 'asc' | 'desc' }) {
    this.currentFilters = { ...this.currentFilters, sortBy: sortInfo.field, sortDirection: sortInfo.order, page: 1 };
    this.loadSettings();
  }

  onToggleChange(event: { item: any; field: string; value: boolean }) {
    const id = event.item.id;
    const title = event.item.title;

    this.updateSettingInList(id, { isActive: event.value });
    this.cdr.markForCheck();

    const op = event.value ? this.settingService.enableSettings : this.settingService.disableSettings;

    op.call(this.settingService, [id])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success: boolean) => {
          if (success) {
            const msg = event.value
              ? `"${title}" is now active.`
              : `"${title}" has been deactivated.`;
            event.value
              ? this.toastService.activated(msg, `${this.MODULE_TITLE} Activated`)
              : this.toastService.inactive(msg, `${this.MODULE_TITLE} Deactivated`);
          } else {
            this.revertToggle(id, !event.value);
          }
        },
        error: (err: any) => {
          console.error('Toggle failed:', err);
          this.toastService.error(err?.message || 'Failed to update status.', 'Update Failed');
          this.revertToggle(id, !event.value);
        }
      });
  }

  // ── Bulk Actions ──────────────────────────────────────────────

  onBulkAction(event: BulkSelectionEvent) {
    if (!event.selectedIds.length) {
      this.toastService.warning(`Please select at least one ${this.MODULE_TITLE.toLowerCase()}.`, 'No Selection');
      return;
    }
    this.bulkOperation.selectedIds = event.selectedIds;

    switch (event.action) {
      case 'bulk-enable':
        this.bulkOperation.type = 'enable';
        break;
      case 'bulk-disable':
        this.bulkOperation.type = 'disable';
        break;
      case 'bulk-delete':
        this.bulkOperation.type = 'delete';
        break;
      default:
        return;
    }

    this.showBulkConfirmation(this.bulkOperation.type!, event.selectedIds);
  }

  private showBulkConfirmation(operation: 'enable' | 'disable' | 'delete', ids: string[]) {
    const names = this.settingsData.filter((s) => ids.includes(s.id)).map((s) => s.title).join(', ');
    const count = ids.length;

    const configs: Record<string, Partial<ConfirmationConfig>> = {
      enable: {
        title: `Enable ${this.MODULE_TITLE_PLURAL}`,
        message: `Are you sure you want to <strong>enable</strong> ${count} item(s)?<br><br><div class="text-muted small">${names}</div>`,
        icon: 'ti ti-toggle-right', iconColor: 'success', confirmText: 'Enable', confirmButtonClass: 'btn-success'
      },
      disable: {
        title: `Disable ${this.MODULE_TITLE_PLURAL}`,
        message: `Are you sure you want to <strong>disable</strong> ${count} item(s)?<br><br><div class="text-muted small">${names}</div>`,
        icon: 'ti ti-toggle-left', iconColor: 'warning', confirmText: 'Disable', confirmButtonClass: 'btn-warning'
      },
      delete: {
        title: `Delete ${this.MODULE_TITLE_PLURAL}`,
        message: `Are you sure you want to <strong>delete</strong> ${count} item(s)?<br><br><div class="text-muted small">${names}</div><br><small class="text-danger">This action cannot be undone.</small>`,
        icon: 'ti ti-trash-x', iconColor: 'danger', confirmText: 'Delete', confirmButtonClass: 'btn-danger'
      }
    };

    this.confirmationConfig = { ...(configs[operation] as ConfirmationConfig), cancelText: 'Cancel', loading: false, size: 'sm' };
    this.showConfirmationModal = true;
  }

  // ── Modal ─────────────────────────────────────────────────────

  openAddModal() {
    this.selectedSetting = null;
    this.showSettingModal = true;
  }

  private editSetting(item: any) {
    this.modalLoading = true;
    this.cdr.markForCheck();

    this.settingService.getSettingById(item.id).subscribe({
      next: (full) => {
        this.selectedSetting = full;
        this.modalLoading = false;
        this.showSettingModal = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to fetch setting details:', err);
        this.modalLoading = false;
        this.selectedSetting = item;
        this.showSettingModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  onModalClosed() {
    this.showSettingModal = false;
    this.selectedSetting = null;
    this.modalLoading = false;
  }

  onSettingSaved(data: Setting) {
    if (this.selectedSetting?.id) {
      this.toastService.success(`"${data.title}" has been updated successfully!`, `${this.MODULE_TITLE} Updated`);
    } else {
      this.toastService.success(`"${data.title}" has been created successfully!`, `${this.MODULE_TITLE} Created`);
    }
    this.onModalClosed();
    this.loadSettings();
  }

  // ── Delete ────────────────────────────────────────────────────

  private confirmDeleteSetting(item: any) {
    this.settingToDelete = item;
    this.confirmationConfig = {
      title: `Delete ${this.MODULE_TITLE}`,
      message: `Are you sure you want to delete <strong>"${item.title}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x',
      iconColor: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      loading: false
    };
    this.showConfirmationModal = true;
  }

  onDeleteConfirmed() {
    if (this.settingToDelete) {
      this.confirmationConfig.loading = true;

      this.settingService.deleteSetting(this.settingToDelete.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success(
              `"${this.settingToDelete!.title}" has been deleted successfully!`,
              `${this.MODULE_TITLE} Deleted`
            );
            this.loadSettings();
          }
          this.closeConfirmation();
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.toastService.error(err?.message || 'Failed to delete.', 'Delete Failed');
          this.closeConfirmation();
        }
      });
      return;
    }

    // Bulk operations
    if (this.bulkOperation.type && this.bulkOperation.selectedIds.length) {
      this.confirmationConfig.loading = true;
      const ids = this.bulkOperation.selectedIds;

      if (this.bulkOperation.type === 'enable') {
        this.settingService.enableSettings(ids).subscribe({
          next: (ok) => {
            if (ok) {
              this.toastService.activated(`${ids.length} item(s) enabled successfully!`, `${this.MODULE_TITLE_PLURAL} Enabled`);
              this.loadSettings();
            }
            this.resetBulk();
          },
          error: (err) => { this.toastService.error(err?.message || 'Enable failed.', 'Enable Failed'); this.resetBulk(); }
        });
      } else if (this.bulkOperation.type === 'disable') {
        this.settingService.disableSettings(ids).subscribe({
          next: (ok) => {
            if (ok) {
              this.toastService.inactive(`${ids.length} item(s) disabled successfully!`, `${this.MODULE_TITLE_PLURAL} Disabled`);
              this.loadSettings();
            }
            this.resetBulk();
          },
          error: (err) => { this.toastService.error(err?.message || 'Disable failed.', 'Disable Failed'); this.resetBulk(); }
        });
      } else if (this.bulkOperation.type === 'delete') {
        this.settingService.bulkDeleteSettings(ids).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastService.success(`${res.data.deleted} item(s) deleted successfully!`, `${this.MODULE_TITLE_PLURAL} Deleted`);
              this.loadSettings();
            }
            this.resetBulk();
          },
          error: (err) => { this.toastService.error(err?.message || 'Delete failed.', 'Delete Failed'); this.resetBulk(); }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.closeConfirmation();
    this.resetBulk();
  }

  // ── Helpers ───────────────────────────────────────────────────

  private updateSettingInList(id: string, updates: Partial<Setting>) {
    this.settingsData = this.settingsData.map((s) => (s.id === id ? { ...s, ...updates } : s));
  }

  private revertToggle(id: string, val: boolean) {
    this.updateSettingInList(id, { isActive: val });
    this.cdr.markForCheck();
  }

  private closeConfirmation() {
    this.showConfirmationModal = false;
    this.settingToDelete = null;
    this.confirmationConfig.loading = false;
  }

  private resetBulk() {
    this.bulkOperation = { type: null, selectedIds: [] };
    this.showConfirmationModal = false;
    this.confirmationConfig.loading = false;
  }
}
