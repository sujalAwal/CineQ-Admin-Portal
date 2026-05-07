// Angular import
import { Component, OnDestroy, OnInit, output, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

//theme version
import { environment } from 'src/environments/environment';

// project import
import { NavigationItem, NavigationItems } from '../navigation';
import { AuthService } from 'src/app/shared/services/auth.service';

import { NavCollapseComponent } from './nav-collapse/nav-collapse.component';
import { NavGroupComponent } from './nav-group/nav-group.component';
import { NavItemComponent } from './nav-item/nav-item.component';

// NgScrollbarModule
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-nav-content',
  imports: [RouterModule, NavCollapseComponent, NavGroupComponent, NavItemComponent, SharedModule],
  templateUrl: './nav-content.component.html',
  styleUrl: './nav-content.component.scss'
})
export class NavContentComponent implements OnInit, OnDestroy {
  private location = inject(Location);
  private router = inject(Router);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  // public props
  NavCollapsedMob = output();
  SubmenuCollapse = output();

  // version
  title = 'Demo application for version numbering';
  currentApplicationVersion = environment.appVersion;

  navigations!: NavigationItem[];
  windowWidth: number;

  // Constructor
  constructor() {
    this.navigations = [];
    this.windowWidth = window.innerWidth;
  }

  // Life cycle events
  ngOnInit() {
    this.updateNavigation();
    this.authService.isAuthorizationReady$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateNavigation());

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.updateNavigation();
        }
      });

    if (this.windowWidth < 1025) {
      setTimeout(() => {
        (document.querySelector('.coded-navbar') as HTMLDivElement).classList.add('menupos-static');
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateNavigation(): void {
    const allowedRoutes = this.authService.getAllowedNavigationApis();
    const filtered = this.filterNavigationItems(NavigationItems, allowedRoutes);
    this.navigations = filtered;
  }

  private filterNavigationItems(items: NavigationItem[], allowedRoutes: Set<string>): NavigationItem[] {
    const result: NavigationItem[] = [];

    for (const item of items) {
      if (item.type === 'item') {
        if (!item.url) {
          continue;
        }

        const normalized = this.authService.normalizePath(item.url);
        if (normalized === '/dashboard' || allowedRoutes.has(normalized)) {
          result.push({ ...item });
        }
        continue;
      }

      const filteredChildren = item.children ? this.filterNavigationItems(item.children, allowedRoutes) : [];
      if (filteredChildren.length > 0) {
        result.push({
          ...item,
          children: filteredChildren
        });
      }
    }

    return result;
  }

  fireOutClick() {
    let current_url = this.location.path();
    // eslint-disable-next-line
    // @ts-ignore
    if (this.location['_baseHref']) {
      // eslint-disable-next-line
      // @ts-ignore
      current_url = this.location['_baseHref'] + this.location.path();
    }
    const link = "a.nav-link[ href='" + current_url + "' ]";
    const ele = document.querySelector(link);
    if (ele !== null && ele !== undefined) {
      const parent = ele.parentElement;
      const up_parent = parent?.parentElement?.parentElement;
      const last_parent = up_parent?.parentElement;
      if (parent?.classList.contains('coded-hasmenu')) {
        parent.classList.add('coded-trigger');
        parent.classList.add('active');
      } else if (up_parent?.classList.contains('coded-hasmenu')) {
        up_parent.classList.add('coded-trigger');
        up_parent.classList.add('active');
      } else if (last_parent?.classList.contains('coded-hasmenu')) {
        last_parent.classList.add('coded-trigger');
        last_parent.classList.add('active');
      }
    }
  }
}
