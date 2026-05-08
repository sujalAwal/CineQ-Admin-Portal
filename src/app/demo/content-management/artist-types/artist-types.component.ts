import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { SharedModule } from '../../../theme/shared/shared.module';
import { ArtistTypeModalComponent } from '../../../shared/components/artist-type-modal/artist-type-modal.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ArtistTypesService } from '../../../shared/services/artist-types.service';

@Component({
  selector: 'app-artist-types',
  standalone: true,
  imports: [CommonModule, SharedModule, ReactiveFormsModule, ArtistTypeModalComponent, ConfirmationModalComponent],
  templateUrl: './artist-types.component.html',
  styleUrls: ['./artist-types.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistTypesComponent implements OnInit, OnDestroy {

  artistTypes: any[] = [];
  loading = false;
  searchControl = new FormControl('');

  showModal = false;
  selectedItem: any = null;
  modalLoading = false;

  showConfirmationModal = false;
  confirmationConfig: ConfirmationConfig = {
    title: 'Confirm Delete',
    message: '',
    icon: 'ti ti-trash',
    iconColor: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonClass: 'btn-danger'
  };
  itemToDelete: any = null;

  private destroy$ = new Subject<void>();

  readonly activeCardStyle = {
    bg: 'bg-light-success',
    icon: 'text-success',
    badge: 'bg-success',
    btn: 'btn-outline-success'
  };

  readonly inactiveCardStyle = {
    bg: 'bg-light-danger',
    icon: 'text-danger',
    badge: 'bg-danger',
    btn: 'btn-outline-danger'
  };

  constructor(
    private service: ArtistTypesService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.loadData(term || ''));
  }

  loadData(search = ''): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service.getList({ page: 1, size: 100, search: search || undefined }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.artistTypes = response.data.flatMap((item: any) => {
          const records = item['artist-types'] || item['artist_types'] || item['artistTypes'] || [];
          return Array.isArray(records) ? records : (item.id ? [item] : []);
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.artistTypes = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getCardStyle(isActive: boolean) {
    return isActive ? this.activeCardStyle : this.inactiveCardStyle;
  }

  openAddModal(): void {
    this.selectedItem = null;
    this.showModal = true;
    this.cdr.markForCheck();
  }

  editItem(item: any): void {
    this.modalLoading = true;
    this.cdr.markForCheck();

    this.service.getById(item.id).subscribe({
      next: (fullItem) => {
        this.selectedItem = fullItem;
        this.modalLoading = false;
        this.showModal = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedItem = item;
        this.modalLoading = false;
        this.showModal = true;
        this.cdr.markForCheck();
      }
    });
  }

  deleteItem(item: any): void {
    this.itemToDelete = item;
    this.confirmationConfig = {
      title: 'Delete Artist Type',
      message: `Are you sure you want to delete <strong>"${item.name}"</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
      icon: 'ti ti-trash-x', iconColor: 'danger',
      confirmText: 'Delete', cancelText: 'Cancel', loading: false
    };
    this.showConfirmationModal = true;
  }

  onModalClosed(): void {
    this.showModal = false;
    this.selectedItem = null;
    this.modalLoading = false;
  }

  onItemSaved(itemData: any): void {
    const name = itemData.name || 'Artist Type';
    if (itemData.id) {
      this.toastService.success(`"${name}" has been updated successfully!`, 'Updated');
    } else {
      this.toastService.success(`"${name}" has been created successfully!`, 'Created');
    }
    this.onModalClosed();
    this.loadData(this.searchControl.value || '');
  }

  onDeleteConfirmed(): void {
    if (!this.itemToDelete) return;

    this.confirmationConfig.loading = true;

    this.service.delete(this.itemToDelete.id).subscribe({
      next: () => {
        this.toastService.success(`"${this.itemToDelete!.name}" deleted successfully!`, 'Deleted');
        this.showConfirmationModal = false;
        this.itemToDelete = null;
        this.confirmationConfig.loading = false;
        this.loadData(this.searchControl.value || '');
      },
      error: () => {
        this.showConfirmationModal = false;
        this.itemToDelete = null;
        this.confirmationConfig.loading = false;
      }
    });
  }

  onDeleteCancelled(): void {
    this.showConfirmationModal = false;
    this.itemToDelete = null;
    this.confirmationConfig.loading = false;
  }
}
