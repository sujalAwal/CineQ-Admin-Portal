import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { MediaManagerModalComponent } from '../media-manager-modal/media-manager-modal.component';
import { MoviesCinemaService } from '../../services/movies-cinema.service';
import { GenreService } from '../../services/genre.service';
import { PeopleService } from '../../services/people.service';
import { CrewRolesService } from '../../services/crew-roles.service';
import { MediaFile, MediaManagerConfig } from '../../interfaces/media.interface';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-movies-cinema-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent, MediaManagerModalComponent],
  templateUrl: './movies-cinema-modal.component.html',
  styleUrls: ['./movies-cinema-modal.component.scss']
})
export class MoviesCinemaModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;

  // Dropdown data
  genres: any[] = [];
  people: any[] = [];
  crewRoles: any[] = [];
  loadingDropdowns = false;

  private destroy$ = new Subject<void>();

  // Multi-select state (not part of reactive form)
  selectedLanguages: string[] = [];
  selectedFormats: string[] = [];
  selectedGenreIds: string[] = [];
  multiSelectTouched = false;

  // Media Manager state
  showMediaManager: boolean = false;
  currentMediaField: 'poster' | 'banner' | null = null;
  mediaManagerConfig: MediaManagerConfig = {
    title: 'Select Image',
    multipleSelection: false,
    showUploadButton: true,
    showCreateFolderButton: false,
    showDeleteButton: false,
    showPreviewButton: true
  };

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

  readonly CERTIFICATION_OPTIONS = ['U', 'UA', 'A', 'R'];
  readonly STATUS_OPTIONS = [
    { value: 'coming_soon', label: 'Coming Soon' },
    { value: 'now_showing', label: 'Now Showing' },
    { value: 'ended', label: 'Ended' }
  ];

  modalConfig: ModalConfig = {
    title: 'Add Movie',
    icon: 'movie',
    size: 'xl',
    primaryButtonText: 'Save Movie',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private service: MoviesCinemaService,
    private genreService: GenreService,
    private peopleService: PeopleService,
    private crewRolesService: CrewRolesService,
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

  get starcastArray(): FormArray {
    return this.form.get('starcast') as FormArray;
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      poster: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      banner: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      trailerUrl: ['', [Validators.maxLength(500)]],
      duration: ['', [Validators.required, Validators.min(30), Validators.max(300)]],
      releaseDate: ['', [Validators.required]],
      country: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      certification: ['', [Validators.required]],
      status: ['', [Validators.required]],
      starcast: this.fb.array([], [Validators.minLength(2)]),
      isActive: [true]
    });
    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private loadDropdownData(): void {
    // Skip if already loaded
    if (this.genres.length && this.people.length && this.crewRoles.length) return;
    
    this.loadingDropdowns = true;
    let pending = 3;
    const done = () => { 
      if (--pending === 0) { 
        this.loadingDropdowns = false; 
        this.cdr.markForCheck(); 
      } 
    };

    // Load genres (direct array - not nested!)
    this.genreService.getGenres({ page: 1, size: 500, active: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => { 
          // Genre API returns direct array (not form-manager based)
          this.genres = response?.data || []; 
          done(); 
        },
        error: () => done()
      });

    // Load people (cast members)
    this.peopleService.getList({ page: 1, size: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Extract from nested structure: { data: [{ "people": [...] }] }
          this.people = response.data.flatMap((item: any) => {
            const records = item.people || item.person || [];
            if (Array.isArray(records)) return records;
            return item.id ? [item] : [];
          });
          done(); 
        },
        error: () => done()
      });

    // Load crew roles
    this.crewRolesService.getList({ page: 1, size: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Extract from nested structure: { data: [{ "crew-roles": [...] }] }
          this.crewRoles = response.data.flatMap((item: any) => {
            const records = item['crew-roles'] || item['crew_roles'] 
                          || item['crewRoles'] || item['crew-role'] || [];
            if (Array.isArray(records)) return records;
            return item.id ? [item] : [];
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
    this.modalConfig.title = this.item ? 'Edit Movie' : 'Add Movie';
    this.modalConfig.primaryButtonText = this.item ? 'Update Movie' : 'Create Movie';
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        title: this.item.title || '',
        description: this.item.description || '',
        poster: this.item.poster || '',
        banner: this.item.banner || '',
        trailerUrl: this.item.trailerUrl || '',
        duration: this.item.duration || '',
        releaseDate: this.item.releaseDate || '',
        country: this.item.country || '',
        certification: this.item.certification || '',
        status: this.item.status || '',
        isActive: this.item.isActive !== undefined ? this.item.isActive : true
      }, { emitEvent: false });

      // Populate multi-select arrays
      this.selectedLanguages = Array.isArray(this.item.language) ? [...this.item.language] : (this.item.language ? [this.item.language] : []);
      this.selectedFormats = Array.isArray(this.item.formats) ? [...this.item.formats] : (this.item.formats ? [this.item.formats] : []);
      this.selectedGenreIds = Array.isArray(this.item.genres) ? [...this.item.genres] : [];

      // Populate starcast FormArray
      const starcastArray = this.form.get('starcast') as FormArray;
      starcastArray.clear();
      if (Array.isArray(this.item.starcast)) {
        this.item.starcast.forEach((member: any) => starcastArray.push(this.createStarcastGroup(member)));
      }

      setTimeout(() => this.updateButtonState(), 200);
    } else {
      this.selectedLanguages = [];
      this.selectedFormats = [];
      this.selectedGenreIds = [];
      const starcastArray = this.form.get('starcast') as FormArray;
      starcastArray.clear();
    }
  }

  private createStarcastGroup(data?: any): FormGroup {
    return this.fb.group({
      personId: [data?.personId || '', [Validators.required]],
      crewRoleId: [data?.crewRoleId || '', [Validators.required]],
      characterName: [data?.characterName || '']
    });
  }

  addStarcast(): void {
    this.starcastArray.push(this.createStarcastGroup());
    this.cdr.markForCheck();
  }

  removeStarcast(index: number): void {
    this.starcastArray.removeAt(index);
    this.cdr.markForCheck();
  }

  /**
   * Get person's display name by ID (for showing selected cast member names).
   */
  getPersonName(personId: string): string {
    if (!personId) return '';
    const person = this.people.find(p => p._id === personId);
    return person?.name || '';
  }

  /**
   * Get crew role's display name by ID (for showing selected role names).
   */
  getCrewRoleName(crewRoleId: string): string {
    if (!crewRoleId) return '';
    const role = this.crewRoles.find(r => r._id === crewRoleId);
    return role?.name || '';
  }

  toggleLanguage(value: string): void {
    const idx = this.selectedLanguages.indexOf(value);
    if (idx >= 0) this.selectedLanguages.splice(idx, 1);
    else this.selectedLanguages.push(value);
  }

  toggleFormat(value: string): void {
    const idx = this.selectedFormats.indexOf(value);
    if (idx >= 0) this.selectedFormats.splice(idx, 1);
    else this.selectedFormats.push(value);
  }

  toggleGenre(genreId: string): void {
    const idx = this.selectedGenreIds.indexOf(genreId);
    if (idx >= 0) this.selectedGenreIds.splice(idx, 1);
    else this.selectedGenreIds.push(genreId);
  }

  isLanguageSelected(value: string): boolean { return this.selectedLanguages.includes(value); }
  isFormatSelected(value: string): boolean { return this.selectedFormats.includes(value); }
  isGenreSelected(id: string): boolean { return this.selectedGenreIds.includes(id); }

  // Media Manager methods
  openMediaManager(field: 'poster' | 'banner'): void {
    this.currentMediaField = field;
    this.showMediaManager = true;
  }

  onMediaSelected(files: MediaFile[]): void {
    if (this.currentMediaField && files && files.length > 0) {
      const selectedFile = files[0]; // Take first file since multipleSelection is false
      if (selectedFile.url) {
        this.form.patchValue({
          [this.currentMediaField]: selectedFile.url
        }, { emitEvent: false });
        this.showMediaManager = false;
        this.currentMediaField = null;
        this.cdr.markForCheck();
      }
    }
  }

  onMediaManagerClosed(): void {
    this.showMediaManager = false;
    this.currentMediaField = null;
  }

  onModalClose(): void { this.resetForm(); this.closed.emit(); }

  onModalSave(): void {
    this.multiSelectTouched = true;

    if (!this.form.valid) {
      this.markFormGroupTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }
    if (this.selectedLanguages.length === 0) {
      this.toastr.error('Please select at least one language', 'Validation Error');
      return;
    }
    if (this.selectedFormats.length === 0) {
      this.toastr.error('Please select at least one format', 'Validation Error');
      return;
    }
    if (this.selectedGenreIds.length === 0) {
      this.toastr.error('Please select at least one genre', 'Validation Error');
      return;
    }
    if (this.starcastArray.length < 2) {
      this.toastr.error('Please add at least 2 cast/crew members', 'Validation Error');
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
        title: formValue.title.trim(),
        description: formValue.description.trim(),
        poster: formValue.poster.trim(),
        banner: formValue.banner.trim(),
        trailerUrl: formValue.trailerUrl?.trim() || '',
        duration: Number(formValue.duration),
        releaseDate: formValue.releaseDate,
        country: formValue.country.trim(),
        certification: formValue.certification,
        language: this.selectedLanguages,
        formats: this.selectedFormats,
        genres: this.selectedGenreIds,
        status: formValue.status,
        starcast: formValue.starcast.map((m: any) => ({
          personId: m.personId,
          crewRoleId: m.crewRoleId,
          characterName: m.characterName?.trim() || ''
        })),
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
    this.form.reset({ isActive: true });
    (this.form.get('starcast') as FormArray).clear();
    this.form.markAsUntouched();
    this.selectedLanguages = [];
    this.selectedFormats = [];
    this.selectedGenreIds = [];
    this.multiSelectTouched = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched());
    this.starcastArray.controls.forEach(group => {
      Object.keys((group as FormGroup).controls).forEach(k => (group as FormGroup).get(k)?.markAsTouched());
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isStarcastFieldInvalid(index: number, fieldName: string): boolean {
    const field = this.starcastArray.at(index)?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title', description: 'Description', poster: 'Poster URL', banner: 'Banner URL',
      trailerUrl: 'Trailer URL', duration: 'Duration', releaseDate: 'Release Date',
      country: 'Country', certification: 'Certification', status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
