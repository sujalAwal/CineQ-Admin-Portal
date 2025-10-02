import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { 
  TableColumn, 
  TableAction, 
  TableConfig, 
  PaginationInfo, 
  TableFilters,
  TableActionEvent 
} from '../../interfaces/table.interface';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Input properties
  @Input() config: TableConfig = {} as TableConfig;
  @Input() data: any[] = [];
  @Input() loading: boolean = false;
  @Input() pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10
  };

  // Output events
  @Output() actionClick = new EventEmitter<TableActionEvent>();
  @Output() search = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() sort = new EventEmitter<{field: string, order: 'asc' | 'desc'}>();
  @Output() toggleChange = new EventEmitter<{item: any, field: string, value: boolean}>();

  // Component state
  searchTerm: string = '';
  currentSort: {field: string, order: 'asc' | 'desc'} | null = null;
  pageNumbers: number[] = [];

  ngOnInit() {
    // Setup search debouncing (wait 300ms after user stops typing)
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.search.emit(searchTerm);
      });

    this.calculatePageNumbers();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only recalculate page numbers when pagination data changes
    if (changes['pagination'] && !changes['pagination'].firstChange) {
      this.calculatePageNumbers();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle search input change
   */
  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Handle manual search button click or Enter key
   */
  onManualSearch() {
    this.search.emit(this.searchTerm);
  }

  /**
   * Get column value with support for nested properties
   */
  getColumnValue(item: any, column: TableColumn): any {
    const value = this.getNestedValue(item, column.field);
    
    switch (column.type) {
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'currency':
        return value ? `$${parseFloat(value).toFixed(2)}` : '$0.00';
      case 'number':
        return value || 0;
      default:
        return value || '-';
    }
  }

  /**
   * Get nested object value (e.g., 'user.profile.name')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Handle column sorting
   */
  onSort(column: TableColumn) {
    if (!column.sortable) return;

    const newOrder = this.currentSort?.field === column.field && this.currentSort.order === 'asc' 
      ? 'desc' 
      : 'asc';

    this.currentSort = { field: column.field, order: newOrder };
    this.sort.emit(this.currentSort);
  }

  /**
   * Get sort icon for column
   */
  getSortIcon(column: TableColumn): string {
    if (!column.sortable) return '';
    
    if (this.currentSort?.field !== column.field) {
      return 'ti ti-selector';
    }
    
    return this.currentSort.order === 'asc' ? 'ti ti-chevron-up' : 'ti ti-chevron-down';
  }

  /**
   * Handle action button clicks
   */
  onActionClick(action: TableAction, item: any) {
    this.actionClick.emit({
      action: action.type,
      item: item
    });
  }

  /**
   * Handle toggle switch changes
   */
  onToggleChange(item: any, column: TableColumn, event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = target.checked;
    
    this.toggleChange.emit({
      item: item,
      field: column.field,
      value: newValue
    });
  }

  /**
   * Check if toggle is disabled
   */
  isToggleDisabled(item: any, column: TableColumn): boolean {
    // Check if item has a specific disabled property
    const disabledField = column.field + '_disabled';
    return item[disabledField] || false;
  }

  /**
   * Handle pagination
   */
  onPageChange(page: number) {
    if (page < 1 || page > this.pagination.totalPages) return;
    this.pageChange.emit(page);
  }

  /**
   * Calculate page numbers for pagination
   */
  calculatePageNumbers() {
    const { currentPage, totalPages } = this.pagination;
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    this.pageNumbers = Array.from(
      { length: end - start + 1 }, 
      (_, i) => start + i
    );
  }

  /**
   * Get badge class for status values
   */
  getBadgeClass(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'bg-success' : 'bg-danger';
    }
    
    const lowerValue = String(value).toLowerCase();
    switch (lowerValue) {
      case 'active':
        return 'bg-success';
      case 'inactive':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Check if action is visible for this item
   */
  isActionVisible(action: TableAction, item: any): boolean {
    if (action.visible === false) return false;
    
    // Check item-specific visibility (e.g., can't delete admin user)
    const visibilityField = `can_${action.type}`;
    if (item.hasOwnProperty(visibilityField)) {
      return item[visibilityField];
    }
    
    return true;
  }

  /**
   * Get toggle value as boolean
   */
  getToggleValue(item: any, column: TableColumn): boolean {
    const value = this.getNestedValue(item, column.field);
    return Boolean(value);
  }

  /**
   * TrackBy function for ngFor performance optimization
   */
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * TrackBy function for columns
   */
  trackByColumnField(index: number, column: TableColumn): string {
    return column.field;
  }

  /**
   * Get column alignment class
   */
  getColumnAlignment(column: TableColumn): string {
    switch (column.align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-end';
      default:
        return '';
    }
  }

  /**
   * Reference to Math for use in template
   */
  Math = Math;
}