import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';

@Component({
  selector: 'app-artist-types',
  imports: [CommonModule, SharedModule],
  templateUrl: './artist-types.component.html',
  styleUrls: ['./artist-types.component.scss']
})
export class ArtistTypesComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}