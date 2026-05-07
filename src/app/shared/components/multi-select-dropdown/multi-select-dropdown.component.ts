import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, ChangeDetectorRef, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MultiSelectOption {
  _id?: string;
  id?: string;
  name?: string;
  label?: string;
  value?: string;
}

@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelectDropdownComponent implements OnInit, OnChanges {
  @Input() options: MultiSelectOption[] = [];
  @Input() selectedIds: string[] = [];
  @Input() placeholder = 'Select items...';
  @Input() searchPlaceholder = 'Search...';
  @Input() isDisabled = false;
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;

  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() dropdownToggle = new EventEmitter<boolean>();

  searchText = '';
  isOpen = false;
  filteredOptions: MultiSelectOption[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.updateFilteredOptions();
  }

  ngOnChanges(): void {
    this.updateFilteredOptions();
  }

  toggleDropdown(): void {
    if (!this.isDisabled && !this.isLoading) {
      this.isOpen = !this.isOpen;
      this.dropdownToggle.emit(this.isOpen);
      if (this.isOpen) {
        this.searchText = '';
        this.updateFilteredOptions();
      }
    }
  }

  updateFilteredOptions(): void {
    // Show only UNSELECTED items in the dropdown
    let unselectedOptions = this.options.filter(opt => 
      !this.selectedIds.includes(this.getOptionId(opt))
    );

    // Apply search filter
    if (!this.searchText.trim()) {
      this.filteredOptions = unselectedOptions;
    } else {
      const search = this.searchText.toLowerCase();
      this.filteredOptions = unselectedOptions.filter(opt => {
        const displayName = this.getOptionDisplayName(opt);
        return displayName.toLowerCase().includes(search);
      });
    }
  }

  onSearchChange(text: string): void {
    this.searchText = text;
    this.updateFilteredOptions();
  }

  selectOption(optionId: string): void {
    if (!this.selectedIds.includes(optionId)) {
      this.selectedIds.push(optionId);
      this.selectionChange.emit([...this.selectedIds]);
      this.updateFilteredOptions();
      this.cdr.markForCheck();
    }
  }

  removeOption(optionId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const index = this.selectedIds.indexOf(optionId);
    if (index >= 0) {
      this.selectedIds.splice(index, 1);
      this.selectionChange.emit([...this.selectedIds]);
      this.updateFilteredOptions();
      this.cdr.markForCheck();
    }
  }

  getOptionDisplayName(option: MultiSelectOption): string {
    return option.name || option.label || option.value || '';
  }

  getOptionId(option: MultiSelectOption): string {
    return option._id || option.id || '';
  }

  getSelectedOption(id: string): MultiSelectOption | undefined {
    return this.options.find(opt => this.getOptionId(opt) === id);
  }

  clearAllSelections(event: Event): void {
    event.stopPropagation();
    this.selectedIds = [];
    this.selectionChange.emit([...this.selectedIds]);
    this.updateFilteredOptions();
    this.cdr.markForCheck();
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.dropdownToggle.emit(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) {
      return;
    }

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const clickedInside = path.includes(this.elementRef.nativeElement);

    if (!clickedInside) {
      this.closeDropdown();
      this.cdr.markForCheck();
    }
  }
}

