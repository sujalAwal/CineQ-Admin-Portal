import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { ShowtimeService } from '../../services/showtime.service';
import { MoviesCinemaService } from '../../services/movies-cinema.service';
import { ScreenService } from '../../services/screen.service';
import { TheatreService } from '../../services/theatre.service';
import { SeatTypeService } from '../../services/seat-type.service';
import { ShowtimeStatusService } from '../../services/showtime-status.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-showtime-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BaseModalComponent],
  templateUrl: './showtime-modal.component.html',
  styleUrls: ['./showtime-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShowtimeModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;
  movies: any[] = [];
  screens: any[] = [];
  theatres: any[] = [];
  showtimeStatuses: any[] = [];
  seatTypes: any[] = [];
  loadingDropdowns = false;
  screensLoading = false;

  seats: any[] = [];
  selectedRowsForBulkEdit: number[] = [];
  selectedColumnsForBulkEdit: number[] = [];
  seatTypePrices: { [typeId: string]: number } = {};
  showRowStatusMenu: number | null = null;
  showColumnStatusMenu: number | null = null;
  openSeatStatusMenu: string | null = null;
  pendingRowPrice: number | null = null;
  pendingColumnPrice: number | null = null;
  pendingSeatPrice: number | null = null;
  dropdownPosition: { top: number, left: number } = { top: 0, left: 0 };

  private destroy$ = new Subject<void>();

  readonly LANGUAGE_OPTIONS = [
    { value: 'ENG', label: 'English' },
    { value: 'HIN', label: 'Hindi' },
    { value: 'NEP', label: 'Nepali' },
    { value: 'MAL', label: 'Malayalam' },
    { value: 'MARA', label: 'Marathi' }
  ];

  readonly FORMAT_OPTIONS = [
    { value: '2D', label: '2D' },
    { value: '3D', label: '3D' },
    { value: 'IMAX', label: 'IMAX' },
    { value: '4DX', label: '4DX' }
  ];

  modalConfig: ModalConfig = {
    title: 'Add Showtime',
    icon: 'calendar-time',
    size: 'xl',
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
    private service: ShowtimeService,
    private moviesService: MoviesCinemaService,
    private screenService: ScreenService,
    private theatreService: TheatreService,
    private seatTypeService: SeatTypeService,
    private showtimeStatusService: ShowtimeStatusService,
    private toastr: ToastrService,
    public cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void { 
    this.initializeForm();
    document.addEventListener('click', () => {
      this.closeSeatTypeDropdown();
      this.showRowStatusMenu = null;
      this.showColumnStatusMenu = null;
      this.openSeatStatusMenu = null;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && this.isVisible) {
      this.loadDropdownData();
    }
    if (this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 0);
    }
  }

  private loadDropdownData(): void {
    if (this.movies.length && this.theatres.length && this.showtimeStatuses.length && this.seatTypes.length) return;

    this.loadingDropdowns = true;
    let pending = 4;
    const done = () => { 
      if (--pending === 0) { 
        this.loadingDropdowns = false;
        if (this.item && this.item.theatreId) {
          this.loadScreensByTheatre(this.item.theatreId);
        }
        this.cdr.markForCheck(); 
      } 
    };

    this.moviesService.getList({ page: 1, size: 200 }).subscribe({
      next: (response: any) => {
        this.movies = response.data.flatMap((item: any) => {
          const records = item['movies'] || item['movie'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });

    this.theatreService.getList({ page: 1, size: 200 }).subscribe({
      next: (response: any) => {
        this.theatres = response.data.flatMap((item: any) => {
          const records = item['theatre'] || item['theatres'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });

    this.showtimeStatusService.getList({ page: 1, size: 100 }).subscribe({
      next: (response: any) => {
        this.showtimeStatuses = response.data.flatMap((item: any) => {
          const records = item['showtime-statuses'] || item['showtime-status'] || item['showtimeStatuses'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });

    this.seatTypeService.getList({ page: 1, size: 100 }).subscribe({
      next: (response: any) => {
        this.seatTypes = response.data?.flatMap((item: any) => {
          const records = item['seat-types'] || item['seat_types'] || item['seatTypes'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        }) || [];
        done();
      },
      error: () => done()
    });
  }

  private loadScreensByTheatre(theatreId: string): void {
    if (!theatreId) {
      this.screens = [];
      return;
    }
    this.screensLoading = true;
    this.screenService.getScreensByTheatre(theatreId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        this.screens = response || [];
        this.screensLoading = false;
        if (this.item && this.item.screenId) {
          this.loadScreenSeatLayout(this.item.screenId);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.screensLoading = false;
        this.toastr.error('Failed to load screens', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  private loadScreenSeatLayout(screenId: string): void {
    if (!screenId) {
      this.seats = [];
      return;
    }
    const selectedScreen = this.screens.find(s => s.id === screenId);
    if (selectedScreen && selectedScreen.seatLayout) {
      this.populateSeatLayout(selectedScreen);
    } else {
      this.seats = [];
    }
  }

  private populateSeatLayout(screen: any): void {
    if (!screen.seatLayout || !Array.isArray(screen.seatLayout)) {
      this.seats = [];
      return;
    }
    this.seats = this.generateSeatsFromLayout(screen.rows, screen.columns, screen.seatLayout);
    this.cdr.markForCheck();
  }

  private generateSeatsFromLayout(rows: number, columns: number, layoutData: any[]): any[] {
    const seats: any[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const rowLabel = this.getRowLabel(row);
        const seatName = `${rowLabel}${col + 1}`;
        const seatData = layoutData.find(s => s.seatName === seatName);
        const seatCode = seatData?.code;
        const matchedType = seatCode ? this.seatTypes.find(t => t.code === seatCode) : null;
        const typeId = matchedType?.id || '';
        seats.push({
          row, col, name: seatName,
          typeId: typeId,
          type: matchedType || null,
          price: typeId && this.seatTypePrices[typeId] ? this.seatTypePrices[typeId] : 0
        });
      }
    }
    return seats;
  }

  private getRowLabel(rowIndex: number): string {
    if (rowIndex < 26) return String.fromCharCode(65 + rowIndex);
    const letterIndex = rowIndex - 26;
    const prefix = String.fromCharCode(65 + Math.floor(letterIndex / 26));
    const letter = String.fromCharCode(65 + (letterIndex % 26));
    return prefix + letter;
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    this.modalConfig.title = this.item ? 'Edit Showtime' : 'Add Showtime';
    this.modalConfig.primaryButtonText = this.item ? 'Update' : 'Create';
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      movieId: ['', [Validators.required]],
      theatreId: ['', [Validators.required]],
      theatreName: [''],
      screenId: ['', [Validators.required]],
      screenName: [''],
      showDate: ['', [Validators.required]],
      showTime: ['', [Validators.required, Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      language: ['', [Validators.required]],
      format: ['', [Validators.required]],
      statusCode: ['', [Validators.required]],
      isActive: [true]
    });

    this.form.get('theatreId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(id => {
      if (id) {
        this.updateTheatreName();
        this.loadScreensByTheatre(id);
        this.form.patchValue({ screenId: '' }, { emitEvent: false });
        this.seats = [];
      }
      this.cdr.markForCheck();
    });

    this.form.get('screenId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(id => {
      if (id) {
        this.updateScreenName();
        this.loadScreenSeatLayout(id);
        setTimeout(() => this.cdr.markForCheck(), 0);
      }
      this.cdr.markForCheck();
    });

    this.form.valueChanges.subscribe(() => {
      this.updateButtonState();
      this.cdr.markForCheck();
    });
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        movieId: this.item.movieId || '',
        theatreId: this.item.theatreId || '',
        screenId: this.item.screenId || '',
        showDate: this.item.showDate || '',
        showTime: this.item.showTime || '',
        language: this.item.language || '',
        format: this.item.format || '',
        statusCode: this.item.statusCode || '',
        isActive: this.item.isActive !== undefined ? this.item.isActive : true
      }, { emitEvent: false });

      this.updateTheatreName();
      this.updateScreenName();
      setTimeout(() => this.updateButtonState(), 200);
    }
  }

  private updateTheatreName(): void {
    const theatreId = this.form.get('theatreId')?.value;
    if (theatreId && this.theatres.length) {
      const theatre = this.theatres.find(t => t.id === theatreId);
      this.form.patchValue({ theatreName: theatre?.name || '' }, { emitEvent: false });
    }
  }

  private updateScreenName(): void {
    const screenId = this.form.get('screenId')?.value;
    if (screenId && this.screens.length) {
      const screen = this.screens.find(s => s.id === screenId);
      this.form.patchValue({ screenName: screen?.screenName || '' }, { emitEvent: false });
    }
  }

  onModalClose(): void { this.resetForm(); this.closed.emit(); }

  onModalSave(): void {
    if (!this.form.valid) {
      this.markFormGroupTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.form.value;
    
    // Build pricePerLayout array with code and basePrice for each seat type
    const pricePerLayout = this.seatTypes
      .filter(type => this.seatTypePrices[type.id])
      .map(type => ({
        code: type.code,
        basePrice: this.seatTypePrices[type.id]
      }));

    const itemData = {
      stepSlug: 'v1',
      action: this.item?.id ? 'UPDATE' : 'CREATE',
      ...(this.item?.id && { id: this.item.id }),
      formData: {
        ...(this.item?.id && { id: this.item.id }),
        movieId: formValue.movieId,
        theatreId: formValue.theatreId,
        screenId: formValue.screenId,
        showDate: formValue.showDate,
        showTime: formValue.showTime,
        language: formValue.language,
        format: formValue.format,
        statusCode: formValue.statusCode,
        isActive: formValue.isActive,
        pricePerLayout: pricePerLayout,
        seatLayout: this.seats.map(seat => ({
          seatName: seat.name,
          row: this.getRowLabel(seat.row),
          col: seat.col + 1,
          code: this.getSeatTypeCode(seat.typeId),
          price: seat.price || 0
        }))
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
    if (error?.error?.message) errorMessage = error.error.message;
    else if (error?.message) errorMessage = error.message;
    this.toastr.error(errorMessage, 'Save Error');
  }

  private resetLoadingState(): void { this.modalConfig.primaryButtonLoading = false; this.updateButtonState(); }
  private resetForm(): void { this.form.reset({ isActive: true }); this.form.markAsUntouched(); this.seats = []; }
  private markFormGroupTouched(): void { Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched()); }

  getGroupedSeats(): any[] {
    const grouped: { [key: number]: any } = {};
    this.seats.forEach(seat => {
      if (!grouped[seat.row]) grouped[seat.row] = { row: this.getRowLabel(seat.row), seats: [] };
      grouped[seat.row].seats.push(seat);
    });
    return Object.values(grouped);
  }

  getColumnNumbers(): number[] {
    const columns = new Set<number>();
    this.seats.forEach(seat => columns.add(seat.col + 1));
    return Array.from(columns).sort((a, b) => a - b);
  }

  getSeatTypeById(typeId: string): any { return this.seatTypes.find(t => t?.id === typeId); }
  getSeatTypeCode(typeId: string): string {
    if (!typeId) return '';
    const type = this.getSeatTypeById(typeId);
    return type?.code || '';
  }

  getSeatTypeColors(typeId: string): { bg: string, border: string, text: string } {
    const type = this.getSeatTypeById(typeId);
    if (type?.color) return { bg: type.color, border: type.color, text: '#fff' };
    const fallbackColors: Record<string, { bg: string, border: string, text: string }> = {
      'R': { bg: '#e8e8e8', border: '#bbb', text: '#495057' },
      'P': { bg: '#d1e7f7', border: '#80b0d5', text: '#0056b3' },
      'V': { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
      'X': { bg: '#495057', border: '#343a40', text: '#fff' }
    };
    return fallbackColors[type?.code] || { bg: '#fff', border: '#dee2e6', text: '#ccc' };
  }

  toggleRowSelection(rowIndex: number): void {
    const index = this.selectedRowsForBulkEdit.indexOf(rowIndex);
    if (index > -1) this.selectedRowsForBulkEdit.splice(index, 1);
    else this.selectedRowsForBulkEdit.push(rowIndex);
    this.cdr.markForCheck();
  }

  toggleColumnSelection(colIndex: number): void {
    const index = this.selectedColumnsForBulkEdit.indexOf(colIndex);
    if (index > -1) this.selectedColumnsForBulkEdit.splice(index, 1);
    else this.selectedColumnsForBulkEdit.push(colIndex);
    this.cdr.markForCheck();
  }

  isRowSelected(rowIndex: number): boolean { return this.selectedRowsForBulkEdit.includes(rowIndex); }
  isColumnSelected(colIndex: number): boolean { return this.selectedColumnsForBulkEdit.includes(colIndex); }

  openStatusMenuAt(event: MouseEvent, menuType: 'row' | 'col' | 'seat', id: any, label: string): void {
    event.stopPropagation();
    const isAlreadyOpen = (menuType === 'row' && this.showRowStatusMenu === id) ||
      (menuType === 'col' && this.showColumnStatusMenu === id) ||
      (menuType === 'seat' && this.openSeatStatusMenu === id);

    this.showRowStatusMenu = null;
    this.showColumnStatusMenu = null;
    this.openSeatStatusMenu = null;
    this.pendingRowPrice = null;
    this.pendingColumnPrice = null;
    this.pendingSeatPrice = null;

    if (isAlreadyOpen) { this.cdr.markForCheck(); return; }

    const button = (event.currentTarget || event.target) as HTMLElement;
    const wrapper = button.closest('.seat-layout-wrapper') as HTMLElement;
    if (!wrapper) return;

    const buttonRect = button.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    this.dropdownPosition = {
      top: buttonRect.bottom - wrapperRect.top + 2,
      left: buttonRect.right - wrapperRect.left + 4
    };

    // Populate pending prices based on menu type
    if (menuType === 'row') {
      this.showRowStatusMenu = id;
      const rowSeats = this.seats.filter(s => s.row === id);
      if (rowSeats.length > 0 && rowSeats[0].typeId) {
        this.pendingRowPrice = this.seatTypePrices[rowSeats[0].typeId] || null;
      }
    } else if (menuType === 'col') {
      this.showColumnStatusMenu = id;
      const colSeats = this.seats.filter(s => s.col === id);
      if (colSeats.length > 0 && colSeats[0].typeId) {
        this.pendingColumnPrice = this.seatTypePrices[colSeats[0].typeId] || null;
      }
    } else {
      this.openSeatStatusMenu = id;
      const seat = this.seats.find(s => s.name === id);
      if (seat && seat.typeId) {
        this.pendingSeatPrice = this.seatTypePrices[seat.typeId] || null;
      }
    }

    setTimeout(() => this.cdr.markForCheck(), 0);
  }

  onDropdownItemClick(typeId: string): void {
    if (this.showRowStatusMenu !== null) {
      this.changeAllSelectedRowsStatus(typeId, this.pendingRowPrice);
      this.pendingRowPrice = null;
    } else if (this.showColumnStatusMenu !== null) {
      this.changeAllSelectedColumnsStatus(typeId, this.pendingColumnPrice);
      this.pendingColumnPrice = null;
    } else if (this.openSeatStatusMenu !== null) {
      const seat = this.seats.find(s => s.name === this.openSeatStatusMenu);
      if (seat) this.changeSingleSeatStatus(seat, typeId, this.pendingSeatPrice);
      this.pendingSeatPrice = null;
    }
    this.cdr.markForCheck();
  }

  changeAllSelectedRowsStatus(typeId: string, price?: number | null): void {
    if (!typeId) return;
    const type = this.getSeatTypeById(typeId);
    const finalPrice = price !== null && price !== undefined ? price : (this.seatTypePrices[typeId] || 0);
    this.selectedRowsForBulkEdit.forEach(rowIndex => {
      this.seats.forEach(seat => {
        if (seat.row === rowIndex) {
          seat.typeId = typeId;
          seat.type = type;
          seat.price = finalPrice;
        }
      });
    });
    this.showRowStatusMenu = null;
    this.selectedRowsForBulkEdit = [];
    this.cdr.markForCheck();
  }

  changeAllSelectedColumnsStatus(typeId: string, price?: number | null): void {
    if (!typeId) return;
    const type = this.getSeatTypeById(typeId);
    const finalPrice = price !== null && price !== undefined ? price : (this.seatTypePrices[typeId] || 0);
    this.selectedColumnsForBulkEdit.forEach(colIndex => {
      this.seats.forEach(seat => {
        if (seat.col === colIndex) {
          seat.typeId = typeId;
          seat.type = type;
          seat.price = finalPrice;
        }
      });
    });
    this.showColumnStatusMenu = null;
    this.selectedColumnsForBulkEdit = [];
    this.cdr.markForCheck();
  }

  changeSingleSeatStatus(seat: any, typeId: string, price?: number | null): void {
    if (!typeId) return;
    seat.typeId = typeId;
    seat.type = this.getSeatTypeById(typeId);
    seat.price = price !== null && price !== undefined ? price : (this.seatTypePrices[typeId] || 0);
    this.openSeatStatusMenu = null;
    this.cdr.markForCheck();
  }

  getSelectedRowsCount(): number { return this.selectedRowsForBulkEdit.length; }
  getSelectedColumnsCount(): number { return this.selectedColumnsForBulkEdit.length; }
  clearRowSelection(): void { this.selectedRowsForBulkEdit = []; this.cdr.markForCheck(); }
  clearColumnSelection(): void { this.selectedColumnsForBulkEdit = []; this.cdr.markForCheck(); }
  closeSeatTypeDropdown(): void { }
  isAnyDropdownOpen(): boolean { return this.showRowStatusMenu !== null || this.showColumnStatusMenu !== null || this.openSeatStatusMenu !== null; }
  getUnassignedSeatsCount(): number { return this.seats.filter(s => !s.typeId).length; }
  trackByFn(index: number): number { return index; }

  fillAllSeatsWithType(typeId: string): void {
    if (!typeId) { this.toastr.error('Seat type not found', 'Error'); return; }
    const type = this.getSeatTypeById(typeId);
    const price = this.seatTypePrices[typeId] || 0;
    this.seats.forEach(seat => { seat.typeId = typeId; seat.type = type; seat.price = price; });
    this.cdr.markForCheck();
  }

  onSeatTypePriceChange(typeId: string): void {
    const price = this.seatTypePrices[typeId];
    if (price !== null && price !== undefined) {
      this.seats.forEach(seat => {
        if (seat.typeId === typeId) {
          seat.price = price;
        }
      });
      this.cdr.markForCheck();
    }
  }

  clearAllSeats(): void {
    this.seats.forEach(seat => { seat.typeId = ''; seat.type = null; seat.price = 0; });
    this.cdr.markForCheck();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['pattern']) return `${this.getFieldLabel(fieldName)} format must be HH:MM (24h)`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      movieId: 'Movie', theatreId: 'Theatre', screenId: 'Screen', showDate: 'Show Date',
      showTime: 'Show Time', language: 'Language', format: 'Format',
      statusCode: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
