import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { ScreenService } from '../../services/screen.service';
import { TheatreService } from '../../services/theatre.service';
import { SeatTypeService } from '../../services/seat-type.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-screen-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BaseModalComponent],
  templateUrl: './screen-modal.component.html',
  styleUrls: ['./screen-modal.component.scss']
})
export class ScreenModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;
  theatres: any[] = [];
  theatresLoading = false;
  seatTypes: any[] = [];
  seatTypesLoading = false;
  
  // Seat layout
  seats: any[] = []; // Array of all seats with { row, col, name, typeId }
  selectedSeatForEdit: any = null;
  selectedRowsForBulkEdit: number[] = []; // Array of selected row indices
  selectedColumnsForBulkEdit: number[] = []; // Array of selected column indices
  showRowStatusMenu: number | null = null; // Which row's status menu is open
  showColumnStatusMenu: number | null = null; // Which column's status menu is open
  openSeatStatusMenu: string | null = null; // Which seat's kebab menu is open (seat.name)
  private destroy$ = new Subject<void>();

  modalConfig: ModalConfig = {
    title: 'Add Screen',
    icon: 'tv',
    size: 'lg',
    primaryButtonText: 'Save',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private service: ScreenService,
    private theatreService: TheatreService,
    private seatTypeService: SeatTypeService,
    private toastr: ToastrService,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { 
    this.initializeForm();
    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      this.closeSeatTypeDropdown();
      this.showRowStatusMenu = null;
      this.showColumnStatusMenu = null;
      this.openSeatStatusMenu = null;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.loadTheatres();
      this.loadSeatTypes();
    }
    if (this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 0);
    }
  }

  private loadTheatres(): void {
    if (this.theatres.length) return;
    this.theatresLoading = true;
    this.theatreService.getList({ page: 1, size: 200 }).subscribe({
      next: (response) => {
        // Extract from nested structure: { data: [{ "theatre": [...] }] }
        this.theatres = response.data?.flatMap((item: any) => {
          const records = item['theatre'] || item['theatres'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        }) || [];
        this.theatresLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.theatresLoading = false; }
    });
  }

  private loadSeatTypes(): void {
    if (this.seatTypes.length) return;
    this.seatTypesLoading = true;
    this.seatTypeService.getList({ page: 1, size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Extract from nested structure: { data: [{ "seat-types": [...] }] }
          this.seatTypes = response.data?.flatMap((item: any) => {
            const records = item['seat-types'] || item['seat_types'] || item['seatTypes'] || [];
            if (Array.isArray(records)) return records;
            return item.id ? [item] : [];
          }) || [];
          this.seatTypesLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.seatTypesLoading = false; }
      });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      screenName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      theatreId: ['', [Validators.required]],
      rows: ['', [Validators.required, Validators.min(1), Validators.max(50)]],
      columns: ['', [Validators.required, Validators.min(1), Validators.max(50)]],
      screenType: ['', [Validators.required]],
      soundSystem: ['', [Validators.minLength(2), Validators.maxLength(50)]],
      breakTime: [10, [Validators.required, Validators.min(0), Validators.max(60)]],
      isActive: [true, [Validators.required]]
    });

    // Watch rows/columns changes to regenerate seat layout
    this.form.get('rows')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.regenerateSeatLayout());
    this.form.get('columns')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.regenerateSeatLayout());
    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private regenerateSeatLayout(): void {
    const rows = this.form.get('rows')?.value;
    const columns = this.form.get('columns')?.value;
    if (rows && columns) {
      this.seats = this.generateSeats(rows, columns);
      this.cdr.markForCheck();
    }
  }

  private generateSeats(rows: number, columns: number): any[] {
    const seats: any[] = [];
    // Get default Regular type ID
    const defaultType = this.seatTypes.find(t => t?.code === 'R');
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const rowLabel = this.getRowLabel(row); // A, B... Z, AA, AB... AZ, BA... etc.
        const seatName = `${rowLabel}${col + 1}`;
        seats.push({
          row,
          col,
          name: seatName,
          typeId: defaultType?.id || '', // Default to Regular type
          type: defaultType || null
        });
      }
    }
    return seats;
  }

  /**
   * Convert row index to label: 0→A, 1→B... 25→Z, 26→AA, 27→AB... 51→AZ, 52→BA...
   */
  private getRowLabel(rowIndex: number): string {
    if (rowIndex < 26) {
      return String.fromCharCode(65 + rowIndex); // A-Z
    }
    // For AA, AB... AZ, BA... calculate prefix and letter
    const letterIndex = rowIndex - 26;
    const prefix = String.fromCharCode(65 + Math.floor(letterIndex / 26));
    const letter = String.fromCharCode(65 + (letterIndex % 26));
    return prefix + letter;
  }

  getTypeNameById(typeId: string): string {
    if (!typeId) return 'Select Type';
    const type = this.seatTypes.find(t => t?.id === typeId);
    return type?.name || 'Unknown';
  }

  fillAllSeatsWithType(typeId: string): void {
    if (!typeId) {
      this.toastr.error('Seat type not found', 'Error');
      return;
    }
    this.seats.forEach(seat => seat.typeId = typeId);
    this.cdr.markForCheck();
  }

  fillAllRegular(): void {
    const regularType = this.seatTypes.find(t => t?.code === 'R');
    if (regularType?.id) {
      this.fillAllSeatsWithType(regularType.id);
    }
  }

  fillAllPremium(): void {
    const premiumType = this.seatTypes.find(t => t?.code === 'P');
    if (premiumType?.id) {
      this.fillAllSeatsWithType(premiumType.id);
    }
  }

  fillAllVIP(): void {
    const vipType = this.seatTypes.find(t => t?.code === 'V');
    if (vipType?.id) {
      this.fillAllSeatsWithType(vipType.id);
    }
  }

  clearAllSeats(): void {
    this.seats.forEach(seat => seat.typeId = '');
    this.cdr.markForCheck();
  }

  hasRegularType(): boolean {
    return !!this.seatTypes.find(t => t?.code === 'R');
  }

  hasPremiumType(): boolean {
    return !!this.seatTypes.find(t => t?.code === 'P');
  }

  hasVIPType(): boolean {
    return !!this.seatTypes.find(t => t?.code === 'V');
  }

  trackByFn(index: number): number {
    return index;
  }

  getUnassignedSeatsCount(): number {
    return this.seats.filter(s => !s.typeId).length;
  }

  getSeatTypeById(typeId: string): any {
    return this.seatTypes.find(t => t?.id === typeId);
  }

  getSeatTypeBadgeClass(typeId: string): any {
    const type = this.getSeatTypeById(typeId);
    if (!type) return 'bg-danger';
    switch (type.code) {
      case 'R': return 'bg-success';
      case 'P': return 'bg-primary';
      case 'V': return 'bg-warning';
      case 'X': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  // Grid layout helpers
  getGroupedSeats(): any[] {
    const grouped: { [key: number]: any } = {};
    this.seats.forEach(seat => {
      if (!grouped[seat.row]) {
        grouped[seat.row] = { row: this.getRowLabel(seat.row), seats: [] };
      }
      grouped[seat.row].seats.push(seat);
    });
    return Object.values(grouped);
  }

  getColumnNumbers(): number[] {
    const columns = new Set<number>();
    this.seats.forEach(seat => columns.add(seat.col + 1));
    return Array.from(columns).sort((a, b) => a - b);
  }

  getSeatTypeCode(typeId: string): string {
    if (!typeId) return '';
    const type = this.getSeatTypeById(typeId);
    return type?.code || '';
  }

  openSeatTypeDropdown(seat: any, event: Event): void {
    event.stopPropagation();
    this.selectedSeatForEdit = seat;
  }

  closeSeatTypeDropdown(): void {
    this.selectedSeatForEdit = null;
  }

  // ========== ROW & COLUMN SELECTION METHODS ==========

  toggleRowSelection(rowIndex: number): void {
    const index = this.selectedRowsForBulkEdit.indexOf(rowIndex);
    if (index > -1) {
      this.selectedRowsForBulkEdit.splice(index, 1);
    } else {
      this.selectedRowsForBulkEdit.push(rowIndex);
    }
    this.cdr.markForCheck();
  }

  toggleColumnSelection(colIndex: number): void {
    const index = this.selectedColumnsForBulkEdit.indexOf(colIndex);
    if (index > -1) {
      this.selectedColumnsForBulkEdit.splice(index, 1);
    } else {
      this.selectedColumnsForBulkEdit.push(colIndex);
    }
    this.cdr.markForCheck();
  }

  isRowSelected(rowIndex: number): boolean {
    return this.selectedRowsForBulkEdit.includes(rowIndex);
  }

  isColumnSelected(colIndex: number): boolean {
    return this.selectedColumnsForBulkEdit.includes(colIndex);
  }

  changeAllSelectedRowsStatus(typeId: string): void {
    if (!typeId) return;
    this.selectedRowsForBulkEdit.forEach(rowIndex => {
      this.seats.forEach(seat => {
        if (seat.row === rowIndex) {
          seat.typeId = typeId;
        }
      });
    });
    this.showRowStatusMenu = null;
    this.selectedRowsForBulkEdit = [];
    this.cdr.markForCheck();
  }

  changeAllSelectedColumnsStatus(typeId: string): void {
    if (!typeId) return;
    this.selectedColumnsForBulkEdit.forEach(colIndex => {
      this.seats.forEach(seat => {
        if (seat.col === colIndex) {
          seat.typeId = typeId;
        }
      });
    });
    this.showColumnStatusMenu = null;
    this.selectedColumnsForBulkEdit = [];
    this.cdr.markForCheck();
  }

  changeSingleSeatStatus(seat: any, typeId: string): void {
    if (!typeId) return;
    seat.typeId = typeId;
    this.openSeatStatusMenu = null;
    this.cdr.markForCheck();
  }

  getSelectedRowsCount(): number {
    return this.selectedRowsForBulkEdit.length;
  }

  getSelectedColumnsCount(): number {
    return this.selectedColumnsForBulkEdit.length;
  }

  clearRowSelection(): void {
    this.selectedRowsForBulkEdit = [];
    this.cdr.markForCheck();
  }

  clearColumnSelection(): void {
    this.selectedColumnsForBulkEdit = [];
    this.cdr.markForCheck();
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Screen';
      this.modalConfig.primaryButtonText = 'Update';
    } else {
      this.modalConfig.title = 'Add Screen';
      this.modalConfig.primaryButtonText = 'Create';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        screenName: this.item.screenName || '',
        theatreId: this.item.theatreId || '',
        rows: this.item.rows || 5,
        columns: this.item.columns || 10,
        screenType: this.item.screenType || '',
        soundSystem: this.item.soundSystem || '',
        breakTime: this.item.breakTime || 10,
        isActive: this.item.isActive !== undefined ? this.item.isActive : true
      }, { emitEvent: false });

      // Regenerate seat layout with existing data
      if (this.item.rows && this.item.columns) {
        this.seats = this.generateSeats(this.item.rows, this.item.columns);
        // If item has seats data, populate typeId for each seat
        if (Array.isArray(this.item.seats)) {
          this.item.seats.forEach((seat: any) => {
            const seatInGrid = this.seats.find(s => s.name === seat.name);
            if (seatInGrid) {
              seatInGrid.typeId = seat.typeId || '';
            }
          });
        }
      }
      setTimeout(() => this.updateButtonState(), 200);
    } else {
      this.seats = [];
    }
  }

  onModalClose(): void { this.resetForm(); this.closed.emit(); }

  onModalSave(): void {
    if (!this.form.valid) {
      this.markFormGroupTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    if (this.seats.length === 0) {
      this.toastr.error('Please generate seat layout (set rows and columns)', 'Validation Error');
      return;
    }

    // Check if all seats have types selected
    const unassignedSeats = this.seats.filter(s => !s.typeId);
    if (unassignedSeats.length > 0) {
      this.toastr.error(`Please select seat type for all ${unassignedSeats.length} seat(s)`, 'Validation Error');
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.form.value;
    const itemData = {
      stepSlug: 'v1',
      action: this.item?.id ? 'UPDATE' : 'CREATE',
      ...(this.item?.id && { id: this.item.id }),
      formData: {
        ...(this.item?.id && { id: this.item.id }),
        screenName: formValue.screenName?.trim() || '',
        theatreId: formValue.theatreId || '',
        rows: Number(formValue.rows) || 0,
        columns: Number(formValue.columns) || 0,
        screenType: formValue.screenType?.trim() || '',
        soundSystem: formValue.soundSystem?.trim() || '',
        breakTime: Number(formValue.breakTime) || 0,
        seats: this.seats.map(seat => ({
          seatName: seat.name,
          row: seat.row,
          col: seat.col,
          typeId: seat.typeId
        })),
        isActive: formValue.isActive || false
      }
    };

    this.service.save(itemData).subscribe({
      next: (savedItem) => { this.itemSaved.emit(savedItem); this.resetLoadingState(); this.resetForm(); },
      error: (error) => {
        this.handleSaveError(error);
        this.resetLoadingState();
      }
    });
  }

  private handleSaveError(error: any): void {
    let errorMessage = 'Failed to save. Please try again.';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    this.toastr.error(errorMessage, 'Save Error');
  }

  private resetLoadingState(): void { this.modalConfig.primaryButtonLoading = false; this.updateButtonState(); }

  private resetForm(): void { 
    this.form.reset({ isActive: true, breakTime: 10 }); 
    this.form.markAsUntouched(); 
    this.seats = [];
  }

  private markFormGroupTouched(): void { 
    Object.keys(this.form.controls).forEach(key => { 
      this.form.get(key)?.markAsTouched(); 
    }); 
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      screenName: 'Screen Name', theatreId: 'Theatre', rows: 'Rows', columns: 'Columns',
      screenType: 'Screen Type', soundSystem: 'Sound System', breakTime: 'Break Time (mins)', isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
