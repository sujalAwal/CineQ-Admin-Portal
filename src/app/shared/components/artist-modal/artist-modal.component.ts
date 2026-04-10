import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { MediaManagerModalComponent } from '../media-manager-modal/media-manager-modal.component';
import { ArtistService } from '../../services/artist.service';
import { ArtistTypesService } from '../../services/artist-types.service';
import { MediaFile, MediaManagerConfig } from '../../interfaces/media.interface';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-artist-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent, MediaManagerModalComponent],
  templateUrl: './artist-modal.component.html',
  styleUrls: ['./artist-modal.component.scss']
})
export class ArtistModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;
  artistTypes: any[] = [];

  // Media Manager
  showMediaManager = false;
  mediaManagerConfig: MediaManagerConfig = {
    title: 'Select Avatar',
    multipleSelection: false,
    showUploadButton: true,
    showCreateFolderButton: false,
    showDeleteButton: false,
    showPreviewButton: true
  };

  readonly nationalities: string[] = [
    'Nepali', 'Indian', 'American', 'British', 'Australian', 'Canadian',
    'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Russian',
    'Chinese', 'Japanese', 'Korean', 'Thai', 'Pakistani', 'Bangladeshi',
    'Sri Lankan', 'Afghan', 'Iranian', 'Turkish', 'Egyptian', 'Nigerian',
    'South African', 'Kenyan', 'Ghanaian', 'Brazilian', 'Argentine',
    'Mexican', 'Colombian', 'Chilean', 'Swedish', 'Norwegian', 'Danish',
    'Finnish', 'Dutch', 'Belgian', 'Swiss', 'Austrian', 'Polish',
    'Czech', 'Hungarian', 'Romanian', 'Greek', 'Israeli', 'Saudi Arabian',
    'Emirati', 'Indonesian', 'Malaysian', 'Filipino', 'Vietnamese',
    'Singaporean', 'New Zealander', 'Irish', 'Scottish', 'Welsh'
  ];

  private destroy$ = new Subject<void>();

  modalConfig: ModalConfig = {
    title: 'Add Artist',
    icon: 'user-plus',
    size: 'lg',
    primaryButtonText: 'Save Artist',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private service: ArtistService,
    private artistTypesService: ArtistTypesService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(): void {
    if (this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 0);
    }
    if (this.isVisible) {
      this.loadDropdownData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDropdownData(): void {
    if (this.artistTypes.length) return;

    this.artistTypesService.getList({ page: 1, size: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.artistTypes = response.data.flatMap((item: any) => {
            const records = item['artist-types'] || item['artist_types'] || item['artistTypes'] || [];
            return Array.isArray(records) ? records : (item.id ? [item] : []);
          });
          this.cdr.markForCheck();
        },
        error: () => {}
      });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      avatar: ['', [Validators.maxLength(500)]],
      artistTypeId: [''],
      birthDate: [''],
      nationality: ['', [Validators.maxLength(50)]],
      bio: ['', [Validators.maxLength(500)]],
      moviesCount: [null],
      rating: [null, [Validators.min(0), Validators.max(10)]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Artist';
      this.modalConfig.primaryButtonText = 'Update Artist';
    } else {
      this.modalConfig.title = 'Add Artist';
      this.modalConfig.primaryButtonText = 'Create Artist';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      this.form.patchValue({
        fullName: this.item.full_name || this.item.fullName || '',
        avatar: this.item.avatar || '',
        artistTypeId: this.item.artist_type_id || this.item.artistTypeId || '',
        birthDate: this.item.birth_date || this.item.birthDate || '',
        nationality: this.item.nationality || '',
        bio: this.item.bio || '',
        moviesCount: this.item.movies_count ?? this.item.moviesCount ?? null,
        rating: this.item.rating ?? null,
        isActive: this.item.isActive ?? this.item.is_active ?? true
      }, { emitEvent: false });

      setTimeout(() => this.updateButtonState(), 200);
    } else if (!this.item && this.form) {
      this.resetForm();
    }
  }

  onModalClose(): void {
    this.resetForm();
    this.closed.emit();
  }

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
        fullName: formValue.fullName.trim(),
        avatar: formValue.avatar?.trim() || '',
        artistTypeId: formValue.artistTypeId || '',
        birthDate: formValue.birthDate || '',
        nationality: formValue.nationality?.trim() || '',
        bio: formValue.bio?.trim() || '',
        moviesCount: formValue.moviesCount ?? null,
        rating: formValue.rating ?? null,
        isActive: formValue.isActive
      }
    };

    this.service.save(itemData).subscribe({
      next: (savedItem) => {
        this.itemSaved.emit(savedItem);
        this.resetLoadingState();
        this.resetForm();
      },
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

  private resetLoadingState(): void {
    this.modalConfig.primaryButtonLoading = false;
    this.updateButtonState();
  }

  private resetForm(): void {
    this.form.reset({ isActive: true });
    this.form.markAsUntouched();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  openMediaManager(): void {
    this.showMediaManager = true;
  }

  onMediaSelected(files: MediaFile[]): void {
    if (files && files.length > 0) {
      this.form.patchValue({ avatar: files[0].url });
      this.showMediaManager = false;
    }
  }

  onMediaManagerClosed(): void {
    this.showMediaManager = false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} cannot be less than ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      fullName: 'Artist Name',
      email: 'Email',
      avatar: 'Avatar URL',
      artistTypeId: 'Artist Type',
      birthDate: 'Birth Date',
      nationality: 'Nationality',
      bio: 'Biography',
      moviesCount: 'Movies Count',
      rating: 'Rating',
      isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
