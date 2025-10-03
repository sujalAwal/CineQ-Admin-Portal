import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ToastService } from '../../../shared/services/toast.service';
import { 
  TableConfig, 
  TableColumn, 
  TableAction, 
  PaginationInfo,
  TableActionEvent 
} from '../../../shared/interfaces/table.interface';

@Component({
  selector: 'app-artists',
  imports: [CommonModule, SharedModule, DataTableComponent],
  templateUrl: './artists.component.html',
  styleUrls: ['./artists.component.scss']
})
export class ArtistsComponent implements OnInit {
  
  // Table configuration - different from genres to show flexibility
  tableConfig: TableConfig = {
    title: 'Artists Management',
    entityName: 'Artist',
    apiEndpoint: '/api/artists',
    searchable: true,
    paginated: true,
    pageSize: 15, // Different page size
    sortable: true,
    columns: [
      {
        header: 'Avatar',
        field: 'avatar',
        type: 'image',
        sortable: false,
        width: '80px',
        align: 'center'
      },
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
        header: 'Joined',
        field: 'created_at',
        type: 'date',
        sortable: true,
        width: '120px',
        align: 'center'
      }
    ],
    actions: [
      {
        label: 'View Profile',
        icon: 'ti ti-user',
        type: 'view',
        class: 'btn-outline-info',
        visible: true
      },
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
  artistsData: any[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 15
  };

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.loadArtists();
  }

  /**
   * Load artists data (simulated API call)
   */
  loadArtists(filters?: any) {
    this.loading = true;
    
    // Simulate API call delay
    setTimeout(() => {
      // Mock data with different structure to show flexibility
      this.artistsData =[] ;

      // Mock pagination - different total
      this.pagination = {
        currentPage: 1,
        totalPages: 8,
        totalItems: 117,
        pageSize: 15
      };

      this.loading = false;
    }, 800);
  }

  /**
   * Handle table actions (view, edit, delete, movies)
   */
  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'view':
        this.viewArtist(item);
        break;
      case 'edit':
        this.editArtist(item);
        break;
      case 'movies':
        this.viewArtistMovies(item);
        break;
      case 'delete':
        this.deleteArtist(item);
        break;
    }
  }

  /**
   * Handle search functionality
   */
  onSearch(searchTerm: string) {
    console.log('Searching artists for:', searchTerm);
    // TODO: Call API with search parameter
    this.loadArtists({ search: searchTerm });
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    console.log('Artists page changed to:', page);
    this.pagination.currentPage = page;
    // TODO: Call API with page parameter
    this.loadArtists({ page: page });
  }

  /**
   * Handle sorting
   */
  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    console.log('Sorting artists by:', sortInfo);
    // TODO: Call API with sort parameters
    this.loadArtists({ 
      sortBy: sortInfo.field, 
      sortOrder: sortInfo.order 
    });
  }

  /**
   * Handle status toggle
   */
  onToggleChange(event: {item: any, field: string, value: boolean}) {
    console.log('Artist toggle changed:', event);
    
    // Simulate API call to update status
    this.loading = true;
    setTimeout(() => {
      // Update local data
      const artist = this.artistsData.find(a => a.id === event.item.id);
      if (artist) {
        artist[event.field] = event.value;
      }
      
      // Show appropriate toast based on the new status
      if (event.value) {
        this.toastService.activated(
          `${event.item.full_name} is now active and available.`,
          'Artist Activated'
        );
      } else {
        this.toastService.inactive(
          `${event.item.full_name} has been set to inactive.`,
          'Artist Deactivated'
        );
      }
      
      this.loading = false;
    }, 600);
  }

  /**
   * View artist profile
   */
  private viewArtist(artist: any) {
    console.log('Viewing artist profile:', artist);
    this.toastService.info(
      `Opening profile for ${artist.full_name}`, 
      'Artist Profile'
    );
    // TODO: Navigate to artist profile page or open modal
  }

  /**
   * Edit artist
   */
  private editArtist(artist: any) {
    console.log('Editing artist:', artist);
    this.toastService.info(
      `Editing ${artist.full_name}'s information`, 
      'Edit Artist'
    );
    // TODO: Navigate to edit page or open edit modal
  }

  /**
   * View artist's movies
   */
  private viewArtistMovies(artist: any) {
    console.log('Viewing movies for artist:', artist);
    this.toastService.info(
      `Loading ${artist.movies_count} movies for ${artist.full_name}`, 
      'Artist Movies'
    );
    // TODO: Navigate to movies page filtered by artist
  }

  /**
   * Delete artist
   */
  private deleteArtist(artist: any) {
    console.log('Deleting artist:', artist);
    
    if (confirm(`Are you sure you want to delete "${artist.full_name}"? This action cannot be undone.`)) {
      this.loading = true;
      
      setTimeout(() => {
        // Remove from local data
        this.artistsData = this.artistsData.filter(a => a.id !== artist.id);
        
        this.toastService.success(
          `${artist.full_name} has been deleted successfully!`,
          'Artist Deleted'
        );
        
        this.loading = false;
      }, 700);
    }
  }
}