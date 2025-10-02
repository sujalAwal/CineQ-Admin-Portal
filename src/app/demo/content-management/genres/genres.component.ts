import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { GenreModalComponent } from '../../../shared/components/genre-modal/genre-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { Genre } from '../../../shared/interfaces/genre.interface';
import { 
  TableConfig, 
  TableColumn, 
  TableAction, 
  PaginationInfo,
  TableActionEvent 
} from '../../../shared/interfaces/table.interface';

@Component({
  selector: 'app-genres',
  imports: [CommonModule, SharedModule, DataTableComponent, GenreModalComponent],
  templateUrl: './genres.component.html',
  styleUrls: ['./genres.component.scss']
})
export class GenresComponent implements OnInit {
  
  // Table configuration
  tableConfig: TableConfig = {
    title: 'Genres Management',
    entityName: 'Genre',
    apiEndpoint: '/api/genres',
    searchable: true,
    paginated: true,
    pageSize: 10,
    sortable: true,
    columns: [
      {
        header: 'ID',
        field: 'id',
        type: 'number',
        sortable: true,
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
      {
        label: 'View',
        icon: 'ti ti-eye',
        type: 'view',
        class: 'btn-outline-primary',
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
  genresData: any[] = [];
  loading: boolean = false;
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  };

  // Modal state
  showGenreModal: boolean = false;
  selectedGenre: Genre | null = null;
  modalLoading: boolean = false;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.loadGenres();
  }

  /**
   * Load genres data (simulated API call)
   */
  loadGenres(filters?: any) {
    this.loading = true;
    
    // Simulate API call delay
    setTimeout(() => {
        
      // Mock data - replace with actual API call
      this.genresData = [
        {
          id: 1,
          name: 'Action',
          description: 'High-energy movies with intense sequences',
          is_active: true,
          created_at: '2024-01-15'
        },
        {
          id: 2,
          name: 'Comedy',
          description: 'Funny and entertaining movies',
          is_active: true,
          created_at: '2024-01-16'
        },
        {
          id: 3,
          name: 'Drama',
          description: 'Serious narrative movies with emotional themes',
          is_active: false,
          created_at: '2024-01-17'
        },
        {
          id: 4,
          name: 'Horror',
          description: 'Scary movies designed to frighten',
          is_active: true,
          is_active_disabled: true, // Cannot change is_active
          created_at: '2024-01-18',
        },
        {
          id: 5,
          name: 'Romance',
          description: 'Love stories and romantic relationships',
          is_active: true,
          created_at: '2024-01-19'
        }
      ];

      // Mock pagination
      this.pagination = {
        currentPage: 1,
        totalPages: 3,
        totalItems: 25,
        pageSize: 10
      };

      this.loading = false;
    }, 1000);
  }

  /**
   * Handle table actions (view, edit, delete)
   */
  onTableAction(event: TableActionEvent) {
    const { action, item } = event;

    switch (action) {
      case 'view':
        this.viewGenre(item);
        break;
      case 'edit':
        this.editGenre(item);
        break;
      case 'delete':
        this.deleteGenre(item);
        break;
    }
  }

  /**
   * Handle search functionality
   */
  onSearch(searchTerm: string) {
    console.log('Searching for:', searchTerm);
    // TODO: Call API with search parameter
    this.loadGenres({ search: searchTerm });
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    console.log('Page changed to:', page);
    this.pagination.currentPage = page;
    // TODO: Call API with page parameter
    this.loadGenres({ page: page });
  }

  /**
   * Handle sorting
   */
  onSort(sortInfo: {field: string, order: 'asc' | 'desc'}) {
    console.log('Sorting by:', sortInfo);
    // TODO: Call API with sort parameters
    this.loadGenres({ 
      sortBy: sortInfo.field, 
      sortOrder: sortInfo.order 
    });
  }

  /**
   * Handle is_active toggle
   */
  onToggleChange(event: {item: any, field: string, value: boolean}) {
    console.log('Toggle changed:', event);
    
    // Simulate API call to update is_active
    this.loading = true;
    setTimeout(() => {
      // Update local data
      const genre = this.genresData.find(g => g.id === event.item.id);
      if (genre) {
        genre[event.field] = event.value;
      }
      
      // Show appropriate toast based on the new is_active
      if (event.value) {
        this.toastService.activated(
          `Genre "${event.item.name}" is now active and available.`,
          'Genre Activated'
        );
      } else {
        this.toastService.inactive(
          `Genre "${event.item.name}" has been set to inactive.`,
          'Genre Deactivated'
        );
      }
      
      this.loading = false;
    }, 500);
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
    
    // Simulate API call
    setTimeout(() => {
      if (genreData.id) {
        // Update existing genre
        const index = this.genresData.findIndex(g => g.id === genreData.id);
        if (index !== -1) {
          this.genresData[index] = {
            ...this.genresData[index],
            name: genreData.name,
            description: genreData.description,
            is_active: genreData.is_active
          };
        }
        this.toastService.success(
          `"${genreData.name}" has been updated successfully!`,
          'Genre Updated'
        );
      } else {
        // Add new genre
        const newGenre = {
          id: this.genresData.length + 1,
          name: genreData.name,
          description: genreData.description,
          is_active: genreData.is_active,
          created_at: new Date().toISOString()
        };
        this.genresData = [newGenre, ...this.genresData];
        
        this.toastService.success(
          `"${genreData.name}" has been created successfully!`,
          'Genre Created'
        );
      }
      
      this.modalLoading = false;
      this.onGenreModalClosed();
    }, 1000);
  }

  /**
   * View genre details
   */
  private viewGenre(genre: any) {
    console.log('Viewing genre:', genre);
    this.toastService.info(`Viewing details for "${genre.name}"`, 'Genre Details');
    // TODO: Navigate to genre details page or open view modal
  }

  /**
   * Delete genre
   */
  private deleteGenre(genre: any) {
    console.log('Deleting genre:', genre);
    
    if (confirm(`Are you sure you want to delete "${genre.name}"?`)) {
      this.loading = true;
      
      setTimeout(() => {
        // Remove from local data
        this.genresData = this.genresData.filter(g => g.id !== genre.id);
        
        this.toastService.success(
          `"${genre.name}" has been deleted successfully!`,
          'Genre Deleted'
        );
        
        this.loading = false;
      }, 500);
    }
  }
}