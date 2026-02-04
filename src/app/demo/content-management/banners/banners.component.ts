import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { BannerModalComponent } from '../../../shared/components/banner-modal/banner-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { Banner } from '../../../shared/interfaces/banner.interface';
import { 
  TableConfig, 
  TableColumn, 
  TableAction, 
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent,
  BulkAction 
} from '../../../shared/interfaces/table.interface';
import { BannerService } from 'src/app/shared/services/banner.service';
import { BannerPageRequest } from '../../../shared/interfaces/banner.interface';
import { PaginatedApiResponse } from '../../../shared/interfaces/genre.interface';

@Component({
  selector: 'app-banners',
  imports: [CommonModule, SharedModule, DataTableComponent, BannerModalComponent, ConfirmationModalComponent],
  templateUrl: './banners.component.html',
  styleUrls: ['./banners.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannersComponent implements OnInit, OnDestroy {
  
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Banners Management',
    entityName: 'Banner',
    apiEndpoint: '/api/v1/list/banner',
    searchable: true,
    paginated: true,
    pageSize: 20,
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
        sortable: false,
        width: '180px'
      },
      {
        header: 'Description',
        field: 'description',
        type: 'text',
        sortable: false,
        width: '250px'
      },
      {
        header: 'Display Order',
        field: 'order',
        type: 'text',
        sortable: true,
        width: '120px',
        align: 'center'
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
  bannersData: Banner[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: BannerPageRequest = {
    page: 1,
    size: 20
  };

  // Modal state
  showBannerModal: boolean = false;
  selectedBanner: Banner | null = null;
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
  bannerToDelete: Banner | null = null;

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
              private bannerService: BannerService,
              private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadBanners();
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
    this.loadBanners();
  }

  /**
   * 🚀 Optimized load banners with change detection
   */
  loadBanners(additionalFilters?: Partial<BannerPageRequest>) {
    this.loading = true;
    this.cdr.markForCheck(); // Trigger change detection for loading state
    
    // Merge current filters with any additional filters
    const requestParams: BannerPageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.bannerService.getBanners(requestParams)
      .pipe(takeUntil(this.destroy$)) // Prevent memory leaks
      .subscribe({
        next: (response: PaginatedApiResponse<Banner>) => {
          // Extract data and pagination info from response
          this.bannersData = response.data;
          
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
          console.error('Failed to load banners:', error);
          this.bannersData = [];
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
        this.editBanner(item);
        break;
      case 'delete':
        this.deleteBanner(item);
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
    this.loadBanners();
  }

  /**
   * Handle sorting
   * Note: The current API doesn't support server-side sorting for the list endpoint
   * This is kept for future implementation if the API adds sorting support
   */
  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    console.log('Sorting by:', sortInfo);
    
    // Client-side sorting for now since API doesn't support sortBy/sortDirection
    // Update current filters with new sorting for future API support
    this.currentFilters = {
      ...this.currentFilters,
      sortBy: sortInfo.field,
      sortDirection: sortInfo.order,
      page: 1 // Reset to first page when sorting
    };
    
    this.loadBanners();
  }

  /**
   * 🚀 Optimistic UI update for toggle
   */
  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const bannerId = event.item.id;
    const bannerTitle = event.item.title;
    
    // 1. Optimistic update - update UI immediately
    this.updateBannerInList(bannerId, { isActive: event.value });
    this.cdr.markForCheck();
    
    // 2. Sync with server
    const operation = event.value ? this.bannerService.enableBanner : this.bannerService.disableBanner;
    
    operation.call(this.bannerService, [bannerId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const message = event.value 
              ? `Banner "${bannerTitle}" is now active and available.`
              : `Banner "${bannerTitle}" has been set to inactive.`;
            const title = event.value ? 'Banner Activated' : 'Banner Deactivated';
            
            if (event.value) {
              this.toastService.activated(message, title);
            } else {
              this.toastService.inactive(message, title);
            }
          } else {
            // Revert on API failure
            this.revertToggleState(bannerId, !event.value);
          }
        },
        error: (error) => {
          console.error('Failed to update banner:', error);
          // Revert on error
          this.revertToggleState(bannerId, !event.value);
        }
      });
  }

  /**
   * 🚀 Update banner in local list (optimistic update)
   */
  private updateBannerInList(id: string, updates: Partial<Banner>) {
    this.bannersData = this.bannersData.map(banner => 
      banner.id === id ? { ...banner, ...updates } : banner
    );
  }

  // 🆕 BULK OPERATIONS

  /**
   * Handle bulk actions from data table
   */
  onBulkAction(event: BulkSelectionEvent) {
    
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one banner.', 'No Selection');
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
    const selectedBanners = this.bannersData.filter(banner => selectedIds.includes(banner.id));
    const bannerTitles = selectedBanners.map(b => b.title).join(', ');
    const count = selectedIds.length;
    
    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable Banners',
        message: `Are you sure you want to <strong>enable</strong> ${count} banner(s)?<br><br><div class="text-muted small">${bannerTitles}</div>`,
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
        title: 'Disable Banners',
        message: `Are you sure you want to <strong>disable</strong> ${count} banner(s)?<br><br><div class="text-muted small">${bannerTitles}</div>`,
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
  private revertToggleState(bannerId: string, originalValue: boolean) {
    this.updateBannerInList(bannerId, { isActive: originalValue });
    this.cdr.markForCheck();
  }

  /**
   * Open Add Banner Modal
   */
  openAddBannerModal() {
    this.selectedBanner = null;
    this.showBannerModal = true;
  }

  /**
   * Edit banner
   */
  private editBanner(banner: any) {
    console.log('Editing banner:', banner);
    this.selectedBanner = {
      id: banner.id,
      slug: banner.slug,
      title: banner.title,
      description: banner.description,
      order: banner.order,
      isActive: banner.isActive,
      bannerImage: banner.bannerImage,
      imageAltText: banner.imageAltText,
      imageMobileUrl: banner.imageMobileUrl,
      buttons: banner.buttons || []
    };
    this.showBannerModal = true;
  }

  /**
   * Handle modal close
   */
  onBannerModalClosed() {
    this.showBannerModal = false;
    this.selectedBanner = null;
    this.modalLoading = false;
  }

  /**
   * Handle banner save from modal
   */
  onBannerSaved(bannerData: Banner) {
    this.modalLoading = true;
    
    // Banner data is already saved by the modal component via service
    // Just handle UI updates here
    if (bannerData.id && this.selectedBanner?.id) {
      // Update existing banner
      this.toastService.success(
        `"${bannerData.title}" has been updated successfully!`,
        'Banner Updated'
      );
    } else {
      // Add new banner
      this.toastService.success(
        `"${bannerData.title}" has been created successfully!`,
        'Banner Created'
      );
    }
    
    this.modalLoading = false;
    this.onBannerModalClosed();
    
    // Refresh the banner list to show the latest data
    this.loadBanners();
  }


  /**
   * Delete banner
   */
  private deleteBanner(banner: any) {
    console.log('Deleting banner:', banner);
    
    // Set up confirmation modal
    this.bannerToDelete = banner;
    this.confirmationConfig = {
      title: 'Delete Banner',
      message: `Are you sure you want to delete <strong>"${banner.title}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
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
    // Handle single banner deletion
    if (this.bannerToDelete) {
      this.confirmationConfig.loading = true;
      
      this.bannerService.deleteBanner(this.bannerToDelete.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `Banner "${this.bannerToDelete!.title}" has been deleted successfully!`,
              'Banner Deleted'
            );
            // Refresh the data to show updated list
            this.loadBanners();
          }
          // Reset state
          this.showConfirmationModal = false;
          this.bannerToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete banner:', error);
          // Reset state on error
          this.showConfirmationModal = false;
          this.bannerToDelete = null;
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
        this.bannerService.enableBanner(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.activated(
                `${selectedIds.length} banner(s) have been enabled successfully!`,
                'Banners Enabled'
              );
              this.loadBanners(); // Refresh data from API
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable banners:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.bannerService.disableBanner(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.inactive(
                `${selectedIds.length} banner(s) have been disabled successfully!`,
                'Banners Disabled'
              );
              this.loadBanners(); // Refresh data from API
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable banners:', error);
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.bannerToDelete = null;
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
}

