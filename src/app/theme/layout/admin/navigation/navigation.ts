export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  children?: NavigationItem[];
  role?: string[];
  isMainParent?: boolean;
}

export const NavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'default',
        title: 'Dashboard',
        type: 'item',
        classes: 'nav-item',
        url: '/dashboard',
        icon: 'ti ti-dashboard',
        breadcrumbs: false
      }
    ]
  },
  {
    id: 'content-management',
    title: 'Content Management',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'content',
        title: 'Content Management',
        type: 'collapse',
        icon: 'ti ti-movie',
        children: [
          {
            id: 'genres',
            title: 'Genres',
            type: 'item',
            url: '/content/genres',
            icon: 'ti ti-masks-theater',
            breadcrumbs: false
          },
          {
            id: 'artists',
            title: 'Artists',
            type: 'item',
            url: '/content/artists',
            icon: 'ti ti-users',
            breadcrumbs: false
          },
          {
            id: 'artist-types',
            title: 'Artist Types',
            type: 'item',
            url: '/content/artist-types',
            icon: 'ti ti-palette',
            breadcrumbs: false
          },
          {
            id: 'media-manager',
            title: 'Media Manager',
            type: 'item',
            url: '/content/media-manager',
            icon: 'ti ti-photo',
            breadcrumbs: false
          },
          {
            id: 'banners',
            title: 'Banners',
            type: 'item',
            url: '/content/banners',
            icon: 'ti ti-photo-heart',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'user-management',
    title: 'User Management',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'user-management-section',
        title: 'User Management',
        type: 'collapse',
        icon: 'ti ti-users-group',
        children: [
          {
            id: 'roles',
            title: 'Roles',
            type: 'item',
            url: '/user-management/roles',
            icon: 'ti ti-shield-lock',
            breadcrumbs: false
          },
          {
            id: 'users',
            title: 'Users',
            type: 'item',
            url: '/user-management/users',
            icon: 'ti ti-user',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'main-settings',
    title: 'Main Settings',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'main-settings-section',
        title: 'Main Settings',
        type: 'collapse',
        icon: 'ti ti-settings',
        children: [
          {
            id: 'modulemanagement',
            title: 'Module Management',
            type: 'item',
            url: '/main-settings/modulemanagement',
            icon: 'ti ti-packages',
            breadcrumbs: false
          },
          {
            id: 'email-templates',
            title: 'Email Templates',
            type: 'item',
            url: '/main-settings/email-templates',
            icon: 'ti ti-mail',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'cinema-management',
    title: 'Cinema Management',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'cinema-section',
        title: 'Cinema Management',
        type: 'collapse',
        icon: 'ti ti-building-theater',
        children: [
         
          {
            id: 'movies-cinema',
            title: 'Movies',
            type: 'item',
            url: '/cinema/movies',
            icon: 'ti ti-movie',
            breadcrumbs: false
          },
          {
            id: 'theatre',
            title: 'Theatres',
            type: 'item',
            url: '/cinema/theatre',
            icon: 'ti ti-building',
            breadcrumbs: false
          },
          {
            id: 'seat-type',
            title: 'Seat Types',
            type: 'item',
            url: '/cinema/seat-type',
            icon: 'ti ti-chair',
            breadcrumbs: false
          },
          {
            id: 'seat-status',
            title: 'Seat Status',
            type: 'item',
            url: '/cinema/seat-status',
            icon: 'ti ti-toggle-left',
            breadcrumbs: false
          },
          {
            id: 'screen',
            title: 'Screens',
            type: 'item',
            url: '/cinema/screen',
            icon: 'ti ti-tv',
            breadcrumbs: false
          },
          {
            id: 'showtime-status',
            title: 'Showtime Status',
            type: 'item',
            url: '/cinema/showtime-status',
            icon: 'ti ti-clock',
            breadcrumbs: false
          },
          {
            id: 'showtime',
            title: 'Showtimes',
            type: 'item',
            url: '/cinema/showtime',
            icon: 'ti ti-calendar-time',
            breadcrumbs: false
          },
          {
            id: 'seat-layout',
            title: 'Seat Layouts',
            type: 'item',
            url: '/cinema/seat-layout',
            icon: 'ti ti-layout-grid',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'settings-section',
        title: 'Settings',
        type: 'collapse',
        icon: 'ti ti-settings-2',
        children: [
          {
            id: 'setting-groups',
            title: 'Setting Groups',
            type: 'item',
            url: '/settings/setting-groups',
            icon: 'ti ti-folder-cog',
            breadcrumbs: false
          },
          {
            id: 'backend-settings',
            title: 'Backend Settings',
            type: 'item',
            url: '/settings/backend-settings',
            icon: 'ti ti-server-cog',
            breadcrumbs: false
          },
          {
            id: 'admin-portal-settings',
            title: 'Admin Portal Settings',
            type: 'item',
            url: '/settings/admin-portal-settings',
            icon: 'ti ti-layout-dashboard',
            breadcrumbs: false
          },
          {
            id: 'customer-portal-settings',
            title: 'Customer Portal Settings',
            type: 'item',
            url: '/settings/customer-portal-settings',
            icon: 'ti ti-users-group',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'dynamic-form-manager',
    title: 'Dynamic Form Manager',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'form-manager',
        title: 'Form Manager',
        type: 'collapse',
        icon: 'ti ti-forms',
        children: [
          {
            id: 'form-managers',
            title: 'Form Managers',
            type: 'item',
            url: '/form-manager',
            icon: 'ti ti-layout-board',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'bookings',
    title: 'Bookings Details',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'bookings-section',
        title: 'Bookings Details',
        type: 'collapse',
        icon: 'ti ti-receipt',
        children: [
          {
            id: 'bookings',
            title: 'Bookings',
            type: 'item',
            url: '/bookings/bookings',
            icon: 'ti ti-bookmark',
            breadcrumbs: false
          },
          {
            id: 'payments',
            title: 'Payments',
            type: 'item',
            url: '/bookings/payments',
            icon: 'ti ti-cash',
            breadcrumbs: false
          }
        ]
      }
    ]
  }
];
