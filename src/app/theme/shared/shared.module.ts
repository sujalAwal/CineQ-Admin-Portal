// Angular Imports
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// project import
import { CardComponent } from './components/card/card.component';

// Shared Components
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { BaseModalComponent } from '../../shared/components/base-modal/base-modal.component';
import { GenreModalComponent } from '../../shared/components/genre-modal/genre-modal.component';
import { ArtistModalComponent } from '../../shared/components/artist-modal/artist-modal.component';

// third party
import { NgScrollbarModule } from 'ngx-scrollbar';

// bootstrap import
import { NgbDropdownModule, NgbNavModule, NgbModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    DataTableComponent,
    BaseModalComponent,
    GenreModalComponent,
    ArtistModalComponent,
    NgbDropdownModule,
    NgbNavModule,
    NgbModule,
    NgbCollapseModule,
    NgScrollbarModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    DataTableComponent,
    BaseModalComponent,
    GenreModalComponent,
    ArtistModalComponent,
    NgbModule,
    NgbDropdownModule,
    NgbNavModule,
    NgbCollapseModule,
    NgScrollbarModule
  ],
  declarations: []
})
export class SharedModule {}
