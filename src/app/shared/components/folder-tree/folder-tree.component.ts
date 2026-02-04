import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaFolder } from '../../interfaces/media.interface';

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="folder-item" 
         [class.active]="isActive(folder)"
         (click)="onFolderClick(folder)">
      <div class="folder-content" [style.padding-left.px]="level * 20">
        <i *ngIf="folder.children?.length" 
           class="ti" 
           [class.ti-chevron-down]="folder.expanded" 
           [class.ti-chevron-right]="!folder.expanded"
           (click)="toggleExpand($event, folder)">
        </i>
        <i class="ti" [class.ti-folder-open]="folder.expanded" [class.ti-folder]="!folder.expanded"></i>
        <span>{{ folder.fileName }}</span>
      </div>
    </div>
    
    <!-- Recursively render children -->
    <ng-container *ngIf="folder.children && folder.children.length > 0 && folder.expanded">
      <app-folder-tree
        *ngFor="let child of folder.children"
        [folder]="child"
        [level]="level + 1"
        [selectedFolderId]="selectedFolderId"
        (folderSelected)="onFolderSelected($event)">
      </app-folder-tree>
    </ng-container>
  `,
  styles: [`
    .folder-item {
      cursor: pointer;
      padding: 4px 0;
    }
    
    .folder-item:hover {
      background-color: rgba(0,0,0,0.05);
    }
    
    .folder-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .folder-item.active {
      background-color: #e9ecef;
    }
    
    .ti-folder, .ti-folder-open {
      color: #ffc107;
    }
    
    .ti-chevron-right, .ti-chevron-down {
      font-size: 12px;
      color: #6c757d;
      width: 16px;
      text-align: center;
    }
  `]
})
export class FolderTreeComponent {
  @Input() folder!: MediaFolder;
  @Input() level: number = 0;
  @Input() selectedFolderId: string | undefined;
  @Output() folderSelected = new EventEmitter<MediaFolder>();

  isActive(folder: MediaFolder): boolean {
    return this.selectedFolderId === folder.id;
  }

  onFolderClick(folder: MediaFolder): void {
    if (!folder.expanded) {
      folder.expanded = true;
    }
    this.folderSelected.emit(folder);
  }

  toggleExpand(event: Event, folder: MediaFolder): void {
    event.stopPropagation();
    folder.expanded = !folder.expanded;
  }

  onFolderSelected(folder: MediaFolder): void {
    this.folderSelected.emit(folder);
  }
}