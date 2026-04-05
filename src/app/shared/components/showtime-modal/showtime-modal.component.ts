import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { ShowtimeService } from '../../services/showtime.service';
import { MoviesCinemaService } from '../../services/movies-cinema.service';
import { ScreenService } from '../../services/screen.service';
import { TheatreService } from '../../services/theatre.service';
import { ShowtimeStatusService } from '../../services/showtime-status.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-showtime-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './showtime-modal.component.html',
  styleUrls: ['./showtime-modal.component.scss']
})
export class ShowtimeModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  // Dropdown data
  movies: any[] = [];
  screens: any[] = [];
  theatres: any[] = [];
  showtimeStatuses: any[] = [];
  loadingDropdowns = false;

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
    private service: ShowtimeService,
    private moviesService: MoviesCinemaService,
    private screenService: ScreenService,
    private theatreService: TheatreService,
    private showtimeStatusService: ShowtimeStatusService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void { this.initializeForm(); }

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
    if (this.movies.length && this.theatres.length &&
      this.screens.length && this.showtimeStatuses.length) return;

    this.loadingDropdowns = true;
    let pending = 4;
    const done = () => { 
      if (--pending === 0) { 
        this.loadingDropdowns = false;
        // After all dropdowns loaded, populate theatre and screen names
        this.updateTheatreName();
        this.updateScreenName();
        this.cdr.markForCheck(); 
      } 
    };

    // Load Movies
    this.moviesService.getList({ page: 1, size: 200 }).subscribe({
      next: (response) => {
        // Extract from nested structure: { data: [{ "movies": [...] }] }
        this.movies = response.data.flatMap((item: any) => {
          const records = item['movies'] || item['movie'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });

    // Load Theatres
    this.theatreService.getList({ page: 1, size: 200 }).subscribe({
      next: (response) => {
        // Extract from nested structure: { data: [{ "theatre": [...] }] }
        this.theatres = response.data.flatMap((item: any) => {
          const records = item['theatre'] || item['theatres'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });

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

    // Load Showtime Statuses
    this.showtimeStatusService.getList({ page: 1, size: 100 }).subscribe({
      next: (response) => {
        // Extract from nested structure: { data: [{ "showtime-statuses": [...] }] }
        this.showtimeStatuses = response.data.flatMap((item: any) => {
          const records = item['showtime-statuses'] || item['showtime-status']
            || item['showtimeStatuses'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        done();
      },
      error: () => done()
    });
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
      basePrice: ['', [Validators.required, Validators.min(0), Validators.max(99999)]],
      isActive: [true]
    });

    // Auto-populate theatreName when theatreId selection changes
    this.form.get('theatreId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(id => {
      if (id) this.updateTheatreName();
    });

    // Auto-populate screenName when screenId selection changes
    this.form.get('screenId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(id => {
      if (id) this.updateScreenName();
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
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
        basePrice: this.item.basePrice || '',
        isActive: this.item.isActive !== undefined ? this.item.isActive : true
      }, { emitEvent: false });

      // Manually trigger auto-population for theatre and screen names
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


    const itemData = {
      stepSlug: 'v1',
      action: this.item?.id ? 'UPDATE' : 'CREATE',
      ...(this.item?.id && { id: this.item.id }),
      formData: {
        ...(this.item?.id && { id: this.item.id }),
        movieId: formValue.movieId,
        theatreId: formValue.theatreId,
        theatreName: formValue.theatreName,
        screenId: formValue.screenId,
        screenName: formValue.screenName,
        showDate: formValue.showDate,
        showTime: formValue.showTime,
        language: formValue.language,
        format: formValue.format,
        statusCode: formValue.statusCode,
        basePrice: Number(formValue.basePrice),
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

    // Try different paths to extract the message
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } 

    this.toastr.error(errorMessage, 'Save Error');
  }

  private resetLoadingState(): void { this.modalConfig.primaryButtonLoading = false; this.updateButtonState(); }
  private resetForm(): void { this.form.reset({ isActive: true }); this.form.markAsUntouched(); }
  private markFormGroupTouched(): void { Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched()); }

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
      statusCode: 'Status', basePrice: 'Base Price'
    };
    return labels[fieldName] || fieldName;
  }
}
