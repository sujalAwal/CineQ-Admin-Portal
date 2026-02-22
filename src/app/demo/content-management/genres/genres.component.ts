import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { GenreModalComponent } from '../../../shared/components/genre-modal/genre-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { Genre } from '../../../shared/interfaces/genre.interface';
import { 
  TableConfig, 
  TableColumn, 
  TableAction, 
  PaginationInfo,
  TableActionEvent,
  BulkSelectionEvent,
  BulkAction 
} from '../../../shared/interfaces/table.interface';
import { GenreService } from 'src/app/shared/services/genre.service';
import { GenrePageRequest, PaginatedApiResponse } from '../../../shared/interfaces/genre.interface';

@Component({
  selector: 'app-genres',
  imports: [CommonModule, SharedModule, DataTableComponent, GenreModalComponent, ConfirmationModalComponent],
  templateUrl: './genres.component.html',
  styleUrls: ['./genres.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenresComponent implements OnInit, OnDestroy {
  
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Genres Management',
    entityName: 'Genre',
    apiEndpoint: '/api/genres',
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
        header: 'Name',
        field: 'name',
        type: 'text',
        sortable: true,
        width: '200px'
      },
      {
        header: 'Description',
        field: 'description',
        type: 'text',
        sortable: false,
        width: '300px'
      },
      {
        header: 'Status',
        field: 'is_active',
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
  genresData: Genre[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20
  };

  // Search and filter state
  currentFilters: GenrePageRequest = {
    page: 1,
    size: 20,
    sortBy: 'name',
    sortDirection: 'asc'
  };

  // Modal state
  showGenreModal: boolean = false;
  selectedGenre: Genre | null = null;
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
  genreToDelete: Genre | null = null;

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
              private genreService: GenreService,
              private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupDebouncedSearch();
    this.loadGenres();
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
    this.loadGenres();
  }

  /**
   * 🚀 Optimized load genres with change detection
   */
  loadGenres(additionalFilters?: Partial<GenrePageRequest>) {
    this.loading = true;
    this.cdr.markForCheck(); // Trigger change detection for loading state
    
    // Merge current filters with any additional filters
    const requestParams: GenrePageRequest = {
      ...this.currentFilters,
      ...additionalFilters
    };

    this.genreService.getGenres(requestParams)
      .pipe(takeUntil(this.destroy$)) // Prevent memory leaks
      .subscribe({
        next: (response: PaginatedApiResponse<Genre>) => {
          // Extract and flatten genres from the nested structure
          // API returns: { data: [{ "genre": [...] }] } - flatMap unwraps this
          this.genresData = response.data.flatMap((item: any) => {
            const genres = item.genre || item.genres || [];
            if (Array.isArray(genres)) {
              return genres;
            }
            // If item has 'id', it's already a flat record
            return item.id ? [item] : [];
          });
          
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
          console.error('Failed to load genres:', error);
          this.genresData = [];
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
        this.editGenre(item);
        break;
      case 'delete':
        this.deleteGenre(item);
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
    this.loadGenres();
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
    
    this.loadGenres();
  }

  /**
   * 🚀 Optimistic UI update for toggle
   */
  onToggleChange(event: {item: any, field: string, value: boolean}) {
    const genreId = event.item.id;
    const genreName = event.item.name;
    
    // 1. Optimistic update - update UI immediately
    this.updateGenreInList(genreId, { is_active: event.value });
    this.cdr.markForCheck();
    
    // 2. Sync with server
    const operation = event.value ? this.genreService.enableGenre : this.genreService.disableGenre;
    
    operation.call(this.genreService, [genreId])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const message = event.value 
              ? `Genre "${genreName}" is now active and available.`
              : `Genre "${genreName}" has been set to inactive.`;
            const title = event.value ? 'Genre Activated' : 'Genre Deactivated';
            
            if (event.value) {
              this.toastService.activated(message, title);
            } else {
              this.toastService.inactive(message, title);
            }
          } else {
            // Revert on API failure
            this.revertToggleState(genreId, !event.value);
          }
        },
        error: (error) => {
          console.error('Failed to update genre:', error);
          // Revert on error
          this.revertToggleState(genreId, !event.value);
        }
      });
  }

  /**
   * 🚀 Update genre in local list (optimistic update)
   */
  private updateGenreInList(id: string, updates: Partial<Genre>) {
    this.genresData = this.genresData.map(genre => 
      genre.id === id ? { ...genre, ...updates } : genre
    );
  }

  // 🆕 BULK OPERATIONS

  /**
   * Handle bulk actions from data table
   */
  onBulkAction(event: BulkSelectionEvent) {
    
    if (event.selectedIds.length === 0) {
      this.toastService.warning('Please select at least one genre.', 'No Selection');
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
    const selectedGenres = this.genresData.filter(genre => selectedIds.includes(genre.id));
    const genreNames = selectedGenres.map(g => g.name).join(', ');
    const count = selectedIds.length;
    
    if (operation === 'enable') {
      this.confirmationConfig = {
        title: 'Enable Genres',
        message: `Are you sure you want to <strong>enable</strong> ${count} genre(s)?<br><br><div class="text-muted small">${genreNames}</div>`,
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
        title: 'Disable Genres',
        message: `Are you sure you want to <strong>disable</strong> ${count} genre(s)?<br><br><div class="text-muted small">${genreNames}</div>`,
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
  private revertToggleState(genreId: string, originalValue: boolean) {
    this.updateGenreInList(genreId, { is_active: originalValue });
    this.cdr.markForCheck();
  }

  /**
   * Open Add Genre Modal
   */
  openAddGenreModal() {
    this.selectedGenre = null;
    this.showGenreModal = true;
  }

  /**
   * Edit genre
   */
  private editGenre(genre: any) {
    console.log('Editing genre:', genre);
    this.selectedGenre = {
      id: genre.id,
      name: genre.name,
      description: genre.description,
      is_active: genre.is_active
    };
    this.showGenreModal = true;
  }

  /**
   * Handle modal close
   */
  onGenreModalClosed() {
    this.showGenreModal = false;
    this.selectedGenre = null;
    this.modalLoading = false;
  }

  /**
   * Handle genre save from modal
   */
  onGenreSaved(genreData: Genre) {
    this.modalLoading = true;
    
    // Prepare the request data
    const genreRequest = {
      id: genreData.id,
      name: genreData.name,
      description: genreData.description,
      is_active: genreData.is_active
    };

    this.genreService.storeGenre(genreRequest).subscribe({
      next: (response) => {
        console.log('Genre save response:', response);
        
        if (genreData.id) {
          // Update existing genre
          this.toastService.success(
            `"${genreData.name}" has been updated successfully!`,
            'Genre Updated'
          );
        } else {
          // Add new genre
          this.toastService.success(
            `"${genreData.name}" has been created successfully!`,
            'Genre Created'
          );
        }
        
        this.modalLoading = false;
        this.onGenreModalClosed();
        
        // Refresh the genre list to show the latest data
        this.loadGenres();
      },
      error: (error) => {
        console.error('Failed to save genre:', error);
        this.modalLoading = false;
        // Don't close modal on error so user can try again
      }
    });
  }


  /**
   * Delete genre
   */
  private deleteGenre(genre: any) {
    console.log('Deleting genre:', genre);
    
    // Set up confirmation modal
    this.genreToDelete = genre;
    this.confirmationConfig = {
      title: 'Delete Genre',
      message: `Are you sure you want to delete <strong>"${genre.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
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
    // Handle single genre deletion
    if (this.genreToDelete) {
      this.confirmationConfig.loading = true;
      
      this.genreService.deleteGenre(this.genreToDelete.id).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success(
              `Genre "${this.genreToDelete!.name}" has been deleted successfully!`,
              'Genre Deleted'
            );
            // Refresh the data to show updated list
            this.loadGenres();
          }
          // Reset state
          this.showConfirmationModal = false;
          this.genreToDelete = null;
          this.confirmationConfig.loading = false;
        },
        error: (error) => {
          console.error('Failed to delete genre:', error);
          // Reset state on error
          this.showConfirmationModal = false;
          this.genreToDelete = null;
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
        this.genreService.enableGenre(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.activated(
                `${selectedIds.length} genre(s) have been enabled successfully!`,
                'Genres Enabled'
              );
              this.loadGenres(); // Refresh data from API
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to enable genres:', error);
            this.resetBulkOperation();
          }
        });
      } else if (operation === 'disable') {
        this.genreService.disableGenre(selectedIds).subscribe({
          next: (success) => {
            if (success) {
              this.toastService.inactive(
                `${selectedIds.length} genre(s) have been disabled successfully!`,
                'Genres Disabled'
              );
              this.loadGenres(); // Refresh data from API
            }
            this.resetBulkOperation();
          },
          error: (error) => {
            console.error('Failed to disable genres:', error);
            this.resetBulkOperation();
          }
        });
      }
    }
  }

  onDeleteCancelled() {
    this.showConfirmationModal = false;
    this.genreToDelete = null;
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