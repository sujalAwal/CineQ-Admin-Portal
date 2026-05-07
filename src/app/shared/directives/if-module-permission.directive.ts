import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, merge } from 'rxjs';
import { distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

export type ModulePermissionAction = 'create' | 'read' | 'update' | 'delete';

/**
 * Structural directive: renders the template only when the user has the given CRUD permission
 * for the current route's module (or an explicit module API path).
 *
 * Usage:
 * <ng-container *appIfModulePermission="'create'">...</ng-container>
 * <ng-container *appIfModulePermission="'create'; appIfModulePermissionApi: '/content/media-manager'">...</ng-container>
 */
@Directive({
  selector: '[appIfModulePermission]',
  standalone: true
})
export class IfModulePermissionDirective implements OnInit, OnChanges, OnDestroy {
  @Input() appIfModulePermission!: ModulePermissionAction;
  @Input() appIfModulePermissionApi?: string;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    merge(
      this.authService.isAuthorizationReady$().pipe(distinctUntilChanged()),
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.apply());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appIfModulePermission'] || changes['appIfModulePermissionApi']) {
      this.apply();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private apply(): void {
    this.viewContainer.clear();
    const action = this.appIfModulePermission;
    if (!action) {
      return;
    }
    const api = this.appIfModulePermissionApi?.trim()
      ? this.authService.normalizePath(this.appIfModulePermissionApi)
      : this.authService.normalizePath(this.router.url);
    if (this.authService.hasModulePermission(api, action)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
