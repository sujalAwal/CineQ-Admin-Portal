# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start                # Dev server (ng serve)
npm run build            # Development build
npm run build-prod       # Production build (generates env, sets base-href)
npm test                 # Run tests (ng test)
npm run lint             # ESLint on src/**/*.ts and src/**/*.html
npm run lint:fix         # Auto-fix linting issues
npm run prettier         # Format code with Prettier
npm run generate-env     # Generate environment.prod.ts from env vars
```

Package manager: `yarn` (yarn.lock present).

## Architecture

**Angular 20 SPA** — cinema management admin portal backed by a Spring Boot API.

### Module Layout

```
src/app/
├── app-routing.module.ts       # Root router — all routes lazy-load via loadComponent()
├── demo/                       # Feature areas (lazy-loaded)
│   ├── cinema-management/      # Theatre, screen, showtime, seats, crew roles, seat layouts
│   ├── content-management/     # Genres, artists, movies, banners, media
│   ├── user-management/        # Roles, users
│   ├── settings/               # Backend/admin/customer portal settings
│   ├── main-settings/          # Module management, email templates
│   └── pages/                  # Auth pages (login, register)
├── shared/
│   ├── services/               # API services (one per domain entity)
│   ├── interfaces/             # Typed API response shapes
│   ├── guards/                 # AuthGuard, GuestGuard
│   ├── interceptors/           # AuthInterceptor, LoadingInterceptor
│   └── components/             # DataTableComponent, modal components
└── theme/layout/               # AdminComponent (protected), GuestComponent (public)
```

### Routing & Layouts

Two root layouts:
- **AdminComponent** — all `/dashboard`, `/content/*`, `/cinema/*`, etc. routes; wrapped in `AuthGuard`
- **GuestComponent** — `/login`, `/register`; wrapped in `GuestGuard` (redirects authenticated users to dashboard)

All feature routes use `loadComponent()` (standalone components, no NgModules).

### API & Services

- Backend: `http://localhost:8080/api` (dev) — Spring Boot REST API
- Auth: Cookie-based JWT (`withCredentials: true` on all requests)
- Every domain entity has its own service in `src/app/shared/services/`

### Service SLUG Pattern (mandatory)

Every service that calls form-manager-backed endpoints **must** define a `private readonly SLUG` constant and use it in all URL constructions. Never hardcode the slug string more than once.

```typescript
@Injectable({ providedIn: 'root' })
export class TheatreService {
  private readonly baseUrl = `${environment.api.baseUrl}/v1`;
  private readonly SLUG = 'theatres';   // ← single source of truth; must match backend form manager slug exactly

  getList(params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/list/${this.SLUG}`, ...);
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/view/${this.SLUG}/${id}`, ...);
  }

  save(itemData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit/${this.SLUG}`, itemData, ...);
  }

  // Single delete delegates to bulkDelete
  delete(id: string): Observable<boolean> {
    return this.bulkDelete([id]);
  }

  // Enable / Disable — PATCH /v1/update-status
  // Payload: { ids, formSlug: this.SLUG, isActive: boolean }
  enable(ids: string[]): Observable<boolean> {
    return this.http.patch<any>(`${this.baseUrl}/update-status`,
      { ids, formSlug: this.SLUG, isActive: true }, { withCredentials: true });
  }

  disable(ids: string[]): Observable<boolean> {
    return this.http.patch<any>(`${this.baseUrl}/update-status`,
      { ids, formSlug: this.SLUG, isActive: false }, { withCredentials: true });
  }

  // Bulk delete — DELETE /v1/delete (with body)
  // Payload: { ids, formSlug: this.SLUG, collectionName: 'mongo_collection_name' }
  bulkDelete(ids: string[]): Observable<boolean> {
    return this.http.delete<any>(`${this.baseUrl}/delete`,
      { body: { ids, formSlug: this.SLUG, collectionName: 'theatres' }, withCredentials: true });
  }
}
```

**Slug must be plural kebab-case** and match the backend form manager JSON `"slug"` field exactly. A mismatch causes 404s. See the cinema-management CLAUDE.md for the full slug reference table.

**Modal save payload — `id` must be in BOTH top-level and `formData` on UPDATE:**
```typescript
const itemData = {
  stepSlug: 'v1',
  action: this.item?.id ? 'UPDATE' : 'CREATE',
  ...(this.item?.id && { id: this.item.id }),
  formData: {
    ...(this.item?.id && { id: this.item.id }),
    // ...other form fields
  }
};
```

Standard service pattern:
- `BehaviorSubject` for entity state (no NgRx)
- 5-minute client-side cache with request deduplication
- `ApiResponse<T>` / `PaginatedApiResponse<T>` typed responses
- Toast notifications (ngx-toastr) for errors and success feedback
- 401 handling triggers token refresh via `AuthInterceptor`

### Component Conventions

- All components are **standalone** with `ChangeDetectionStrategy.OnPush`; call `cdr.markForCheck()` after async updates
- Subscriptions cleaned up with `takeUntil(this.destroy$)` + `ngOnDestroy`
- Reactive forms with `debounceTime` / `distinctUntilChanged`
- **DataTableComponent** — reusable table with pagination, search, sorting, bulk actions
- Modals for create/edit live in `src/app/shared/components/`

### DataTableComponent

Key inputs/outputs:

```typescript
@Input() config: TableConfig    // columns, actions, bulkActions, searchable, paginated
@Input() data: any[]
@Input() loading: boolean
@Input() pagination: PaginationInfo

@Output() actionClick           // { action: string, item: any }
@Output() search                // string (debounced 300ms)
@Output() pageChange            // number
@Output() sort                  // { field: string, order: 'asc' | 'desc' }
@Output() toggleChange          // { item, field, value: boolean }
@Output() bulkActionClick       // { selectedIds: string[], action: string }
@Output() refresh               // void
```

Column types: `'text' | 'date' | 'number' | 'badge' | 'toggle' | 'currency' | 'image' | 'email' | 'sn'`. Nested field access uses dot notation (e.g. `'user.profile.name'`). Action visibility is controlled per row via `can_${action.type}` property.

### New Module Development Workflow

When assigned a new module task, **always ask first**:

1. **Is this a JSON form-manager based module or custom development?**

**If form-manager based:**
- Only need: `slug` (matches the backend FormManager slug) and the list of form fields
- API shape is always the same — no custom endpoints needed:
  - `POST /v1/submit/{slug}/v1` — create / update / delete
  - `GET /v1/view/{slug}/v1/{id}` — single record
  - `GET /v1/list/{slug}/v1` — paginated list
- Deliver the full standard module: list page with DataTable, create/edit modal, delete confirmation, bulk actions, search, pagination, toggle support — all features, not a partial implementation
- Create one service in `shared/services/`, one modal in `shared/components/`, one feature component in the appropriate `demo/` area, and wire the route
- **Always define `private readonly SLUG` in the service** — never hardcode the slug string more than once

**If custom development:**
- Ask for all API endpoints (method, path, request/response shape) before starting
- Ask for any non-standard UI requirements

### Modal Pattern

All entity modals extend a `BaseModalComponent` wrapper. Each modal:
- `@Input() isVisible: boolean` / `@Output() closed`
- `@Input() item: T | null` — null means create mode, object means edit
- `@Output() itemSaved` — emits the saved entity after success
- Calls `ngOnChanges` to populate form on edit and switch title/button text
- Submits with `{ stepSlug: 'v1', action: 'CREATE' | 'UPDATE', ...formData }`

`ModalConfig` controls title, icon (Tabler icon name), size (`'xs'|'sm'|'md'|'lg'|'xl'`), footer buttons, and loading state.

`ConfirmationModalComponent` supports an HTML `message` with icon color options (`'primary'|'warning'|'danger'|'success'|'info'`).

### Dropdown Data in Modals

When a modal needs foreign-key dropdowns (e.g. theatreId, screenId, movieId), inject the relevant service and load data in `ngOnChanges` when `isVisible` becomes `true`. Use a cache guard to avoid repeat calls:

```typescript
ngOnChanges(changes: SimpleChanges): void {
  if (changes['isVisible']?.currentValue === true) {
    this.loadDropdownData();
  }
}

private loadDropdownData(): void {
  if (this.theatres.length) return; // cache guard
  this.theatreService.getList({ page: 1, size: 200 }).subscribe({
    next: r => { this.theatres = r.data?.[0]?.theatres ?? []; },
    error: () => {}
  });
}
```

Replace plain `<input type="text">` with `<select>` for any foreign-key field. Never let the user type raw IDs.

### Feature Component Wiring

Standard state shape for any list page:

```typescript
tableConfig: TableConfig;
data: any[];
loading: boolean;
pagination: PaginationInfo;
currentFilters: { page, size, search?, sortBy?, sortDirection? };

showModal: boolean;
selectedItem: any;     // null → create, object → edit
modalLoading: boolean; // true while fetching full item by id

showConfirmationModal: boolean;
confirmationConfig: ConfirmationConfig;
itemToDelete: any;

bulkOperation: { type: 'enable' | 'disable' | 'delete' | null, selectedIds: string[] };
```

Event flow: table action → fetch full item by id → open modal → modal emits `itemSaved` → reload list. Toggle actions use optimistic updates and revert on error. Bulk actions show a confirmation modal first. API responses may nest the array inside `data[0]['entityName']`, so flatten with `flatMap`.

### Toast Service

Custom wrapper around ngx-toastr (`src/app/shared/services/toast.service.ts`):
- `success()` / `error()` / `warning()` — standard
- `activated()` — green, for enable actions
- `inactive()` — yellow, for disable actions

### Environment

Three configs: `environment.ts` (dev), `environment.staging.ts`, `environment.prod.ts` (auto-generated from env vars via `scripts/generate-env.js`). Angular CLI replaces the file at build time via `fileReplacements` in `angular.json`.

Key env vars for production: `API_BASE_URL`, `AUTH_TOKEN_KEY`, `AUTH_REFRESH_TOKEN_KEY`, Supabase storage URL, feature flags.

### Deployment

Multi-stage Dockerfile: Node 22-alpine build → Nginx-alpine serve. Nginx config includes SPA routing (`try_files`), gzip, 1-year asset caching, security headers, and a `/health` endpoint. `docker-compose.yml` exposes port 80 with Traefik label `Host(dashboard.cineq.local)` on the `cineq-network` bridge network.

### Key Dependencies

- Bootstrap 5.3 + ng-bootstrap
- Tabler icons (icon names used bare, without `ti ti-` prefix, in `ModalConfig`)
- ApexCharts (dashboard charts)
- ngx-toastr (notifications)
- ngx-quill (rich text editor)
- ngx-dropzone (file uploads)

## Dashboard Module (Epic: a9cfcf82-69f0-44f7-81ca-15e321453d30)

The main dashboard at `/dashboard/default` has been completely redesigned.

### Features

- **KPI Cards**: At-a-glance metrics for Total/Today's Bookings and Revenue, Now Showing Movies, and Active Theatres.
- **Revenue Trend Chart**: A bar chart showing revenue over a selectable period (7, 15, or 30 days).
- **Booking Status Chart**: A donut chart showing the distribution of Confirmed, Pending, and Cancelled bookings.
- **Top 5 Lists**: Ranked lists for top-performing movies and theatres by revenue.
- **Movie Showcase**: Horizontal scrolling carousels for "Now Showing" and "Coming Soon" movies.
- **Recent Bookings**: A table displaying the latest booking transactions.
- **Payment Methods Chart**: A pie chart visualizing the distribution of revenue by payment method.
- **Responsive Layout**: A full-responsive design built with CSS Grid.
- **Currency**: All monetary values are displayed in Nepalese Rupees (NPR).

### Implementation Details

- **Component**: `src/app/demo/dashboard/default/default.component.ts` (and its corresponding `.html` and `.scss` files).
- **Service**: `src/app/shared/services/dashboard.service.ts`
  - Fetches all dashboard data from the `/api/dashboard/stats` endpoint.
  - Implements a 5-minute client-side cache for the dashboard data, with separate caching for different time periods on the revenue trend.
- **Interface**: `src/app/shared/interfaces/dashboard.interface.ts`
  - Defines the data structures for the API response, including `DashboardStats`, `RevenueTrendItem`, `StatusDistributionItem`, etc.
- **Charting Library**: `ng-apexcharts` is used for all charts on the dashboard.
