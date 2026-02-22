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
        path: 'dashboard',
        loadComponent: () => import('./demo/dashboard/default/default.component').then((c) => c.DefaultComponent)
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
      },
      // Dynamic Form Manager Routes
      {
        path: 'form-manager',
        children: [
          {
            path: '',
            loadComponent: () => import('./demo/content-management/form-managers/form-managers.component').then((c) => c.FormManagersComponent)
          }
        ]
      },
      // User Management Routes
      {
        path: 'user-management',
        children: [
          {
            path: 'roles',
            loadComponent: () => import('./demo/user-management/roles/roles.component').then((c) => c.RolesComponent)
          },
          {
            path: 'users',
            loadComponent: () => import('./demo/user-management/users/users.component').then((c) => c.UsersComponent)
          }
        ]
      },
      // Main Settings Routes
      {
        path: 'main-settings',
        children: [
          {
            path: '',
            redirectTo: 'modulemanagement',
            pathMatch: 'full'
          },
          {
            path: 'modulemanagement',
            loadComponent: () => import('./demo/main-settings/modulemanagement/modulemanagement.component').then((c) => c.ModulemanagementComponent)
          },
          {
            path: 'email-templates',
            loadComponent: () => import('./demo/main-settings/email-templates/email-templates.component').then((c) => c.EmailTemplatesComponent)
          }
        ]
      },
      // Cinema Management Routes
      {
        path: 'cinema',
        children: [
          {
            path: 'people',
            loadComponent: () => import('./demo/cinema-management/people/people.component').then((c) => c.PeopleComponent)
          },
          {
            path: 'crew-roles',
            loadComponent: () => import('./demo/cinema-management/crew-roles/crew-roles.component').then((c) => c.CrewRolesComponent)
          },
          {
            path: 'movies',
            loadComponent: () => import('./demo/cinema-management/movies-cinema/movies.component').then((c) => c.MoviesCinemaComponent)
          },
          {
            path: 'theatre',
            loadComponent: () => import('./demo/cinema-management/theatre/theatre.component').then((c) => c.TheatreComponent)
          },
          {
            path: 'seat-type',
            loadComponent: () => import('./demo/cinema-management/seat-type/seat-type.component').then((c) => c.SeatTypeComponent)
          },
          {
            path: 'seat-status',
            loadComponent: () => import('./demo/cinema-management/seat-status/seat-status.component').then((c) => c.SeatStatusComponent)
          },
          {
            path: 'screen',
            loadComponent: () => import('./demo/cinema-management/screen/screen.component').then((c) => c.ScreenComponent)
          },
          {
            path: 'showtime-status',
            loadComponent: () => import('./demo/cinema-management/showtime-status/showtime-status.component').then((c) => c.ShowtimeStatusComponent)
          },
          {
            path: 'showtime',
            loadComponent: () => import('./demo/cinema-management/showtime/showtime.component').then((c) => c.ShowtimeComponent)
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
