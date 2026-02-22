import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';

// Shared Components
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ArtistModalComponent } from '../../../shared/components/artist-modal/artist-modal.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';

// Interfaces
import { TableConfig, TableActionEvent, TableColumn } from '../../../shared/interfaces/table.interface';
import { Artist, ArtistPageRequest, ArtistResponse } from '../../../shared/interfaces/artist.interface';

// Services
import { ArtistService } from '../../../shared/services/artist.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-artists',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    DataTableComponent, 
    ArtistModalComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './artists.component.html',
  styleUrls: ['./artists.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistsComponent implements OnInit, OnDestroy {
  // Optimistic UI updates for perceived performance
  private optimisticUpdates = new Map<string, Artist>();
  
  // Memory leak prevention
  private destroy$ = new Subject<void>();
  
  // Component state
  artists: Artist[] = [];
  loading = false;
  searchControl = new FormControl('');
  
  // Modal states
  showArtistModal = false;
  showConfirmModal = false;
  selectedArtist: Artist | null = null;
  artistToDelete: Artist | null = null;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  pageSize = 10;
  
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Artists Management',
    entityName: 'Artist',
    apiEndpoint: '/api/artists',
    searchable: true,
    paginated: true,
    pageSize: this.pageSize,
    sortable: true,
    columns: [
      {
        header: 'Name',
        field: 'full_name',
        type: 'text',
        sortable: true,
        width: '200px'
      },
      {
        header: 'Email',
        field: 'email',
        type: 'email',
        sortable: true,
        width: '220px'
      },
      {
        header: 'Type',
        field: 'artist_type_name',
        type: 'badge',
        sortable: true,
        width: '120px',
        align: 'center'
      },
      {
        header: 'Movies',
        field: 'movies_count',
        type: 'number',
        sortable: true,
        width: '100px',
        align: 'center'
      },
      {
        header: 'Rating',
        field: 'rating',
        type: 'number',
        sortable: true,
        width: '100px',
        align: 'center'
      },
      {
        header: 'Status',
        field: 'is_active',
        type: 'toggle',
        sortable: true,
        width: '120px',
        align: 'center'
      },
      {
        header: 'Created',
        field: 'created_at',
        type: 'date',
        sortable: true,
        width: '120px'
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

  constructor(
    private artistService: ArtistService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadArtists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Setup debounced search with performance optimization
  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300), // Prevent API spam
        distinctUntilChanged(), // Only search when value actually changes
        takeUntil(this.destroy$) // Prevent memory leaks
      )
      .subscribe(searchTerm => {
        this.currentPage = 1;
        this.loadArtists(searchTerm || '');
      });
  }

  // Load artists with caching and error handling
  loadArtists(searchTerm = '', page = this.currentPage): void {
    this.loading = true;
    this.cdr.detectChanges();

    const request: ArtistPageRequest = {
      page,
      size: this.pageSize,
      search: searchTerm.trim() || undefined
    };

    this.artistService.getArtists(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          // Extract and flatten artists from the nested structure
          // API returns: { data: [{ "artist": [...] }] } - flatMap unwraps this
          const extractedData = response.data.flatMap((item: any) => {
            const artists = item.artist || item.artists || [];
            if (Array.isArray(artists)) {
              return artists;
            }
            // If item has 'id', it's already a flat record
            return item.id ? [item] : [];
          });
          // Apply optimistic updates if any
          this.artists = this.applyOptimisticUpdates(extractedData);
          this.totalItems = response.totalElements;
          this.totalPages = response.totalPages;
          this.currentPage = response.page;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading artists:', error);
          this.toastr.error('Failed to load artists', 'Error');
          this.artists = [];
          this.cdr.detectChanges();
        }
      });
  }

  // Apply optimistic updates to maintain UI responsiveness
  private applyOptimisticUpdates(artists: Artist[]): Artist[] {
    return artists.map(artist => {
      const optimisticUpdate = this.optimisticUpdates.get(artist.id!);
      return optimisticUpdate ? { ...artist, ...optimisticUpdate } : artist;
    });
  }

  // Handle search with performance optimization
  onSearch(searchTerm: string): void {
    this.searchControl.setValue(searchTerm, { emitEvent: false });
    this.currentPage = 1;
    this.loadArtists(searchTerm);
  }

  // Handle pagination
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadArtists(this.searchControl.value || '', page);
  }

  // Handle sorting
  onSort(event: { field: string; order: 'asc' | 'desc' }): void {
    // TODO: Implement sorting when API supports it
    console.log('Sort event:', event);
  }

  // Handle toggle changes with optimistic updates
  onToggleChange(event: { item: any; field: string; value: boolean }): void {
    const artist = event.item as Artist;
    const newStatus = event.value;
    
    // Optimistic update
    this.optimisticUpdates.set(artist.id!, { ...artist, is_active: newStatus });
    
    // Update UI immediately for better UX
    const artistIndex = this.artists.findIndex(g => g.id === artist.id);
    if (artistIndex !== -1) {
      this.artists[artistIndex] = { ...this.artists[artistIndex], is_active: newStatus };
      this.cdr.detectChanges();
    }

    // Perform bulk enable/disable
    const operation = newStatus 
      ? this.artistService.enableArtist([artist.id!])
      : this.artistService.disableArtist([artist.id!]);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove optimistic update on success
          this.optimisticUpdates.delete(artist.id!);
          const message = newStatus ? 'Artist enabled successfully' : 'Artist disabled successfully';
          this.toastr.success(message);
        },
        error: (error) => {
          // Revert optimistic update on error
          this.optimisticUpdates.delete(artist.id!);
          if (artistIndex !== -1) {
            this.artists[artistIndex] = { ...this.artists[artistIndex], is_active: !newStatus };
            this.cdr.detectChanges();
          }
          console.error('Error updating artist status:', error);
          this.toastr.error('Failed to update artist status', 'Error');
        }
      });
  }

  // Handle table actions
  onTableAction(event: TableActionEvent): void {
    const artist = event.item as Artist;
    
    switch (event.action) {
      case 'edit':
        this.openEditModal(artist);
        break;
      case 'delete':
        this.openDeleteConfirmation(artist);
        break;
    }
  }

  // Modal Management
  openCreateModal(): void {
    this.selectedArtist = null;
    this.showArtistModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(artist: Artist): void {
    this.selectedArtist = { ...artist };
    this.showArtistModal = true;
    this.cdr.detectChanges();
  }

  closeArtistModal(): void {
    this.showArtistModal = false;
    this.selectedArtist = null;
    this.cdr.detectChanges();
  }

  onArtistSaved(artist: any): void {
    this.closeArtistModal();
    this.loadArtists(this.searchControl.value || '', this.currentPage);
  }

  // Delete Confirmation
  openDeleteConfirmation(artist: Artist): void {
    this.artistToDelete = artist;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteConfirmation(): void {
    this.showConfirmModal = false;
    this.artistToDelete = null;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.artistToDelete) return;

    const artistId = this.artistToDelete.id!;
    const artistName = this.artistToDelete.full_name;

    // Optimistic update - remove from UI immediately
    this.artists = this.artists.filter(g => g.id !== artistId);
    this.cdr.detectChanges();
    
    this.artistService.deleteArtist(artistId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(`${artistName} deleted successfully`);
          this.closeDeleteConfirmation();
          this.loadArtists(this.searchControl.value || '', this.currentPage);
        },
        error: (error) => {
          console.error('Error deleting artist:', error);
          this.toastr.error('Failed to delete artist', 'Error');
          // Revert optimistic update on error
          this.loadArtists(this.searchControl.value || '', this.currentPage);
          this.closeDeleteConfirmation();
        }
      });
  }

  // Utility getters for template
  get pagination() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalItems: this.totalItems,
      pageSize: this.pageSize
    };
  }

  get artistsData() {
    return this.artists;
  }
}