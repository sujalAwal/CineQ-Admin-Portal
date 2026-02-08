import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// Project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { EmailTemplateModalComponent } from '../../../shared/components/email-template-modal/email-template-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { EmailTemplate, EmailTemplatePageRequest } from '../../../shared/interfaces/email-template.interface';
import {
  TableConfig,
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent
} from '../../../shared/interfaces/table.interface';
import { EmailTemplateService } from '../../../shared/services/email-template.service';
import { PaginatedApiResponse } from '../../../shared/interfaces/genre.interface';

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [CommonModule, SharedModule, DataTableComponent, EmailTemplateModalComponent, ConfirmationModalComponent],
  templateUrl: './email-templates.component.html',
  styleUrls: ['./email-templates.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmailTemplatesComponent implements OnInit, OnDestroy {
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Email Templates Management',
    entityName: 'Email Template',
    apiEndpoint: '/api/v1/list/email-templates',
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
        header: 'Name',
        field: 'name',
        type: 'text',
        sortable: true,
        width: '200px'
      },
      {
        header: 'Slug',
        field: 'slug',
        type: 'text',
        sortable: false,
        width: '180px'
      },
      {
        header: 'Subject',
        field: 'subject',
        type: 'text',
        sortable: false,
        width: '250px',
        maxLength: 35
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
  templatesData: EmailTemplate[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: EmailTemplatePageRequest = {
    page: 1,
    size: 20
  };

  // Modal state
  showTemplateModal: boolean = false;
  selectedTemplate: EmailTemplate | null = null;
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
  templateToDelete: EmailTemplate | null = null;

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
    private emailTemplateService: EmailTemplateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadTemplates();
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
    this.loadTemplates();
  }

  /**
   * Load email templates
   */
  loadTemplates(additionalFilters?: Partial<EmailTemplatePageRequest>) {
    this.loading = true;
    this.cdr.markForCheck();

    const requestParams: EmailTemplatePageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.emailTemplateService
      .getEmailTemplates(requestParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedApiResponse<EmailTemplate>) => {
          this.templatesData = response.data;

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
          console.error('Failed to load email templates:', error);
          this.templatesData = [];
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
        this.editTemplate(item);
        break;
      case 'delete':
        this.deleteTemplate(item);
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
    this.loadTemplates();
    this.cdr.markForCheck();
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    this.currentFilters.page = page;
    this.loadTemplates();
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
    this.loadTemplates();
  }

  /**
   * Handle toggle change (enable/disable)
   */
  onToggleChange(event: { item: any; field: string; value: boolean }) {
    const templateId = event.item.id;
    const templateName = event.item.name;

    // Optimistic update
    this.updateTemplateInList(templateId, { isActive: event.value });
    this.cdr.markForCheck();

    const operation = event.value
      ? this.emailTemplateService.enableEmailTemplate
      : this.emailTemplateService.disableEmailTemplate;

    operation
      .call(this.emailTemplateService, [templateId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const message = event.value
              ? `Email template "${templateName}" is now active.`
              : `Email template "${templateName}" has been deactivated.`;
            const title = event.value ? 'Template Activated' : 'Template Deactivated';

            if (event.value) {
              this.toastService.activated(message, title);
            } else {
              this.toastService.inactive(message, title);
            }
          } else {
            this.revertToggleState(templateId, !event.value);
          }
        },
        error: (error) => {
          console.error('Failed to update email template:', error);
          this.revertToggleState(templateId, !event.value);
        }
      });
  }

  /**
   * Update template in local list
   */
  private updateTemplateInList(id: string, updates: Partial<EmailTemplate>) {
    this.templatesData = this.templatesData.map((template) =>
      template.id === id ? { ...template, ...updates } : template
    );
  }

  /**
   * Handle bulk actions
   */
  onBulkAction(event: BulkSelectionEvent) {
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one email template.', 'No Selection');
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
    const selectedTemplates = this.templatesData.filter((template) => selectedIds.includes(template.id));
    const templateNames = selectedTemplates.map((t) => t.name).join(', ');
    const count = selectedIds.length;

    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable Email Templates',
        message: `Are you sure you want to <strong>enable</strong> ${count} email template(s)?<br><br><div class="text-muted small">${templateNames}</div>`,
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
        title: 'Disable Email Templates',
        message: `Are you sure you want to <strong>disable</strong> ${count} email template(s)?<br><br><div class="text-muted small">${templateNames}</div>`,
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
        title: 'Delete Email Templates',
        message: `Are you sure you want to <strong>delete</strong> ${count} email template(s)?<br><br><div class="text-muted small">${templateNames}</div><br><small class="text-danger">This action cannot be undone.</small>`,
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
  private revertToggleState(templateId: string, originalValue: boolean) {
    this.updateTemplateInList(templateId, { isActive: originalValue });
    this.cdr.markForCheck();
  }

  /**
   * Open Add Template Modal
   */
  openAddTemplateModal() {
    this.selectedTemplate = null;
    this.showTemplateModal = true;
  }

  /**
   * Edit template
   */
  private editTemplate(template: any) {
    this.modalLoading = true;
    this.cdr.markForCheck();

    this.emailTemplateService.getEmailTemplateById(template.id).subscribe({
      next: (fullTemplate) => {
        this.selectedTemplate = fullTemplate;
        this.modalLoading = false;
        this.showTemplateModal = true;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to fetch email template details:', error);
        this.modalLoading = false;
        // Fallback to row data
        this.selectedTemplate = template;
        this.showTemplateModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle modal close
   */
  onTemplateModalClosed() {
    this.showTemplateModal = false;
    this.selectedTemplate = null;
    this.modalLoading = false;
  }

  /**
   * Handle template save from modal
   */
  onTemplateSaved(templateData: EmailTemplate) {
    this.modalLoading = true;

    if (templateData.id && this.selectedTemplate?.id) {
      this.toastService.success(`"${templateData.name}" has been updated successfully!`, 'Template Updated');
    } else {
      this.toastService.success(`"${templateData.name}" has been created successfully!`, 'Template Created');
    }

    this.modalLoading = false;
    this.onTemplateModalClosed();
    this.loadTemplates();
  }

  /**
   * Delete template
   */
  private deleteTemplate(template: any) {
    this.templateToDelete = template;
    this.confirmationConfig = {
      title: 'Delete Email Template',
      message: `Are you sure you want to delete <strong>"${template.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
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
    // Handle single template deletion
    if (this.templateToDelete) {
      this.confirmationConfig.loading = true;

      this.emailTemplateService.deleteEmailTemplate(this.templateToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success(
              `Email template "${this.templateToDelete!.name}" has been deleted successfully!`,
              'Template Deleted'
            );
            this.loadTemplates();
          }
          this.showConfirmationModal = false;
          this.templateToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete email template:', error);
          this.showConfirmationModal = false;
          this.templateToDelete = null;
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
        this.emailTemplateService.enableEmailTemplate(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.activated(
                `${selectedIds.length} email template(s) have been enabled successfully!`,
                'Templates Enabled'
              );
              this.loadTemplates();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable email templates:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.emailTemplateService.disableEmailTemplate(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.inactive(
                `${selectedIds.length} email template(s) have been disabled successfully!`,
                'Templates Disabled'
              );
              this.loadTemplates();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable email templates:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'delete') {
        this.emailTemplateService.bulkDeleteEmailTemplates(selectedIds).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success(
                `${response.data.deleted} email template(s) have been deleted successfully!`,
                'Templates Deleted'
              );
              this.loadTemplates();
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to delete email templates:', error);
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.templateToDelete = null;
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
