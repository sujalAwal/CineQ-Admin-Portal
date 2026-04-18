import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ChangeDetectorRef, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseModalComponent, ModalConfig } from '../base-modal/base-modal.component';
import { TheatreService } from '../../services/theatre.service';
import { MasterDataService } from '../../services/master-data.service';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-theatre-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseModalComponent],
  templateUrl: './theatre-modal.component.html',
  styleUrls: ['./theatre-modal.component.scss']
})
export class TheatreModalComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isVisible: boolean = false;
  @Input() item: any = null;
  @Input() isLoading: boolean = false;

  @Output() closed = new EventEmitter<void>();
  @Output() itemSaved = new EventEmitter<any>();

  form!: FormGroup;
  districts: any[] = [];
  provinces: any[] = [];
  filteredDistricts: any[] = [];  // Districts filtered by selected province
  selectedProvinceCode: string | null = null;
  dataLoading: boolean = false;  // Track if master data is being fetched
  private destroy$ = new Subject<void>();

  modalConfig: ModalConfig = {
    title: 'Add Theatre',
    icon: 'building',
    size: 'lg',
    primaryButtonText: 'Save Theatre',
    primaryButtonIcon: 'device-floppy',
    primaryButtonLoading: false,
    primaryButtonDisabled: false,
    secondaryButtonText: 'Cancel',
    showFooter: true,
    showSecondaryButton: true
  };

  constructor(
    private fb: FormBuilder,
    private service: TheatreService,
    private masterDataService: MasterDataService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupStateChangeListener();
    this.initializeMasterData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible']?.currentValue === true && this.form) {
      this.updateModalConfig();
      this.populateForm();
      setTimeout(() => this.updateButtonState(), 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize master data with automatic fetch if needed
   */
  private initializeMasterData(): void {
    // First try to load from cache/service
    const districtsData = this.masterDataService.getDistricts();
    const provincesData = this.masterDataService.getProvinces();

    if (districtsData.length > 0 && provincesData.length > 0) {
      // Data already available - use it
      console.log('Master data available from cache');
      this.districts = districtsData;
      this.provinces = provincesData;
      this.cdr.markForCheck();
    } else {
      // Data not available - fetch it
      console.log('Master data not available, fetching from API...');
      this.fetchMasterDataAndPopulate();
    }

    // Also subscribe to future updates (e.g., if data is refreshed)
    this.masterDataService.districts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        console.log('Districts updated:', data);
        this.districts = data || [];
        const selectedState = this.form.get('state')?.value;
        if (selectedState) {
          this.filterDistrictsByProvince(selectedState);
        }
        this.cdr.markForCheck();
      });

    this.masterDataService.provinces$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        console.log('Provinces updated:', data);
        this.provinces = data || [];
        this.cdr.markForCheck();
      });
  }

  /**
   * Fetch master data from API and populate form
   */
  private fetchMasterDataAndPopulate(): void {
    this.dataLoading = true;
    this.cdr.markForCheck();
    
    this.masterDataService.fetchMasterData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.districts = response.data?.districts || [];
          this.provinces = response.data?.provinces || [];
          this.dataLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to fetch master data:', err);
          // Set empty arrays to prevent "undefined" errors
          this.districts = [];
          this.provinces = [];
          this.dataLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Helper method to filter districts by province code
   */
  private filterDistrictsByProvince(stateCode: string | null): void {
    if (stateCode && this.districts.length > 0) {

      const selectedProvince = this.provinces.find(p => p.code === stateCode);
      this.filteredDistricts = this.districts.filter(d => {
        console.log("District:",d);
        console.log(stateCode);


        
        
        return d.provinceId === selectedProvince?.id;
      });
      console.log(`Filtered districts for state ${stateCode}:`, this.filteredDistricts);
    } else {
      this.filteredDistricts = [];
    }
  }

  /**
   * Setup listener for state/province field changes
   * When state is selected, filter districts by that province
   */
  private setupStateChangeListener(): void {
    this.form.get('state')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(stateCode => {
        console.log('State changed to:', stateCode);
        this.selectedProvinceCode = stateCode || null;
        
        // Filter districts by selected province
        this.filterDistrictsByProvince(stateCode);
        
        // Reset city field when province changes
        this.form.get('city')?.setValue(null, { emitEvent: false });
        
        // Enable/disable city field based on whether state is selected
        if (stateCode) {
          this.form.get('city')?.enable({ emitEvent: false });
        } else {
          this.form.get('city')?.disable({ emitEvent: false });
        }
        
        this.cdr.markForCheck();
      });
  }

  /**
   * Get district name by code
   */
  getDistrictNameByCode(code: string): string {
    return this.districts.find(d => d.code === code)?.name || code;
  }

  /**
   * Get province name by code
   */
  getProvinceNameByCode(code: string): string {
    return this.provinces.find(p => p.code === code)?.name || code;
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      city: [{ value: '', disabled: true }, [Validators.required]],  // Disabled until state is selected
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{5,10}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
      chain: ['', [Validators.minLength(2), Validators.maxLength(50)]],
      isActive: [true, [Validators.required]]
    });

    this.form.valueChanges.subscribe(() => this.updateButtonState());
  }

  private updateButtonState(): void {
    this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
  }

  private updateModalConfig(): void {
    if (this.item) {
      this.modalConfig.title = 'Edit Theatre';
      this.modalConfig.primaryButtonText = 'Update Theatre';
    } else {
      this.modalConfig.title = 'Add Theatre';
      this.modalConfig.primaryButtonText = 'Create Theatre';
    }
    this.modalConfig.primaryButtonLoading = this.isLoading;
  }

  private populateForm(): void {
    if (this.item && this.form) {
      // IMPORTANT: Set state FIRST to trigger filtering
      // Then set city to match the filtered list
      const stateCode = this.item.state;
      const cityCode = this.item.city;

      // Step 1: Set form values (without emitting to avoid listener triggering during setup)
      this.form.patchValue({
        name: this.item.name,
        address: this.item.address,
        state: stateCode,    // Set state first
        pincode: this.item.pincode,
        phone: this.item.phone,
        email: this.item.email,
        latitude: this.item.latitude,
        longitude: this.item.longitude,
        chain: this.item.chain || '',
        isActive: this.item.isActive
      }, { emitEvent: false });

      // Step 2: Manually filter districts and enable city field
      this.selectedProvinceCode = stateCode || null;
      this.filterDistrictsByProvince(stateCode);
      
      if (stateCode) {
        this.form.get('city')?.enable({ emitEvent: false });
      }

      // Step 3: Now set city value (after filtering is done so it matches the filtered list)
      this.form.patchValue({
        city: cityCode
      }, { emitEvent: false });

      setTimeout(() => {
        this.updateButtonState();
        this.cdr.markForCheck();
      }, 100);
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
        name: formValue.name.trim(),
        address: formValue.address.trim(),
        city: formValue.city,
        state: formValue.state,
        pincode: formValue.pincode,
        phone: formValue.phone,
        email: formValue.email,
        latitude: formValue.latitude,
        longitude: formValue.longitude,
        chain: formValue.chain?.trim() || '',
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
  private resetForm(): void { this.form.reset({ isActive: true }); this.form.markAsUntouched(); }
  private markFormGroupTouched(): void { Object.keys(this.form.controls).forEach(key => { this.form.get(key)?.markAsTouched(); }); }

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
      if (field.errors['email']) return 'Enter valid email';
      if (field.errors['pattern']) return `${this.getFieldLabel(fieldName)} format is invalid`;
      if (field.errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name', address: 'Address', city: 'City', state: 'State', pincode: 'Pincode',
      phone: 'Phone', email: 'Email', latitude: 'Latitude', longitude: 'Longitude', chain: 'Chain', isActive: 'Status'
    };
    return labels[fieldName] || fieldName;
  }
}
