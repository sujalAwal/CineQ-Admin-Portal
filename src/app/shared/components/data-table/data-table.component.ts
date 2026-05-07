import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { 
  TableColumn, 
  TableAction, 
  TableConfig, 
  PaginationInfo, 
  TableFilters,
  TableActionEvent,
  BulkSelectionEvent 
} from '../../interfaces/table.interface';
import { AuthService } from '../../services/auth.service';

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
  // 🆕 Bulk selection events
  @Output() bulkActionClick = new EventEmitter<BulkSelectionEvent>();
  @Output() refresh = new EventEmitter<void>();

  // Component state
  searchTerm: string = '';
  currentSort: {field: string, order: 'asc' | 'desc'} | null = null;
  pageNumbers: number[] = [];
  // 🆕 Bulk selection state
  selectedItems: Set<string> = new Set();
  isAllSelected: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
    
    // 🆕 Clear selections when data changes (e.g., page change, search)
    if (changes['data']) {
      this.clearSelection();
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
        return value ? this.formatNepaliCurrency(parseFloat(value)) : 'Rs 0.00';
      case 'number':
        return value || 0;
      default:
        return value || '-';
    }
  }

  /**
   * Format currency in Nepali Rupee (Rs) with Nepali number format
   * Nepali groups: 3 digits from right, then 2-digit groups
   * Example: 1234567 → Rs 12,34,567
   * Example: 1700 → Rs 1,700
   */
  private formatNepaliCurrency(amount: number): string {
    const formatted = amount.toFixed(2);
    const parts = formatted.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    // If number has 3 or fewer digits, no comma needed
    if (integerPart.length <= 3) {
      return `Rs ${formatted}`;
    }

    // Format with Nepali system: 3 digits from right, then 2-digit groups
    let result = '';
    let count = 0;
    for (let i = integerPart.length - 1; i >= 0; i--) {
      // Insert comma after: first 3 digits from right, then every 2 digits after that
      if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
        result = ',' + result;
      }
      result = integerPart[i] + result;
      count++;
    }

    return `Rs ${result}.${decimalPart}`;
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
    if (item[disabledField]) {
      return true;
    }
    return !this.authService.hasModulePermission(this.getPermissionApi(), 'update');
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
      // Success/Green statuses
      case 'active':
      case 'completed':
      case 'confirmed':
      case 'success':
        return 'bg-success';
      
      // Danger/Red statuses
      case 'inactive':
      case 'failed':
      case 'cancelled':
      case 'error':
        return 'bg-danger';
      
      // Warning/Yellow statuses
      case 'pending':
      case 'initiated':
      case 'reserved':
      case 'warning':
        return 'bg-warning';
      
      // Info/Blue statuses
      case 'processing':
      case 'booked':
      case 'info':
        return 'bg-info';
      
      // Default
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

    const actionName = this.mapTableActionToPermission(action.type);
    return this.authService.hasModulePermission(this.getPermissionApi(), actionName);
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

  // 🆕 BULK SELECTION METHODS

  /**
   * Toggle individual item selection
   */
  onItemSelect(item: any, event: Event): void {
    const target = event.target as HTMLInputElement;
    const itemId = item.id;

    if (target.checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
      this.isAllSelected = false;
    }

    // Update "select all" state
    this.updateSelectAllState();
  }

  /**
   * Toggle select all items
   */
  onSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.isAllSelected = target.checked;

    if (this.isAllSelected) {
      // Select all items on current page
      this.data.forEach(item => {
        this.selectedItems.add(item.id);
      });
    } else {
      // Deselect all items
      this.selectedItems.clear();
    }
  }

  /**
   * Check if individual item is selected
   */
  isItemSelected(item: any): boolean {
    return this.selectedItems.has(item.id);
  }

  /**
   * Update select all checkbox state based on individual selections
   */
  private updateSelectAllState(): void {
    const currentPageIds = this.data.map(item => item.id);
    const selectedOnCurrentPage = currentPageIds.filter(id => this.selectedItems.has(id));
    
    this.isAllSelected = currentPageIds.length > 0 && selectedOnCurrentPage.length === currentPageIds.length;
  }

  /**
   * Get count of selected items
   */
  getSelectedCount(): number {
    return this.selectedItems.size;
  }

  /**
   * Handle bulk action click
   */
  onBulkAction(actionType: string): void {
    if (!this.isBulkActionAllowed(actionType)) {
      return;
    }

    const selectedIds = Array.from(this.selectedItems);
    
    if (selectedIds.length === 0) {
      return;
    }

    this.bulkActionClick.emit({
      selectedIds: selectedIds,
      action: actionType
    });
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedItems.clear();
    this.isAllSelected = false;
  }

  /**
   * Handle refresh button click
   */
  onRefresh(): void {
    // Clear search text
    this.searchTerm = '';
    // Emit refresh event to parent
    this.refresh.emit();
  }

  /**
   * Reference to Math for use in template
   */
  Math = Math;

  isBulkActionAllowed(actionType: string): boolean {
    const mapped = this.mapBulkActionToPermission(actionType);
    if (!mapped) {
      return true;
    }

    return this.authService.hasModulePermission(this.getPermissionApi(), mapped);
  }

  private getPermissionApi(): string {
    if (this.config?.moduleApi) {
      return this.config.moduleApi;
    }
    return this.authService.normalizePath(this.router.url);
  }

  private mapTableActionToPermission(action: TableAction['type']): 'read' | 'update' | 'delete' {
    switch (action) {
      case 'view':
        return 'read';
      case 'edit':
        return 'update';
      case 'delete':
      default:
        return 'delete';
    }
  }

  private mapBulkActionToPermission(actionType: string): 'create' | 'update' | 'delete' | null {
    if (actionType === 'bulk-delete') {
      return 'delete';
    }
    if (actionType === 'bulk-enable' || actionType === 'bulk-disable') {
      return 'update';
    }
    return null;
  }
}