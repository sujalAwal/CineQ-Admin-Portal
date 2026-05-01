import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { SeatLayoutService } from '../../services/seat-layout.service';
import { ScreenService } from '../../services/screen.service';
import { SeatTypeService } from '../../services/seat-type.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-seat-layout-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './seat-layout-modal.component.html',
  styleUrls: ['./seat-layout-modal.component.scss']
})
export class SeatLayoutModalComponent implements OnInit, OnChanges {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  screens: any[] = [];
  seatTypes: any[] = [];
  loadingDropdowns = false;
  selectedScreen: any = null;

  // Row labels A-Z
  readonly ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  modalConfig: ModalConfig = {
    title: 'Add Seat Layout',
    icon: 'layout',
    size: 'xl',
    primaryButtonText: 'Save Layout',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private service: SeatLayoutService,
    private screenService: ScreenService,
    private seatTypeService: SeatTypeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.initializeForm(); }

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

  get rowsArray(): FormArray { return this.form.get('rows') as FormArray; }
  getSeatsArray(rowIndex: number): FormArray { return this.rowsArray.at(rowIndex).get('seats') as FormArray; }

  private loadDropdownData(): void {
    if (this.screens.length && this.seatTypes.length) return;
    this.loadingDropdowns = true;
    let pending = 2;
    const done = () => { if (--pending === 0) { this.loadingDropdowns = false; this.cdr.markForCheck(); } };

    // Load Screens
    this.screenService.getList({ page: 1, size: 200 }).subscribe({
      next: (response) => {
        // Extract from nested structure: { data: [{ "screen": [...] }] }
        this.screens = response.data.flatMap((item: any) => {
          const records = item['screen'] || item['screens'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });

    // Load Seat Types
    this.seatTypeService.getList({ page: 1, size: 100 }).subscribe({
      next: (response) => {
        // Extract from nested structure: { data: [{ "seat-types": [...] }] }
        this.seatTypes = response.data.flatMap((item: any) => {
          const records = item['seat-types'] || item['seat-type'] 
                        || item['seatTypes'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      isDefault: [false, [Validators.required]],
      screenId: [''],
      rows: this.fb.array([]),
      isActive: [true]
    });

    this.form.get('isDefault')?.valueChanges.subscribe(isDefault => {
      const screenIdControl = this.form.get('screenId');
      if (isDefault) {
        screenIdControl?.clearValidators();
        screenIdControl?.setValue('');
        this.selectedScreen = null;
      } else {
        screenIdControl?.setValidators([Validators.required]);
      }
      screenIdControl?.updateValueAndValidity();
      this.cdr.markForCheck();
    });

    this.form.get('screenId')?.valueChanges.subscribe(screenId => {
      this.selectedScreen = this.screens.find(s => s._id === screenId) || null;
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading || this.rowsArray.length === 0;
  }

  private updateModalConfig(): void {
    this.modalConfig.title = this.item ? 'Edit Seat Layout' : 'Add Seat Layout';
    this.modalConfig.primaryButtonText = this.item ? 'Update Layout' : 'Create Layout';
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    this.rowsArray.clear();
    if (this.item && this.form) {
      this.form.patchValue({
        name: this.item.name || '',
        isDefault: this.item.isDefault || false,
        screenId: this.item.screenId || '',
        isActive: this.item.isActive !== undefined ? this.item.isActive : true
      }, { emitEvent: false });

      if (Array.isArray(this.item.rows)) {
        this.item.rows.forEach((row: any) => {
          const rowGroup = this.createRowGroup(row.rowLabel);
          const seatsArray = rowGroup.get('seats') as FormArray;
          seatsArray.clear();
          if (Array.isArray(row.seats)) {
            row.seats.forEach((seat: any) => seatsArray.push(this.createSeatGroup(seat)));
          }
          (rowGroup.get('rowSeatType') as any).setValue(this.getRowSeatType(row.seats), { emitEvent: false });
          (rowGroup.get('rowPrice') as any).setValue(this.getRowPrice(row.seats), { emitEvent: false });
          this.rowsArray.push(rowGroup);
        });
      }
      setTimeout(() => this.updateButtonState(), 200);
    }
  }

  private getRowSeatType(seats: any[]): string {
    if (!seats || seats.length === 0) return '';
    const types = new Set(seats.filter(s => !s.isAisle).map(s => s.seatTypeCode));
    return types.size === 1 ? [...types][0] : '';
  }

  private getRowPrice(seats: any[]): number | null {
    if (!seats || seats.length === 0) return null;
    const prices = new Set(seats.filter(s => !s.isAisle).map(s => s.price));
    return prices.size === 1 ? [...prices][0] : null;
  }

  generateLayout(): void {
    if (!this.selectedScreen) {
      this.toastr.warning('Please select a screen first', 'No Screen Selected');
      return;
    }
    const rows = this.selectedScreen.rows || 0;
    const cols = this.selectedScreen.columns || 0;
    if (rows === 0 || cols === 0) {
      this.toastr.warning('Selected screen has no valid row/column configuration', 'Invalid Screen');
      return;
    }

    this.rowsArray.clear();
    for (let r = 0; r < rows; r++) {
      const rowLabel = this.ROW_LABELS[r] || `R${r + 1}`;
      const rowGroup = this.createRowGroup(rowLabel);
      const seatsArray = rowGroup.get('seats') as FormArray;
      for (let c = 1; c <= cols; c++) {
        seatsArray.push(this.createSeatGroup({ seatNumber: c, seatCode: `${rowLabel}${c}` }));
      }
      this.rowsArray.push(rowGroup);
    }
    this.cdr.markForCheck();
    this.toastr.success(`Generated ${rows} rows × ${cols} seats`, 'Layout Generated');
  }

  private createRowGroup(rowLabel: string): FormGroup {
    const group = this.fb.group({
      rowLabel: [rowLabel],
      rowSeatType: [''],  // bulk-setter (UI only)
      rowPrice: [null],    // bulk-setter (UI only)
      seats: this.fb.array([])
    });

    group.get('rowSeatType')?.valueChanges.subscribe(typeCode => {
      if (!typeCode) return;
      const seatsArray = group.get('seats') as FormArray;
      seatsArray.controls.forEach(seat => {
        if (!seat.get('isAisle')?.value) seat.get('seatTypeCode')?.setValue(typeCode, { emitEvent: false });
      });
    });

    group.get('rowPrice')?.valueChanges.subscribe(price => {
      if (price === null || price === '') return;
      const seatsArray = group.get('seats') as FormArray;
      seatsArray.controls.forEach(seat => {
        if (!seat.get('isAisle')?.value) seat.get('price')?.setValue(price, { emitEvent: false });
      });
    });

    return group;
  }

  private createSeatGroup(data?: any): FormGroup {
    return this.fb.group({
      seatNumber: [data?.seatNumber || 1],
      seatCode: [data?.seatCode || ''],
      seatTypeCode: [data?.seatTypeCode || ''],
      price: [data?.price ?? null],
      isAisle: [data?.isAisle || false],
      isActive: [data?.isActive !== undefined ? data.isActive : true]
    });
  }

  toggleAisle(rowIndex: number, seatIndex: number): void {
    const seat = this.getSeatsArray(rowIndex).at(seatIndex);
    const isAisle = !seat.get('isAisle')?.value;
    seat.get('isAisle')?.setValue(isAisle);
    if (isAisle) {
      seat.get('seatTypeCode')?.setValue('');
      seat.get('price')?.setValue(null);
    }
    this.cdr.markForCheck();
  }

  onModalClose(): void { this.resetForm(); this.closed.emit(); }

  onModalSave(): void {
    if (!this.form.valid) {
      this.markFormGroupTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }
    if (this.rowsArray.length === 0) {
      this.toastr.error('Please generate or add seat rows', 'Validation Error');
      return;
    }

    this.modalConfig.primaryButtonLoading = true;
    this.modalConfig.primaryButtonDisabled = true;

    const formValue = this.form.value;
    const rows = formValue.rows.map((row: any) => ({
      rowLabel: row.rowLabel,
      seats: row.seats.map((seat: any) => ({
        seatNumber: seat.seatNumber,
        seatCode: seat.seatCode,
        seatTypeCode: seat.isAisle ? null : (seat.seatTypeCode || null),
        price: seat.isAisle ? null : (seat.price ? Number(seat.price) : null),
        isAisle: seat.isAisle,
        isActive: seat.isActive
      }))
    }));

    const itemData = {
      stepSlug: 'v1',
      action: this.item?.id ? 'UPDATE' : 'CREATE',
      ...(this.item?.id && { id: this.item.id }),
      formData: {
        ...(this.item?.id && { id: this.item.id }),
        name: formValue.name.trim(),
        isDefault: formValue.isDefault,
        screenId: formValue.isDefault ? null : formValue.screenId,
        rows,
        isActive: formValue.isActive
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
    this.form.reset({ isDefault: false, isActive: true });
    this.rowsArray.clear();
    this.selectedScreen = null;
    this.form.markAsUntouched();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched());
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
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = { name: 'Layout Name', screenId: 'Screen', isDefault: 'Default Template' };
    return labels[fieldName] || fieldName;
  }

  getTotalSeats(rowIndex: number): number {
    return this.getSeatsArray(rowIndex).controls.filter(s => !s.get('isAisle')?.value).length;
  }

  getTotalLayoutSeats(): number {
    let total = 0;
    for (let i = 0; i < this.rowsArray.length; i++) total += this.getTotalSeats(i);
    return total;
  }
}
