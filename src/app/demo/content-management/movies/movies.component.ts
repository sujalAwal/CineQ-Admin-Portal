import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// project imports
import { SharedModule } from '../../../theme/shared/shared.module';

@Component({
  selector: 'app-movies',
  imports: [CommonModule, SharedModule],
  templateUrl: './movies.component.html',
  styleUrls: ['./movies.component.scss']
})
export class MoviesComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}