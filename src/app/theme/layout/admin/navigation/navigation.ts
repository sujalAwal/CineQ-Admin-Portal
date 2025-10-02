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
        url: '/default',
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
            id: 'movies',
            title: 'Movies',
            type: 'item',
            url: '/content/movies',
            icon: 'ti ti-movie',
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'page',
    title: 'Pages',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'Authentication',
        title: 'Authentication',
        type: 'collapse',
        icon: 'ti ti-key',
        children: [
          {
            id: 'login',
            title: 'Login',
            type: 'item',
            url: '/login',
            target: true,
            breadcrumbs: false
          },
          {
            id: 'register',
            title: 'Register',
            type: 'item',
            url: '/register',
            target: true,
            breadcrumbs: false
          }
        ]
      }
    ]
  },
  {
    id: 'elements',
    title: 'Elements',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'typography',
        title: 'Typography',
        type: 'item',
        classes: 'nav-item',
        url: '/typography',
        icon: 'ti ti-typography'
      },
      {
        id: 'color',
        title: 'Colors',
        type: 'item',
        classes: 'nav-item',
        url: '/color',
        icon: 'ti ti-brush'
      },
      {
        id: 'tabler',
        title: 'Tabler',
        type: 'item',
        classes: 'nav-item',
        url: 'https://tabler-icons.io/',
        icon: 'ti ti-plant-2',
        target: true,
        external: true
      }
    ]
  },
  {
    id: 'other',
    title: 'Other',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'sample-page',
        title: 'Sample Page',
        type: 'item',
        url: '/sample-page',
        classes: 'nav-item',
        icon: 'ti ti-brand-chrome'
      },
      {
        id: 'document',
        title: 'Document',
        type: 'item',
        classes: 'nav-item',
        url: 'https://angularjs.org/',
        icon: 'ti ti-vocabulary',
        target: true,
        external: true
      }
    ]
  }
];
