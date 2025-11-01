import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';

// Import guards
import { AuthGuard } from './shared/guards/auth.guard';
import { GuestGuard } from './shared/guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AdminComponent,
    canActivate: [AuthGuard], // Protect admin routes
    children: [
      {
        path: 'default',
        loadComponent: () => import('./demo/dashboard/default/default.component').then((c) => c.DefaultComponent)
      },
      {
        path: 'dashboard', // Add dashboard alias
        redirectTo: '/default',
        pathMatch: 'full'
      },
      {
        path: 'typography',
        loadComponent: () => import('./demo/elements/typography/typography.component').then((c) => c.TypographyComponent)
      },
      {
        path: 'color',
        loadComponent: () => import('./demo/elements/element-color/element-color.component').then((c) => c.ElementColorComponent)
      },
      {
        path: 'sample-page',
        loadComponent: () => import('./demo/other/sample-page/sample-page.component').then((c) => c.SamplePageComponent)
      },
      // Content Management Routes
      {
        path: 'content',
        children: [
          {
            path: 'genres',
            loadComponent: () => import('./demo/content-management/genres/genres.component').then((c) => c.GenresComponent)
          },
          {
            path: 'artists',
            loadComponent: () => import('./demo/content-management/artists/artists.component').then((c) => c.ArtistsComponent)
          },
          {
            path: 'artist-types',
            loadComponent: () => import('./demo/content-management/artist-types/artist-types.component').then((c) => c.ArtistTypesComponent)
          },
          {
            path: 'movies',
            loadComponent: () => import('./demo/content-management/movies/movies.component').then((c) => c.MoviesComponent)
          },
          {
            path: 'media-manager',
            loadComponent: () => import('./demo/content-management/media-manager/media-manager.component').then((c) => c.MediaManagerComponent)
          },
          {
            path: 'banners',
            loadComponent: () => import('./demo/content-management/banners/banners.component').then((c) => c.BannersComponent)
          }
        ]
      }
    ]
  },
  {
    path: '',
    component: GuestComponent,
    canActivate: [GuestGuard], // Protect guest routes (redirect if logged in)
    children: [
      {
        path: 'login',
        loadComponent: () => import('./demo/pages/authentication/login/login.component').then((c) => c.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./demo/pages/authentication/register/register.component').then((c) => c.RegisterComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
