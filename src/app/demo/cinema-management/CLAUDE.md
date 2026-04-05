# Cinema Management — CLAUDE.md

All cinema management modules in this directory are backed by the **Universal Form System** (form-manager JSON files in the backend). There is **no custom Java controller/service/repository** for these modules — the generic `UniversalFormController` handles all CRUD.

## Module Map

Every module follows the same pattern: list page + DataTable + entity modal + confirmation modal.

| Angular Route | Component Dir | Service | Modal | Backend Slug |
|---|---|---|---|---|
| `/cinema/people` | `people/` | `PeopleService` | `PeopleModalComponent` | `people` |
| `/cinema/crew-roles` | `crew-roles/` | `CrewRolesService` | `CrewRolesModalComponent` | `crew-roles` |
| `/cinema/movies` | `movies-cinema/` | `MoviesCinemaService` | `MoviesCinemaModalComponent` | `movies` |
| `/cinema/theatre` | `theatre/` | `TheatreService` | `TheatreModalComponent` | `theatres` |
| `/cinema/screen` | `screen/` | `ScreenService` | `ScreenModalComponent` | `screens` |
| `/cinema/seat-type` | `seat-type/` | `SeatTypeService` | `SeatTypeModalComponent` | `seat-types` |
| `/cinema/seat-status` | `seat-status/` | `SeatStatusService` | `SeatStatusModalComponent` | `seat-statuses` |
| `/cinema/showtime-status` | `showtime-status/` | `ShowtimeStatusService` | `ShowtimeStatusModalComponent` | `showtime-statuses` |
| `/cinema/showtime` | `showtime/` | `ShowtimeService` | `ShowtimeModalComponent` | `showtimes` |
| `/cinema/seat-layout` | `seat-layout/` | `SeatLayoutService` | `SeatLayoutModalComponent` | `seat-layouts` |

## API URL Pattern

All services use these five endpoint shapes:

```
GET    /v1/list/{slug}         → paginated list
GET    /v1/view/{slug}/{id}    → single record
POST   /v1/submit/{slug}       → create or update
PATCH  /v1/update-status       → enable / disable (single or bulk)
DELETE /v1/delete              → delete (single or bulk)
```

## SLUG Constant Rule

**Every service must define a `private readonly SLUG` constant.** Never hardcode the slug string more than once.

## Standard Service Method Signatures

```typescript
@Injectable({ providedIn: 'root' })
export class ExampleService {
  private readonly baseUrl = `${environment.api.baseUrl}/v1`;
  private readonly SLUG = 'examples';   // ← must match backend form manager slug exactly

  // List — GET /v1/list/{slug}
  getList(params?: any): Observable<any> { ... }

  // Single record — GET /v1/view/{slug}/{id}
  getById(id: string): Observable<any> { ... }

  // Create / Update — POST /v1/submit/{slug}
  // Payload: { stepSlug: 'v1', action: 'CREATE'|'UPDATE', id?: string, formData: { id?: string, ...fields } }
  save(itemData: any): Observable<any> { ... }

  // Single delete — delegates to bulkDelete
  delete(id: string): Observable<boolean> {
    return this.bulkDelete([id]);
  }

  // Enable — PATCH /v1/update-status
  enable(ids: string[]): Observable<boolean> {
    return this.http.patch(`${this.baseUrl}/update-status`,
      { ids, formSlug: this.SLUG, isActive: true }, { withCredentials: true });
  }

  // Disable — PATCH /v1/update-status
  disable(ids: string[]): Observable<boolean> {
    return this.http.patch(`${this.baseUrl}/update-status`,
      { ids, formSlug: this.SLUG, isActive: false }, { withCredentials: true });
  }

  // Bulk delete — DELETE /v1/delete
  bulkDelete(ids: string[]): Observable<boolean> {
    return this.http.delete(`${this.baseUrl}/delete`,
      { body: { ids, formSlug: this.SLUG, collectionName: 'collection_name' }, withCredentials: true });
  }
}
```

## Modal Save Payload Pattern

On UPDATE, `id` must appear in **both** the top-level body and inside `formData`:

```typescript
const itemData = {
  stepSlug: 'v1',
  action: this.item?.id ? 'UPDATE' : 'CREATE',
  ...(this.item?.id && { id: this.item.id }),   // top-level id for UPDATE
  formData: {
    ...(this.item?.id && { id: this.item.id }), // id inside formData for UPDATE
    // ...other form fields
  }
};
```

## Current SLUG Reference

| Service File | `SLUG` value | Matches form manager |
|---|---|---|
| `people.service.ts` | `'people'` | `people_form_manager.json` |
| `crew-roles.service.ts` | `'crew-roles'` | `crew_roles_form_manager.json` |
| `movies-cinema.service.ts` | `'movies'` | `movies_form_manager.json` |
| `theatre.service.ts` | `'theatres'` | `theatres_form_manager.json` |
| `screen.service.ts` | `'screens'` | `screens_form_manager.json` |
| `seat-type.service.ts` | `'seat-types'` | `seat_types_form_manager.json` |
| `seat-status.service.ts` | `'seat-statuses'` | `seat_statuses_form_manager.json` |
| `showtime-status.service.ts` | `'showtime-statuses'` | `showtime_statuses_form_manager.json` |
| `showtime.service.ts` | `'showtimes'` | `showtimes_form_manager.json` |
| `seat-layout.service.ts` | `'seat-layouts'` | `seat_layout_form_manager.json` |

## Modals with Dropdown Dependencies

Some modals require loading related data for `<select>` fields — never use plain text inputs for foreign-key fields:

| Modal | Dropdowns loaded |
|---|---|
| `ScreenModalComponent` | theatres (via `TheatreService`) |
| `ShowtimeModalComponent` | movies, theatres, screens, showtime-statuses |
| `SeatLayoutModalComponent` | screens, seat-types |
| `MoviesCinemaModalComponent` | genres, people (for starcast), crew-roles (for starcast) |

Load dropdown data in `ngOnChanges` when `isVisible` becomes `true`. Use a length-check cache guard so the API is only called once per modal session.

## Foreign Key Relationship Handling (Best Practice)

When a modal has foreign-key fields (e.g., selecting people, crew roles, genres), follow this pattern:

### 1. Use ForeignKeyDataService for Caching & Lookups

Inject the `ForeignKeyDataService` to manage all dropdown data with automatic caching:

```typescript
import { ForeignKeyDataService } from '../../services/foreign-key-data.service';

export class MyModalComponent implements OnInit, OnChanges, OnDestroy {
  people: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private peopleService: PeopleService,
    private fkDataService: ForeignKeyDataService
  ) {}

  ngOnChanges() {
    if (this.isVisible) this.loadDropdownData();
  }

  private loadDropdownData(): void {
    // Cache guard: skip if already cached
    if (this.people.length) return;

    // Load people and cache them
    this.peopleService.getList({ page: 1, size: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.people = response.data || [];
          // Pass response and custom extractor to FK service
          this.fkDataService.loadData('people', 
            this.peopleService.getList({ page: 1, size: 500 }),
            (r) => Array.isArray(r.data) ? r.data : (r.data?.[0]?.people || [])
          );
        },
        error: () => {}
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 2. Display Names Instead of IDs in FormArrays

For fields that store IDs but need to display names (e.g., cast members), add a helper method:

```typescript
// In component:
getPersonName(personId: string): string {
  if (!personId) return '';
  // First try local cache (faster)
  const person = this.people.find(p => p._id === personId);
  if (person?.name) return person.name;
  // Fallback to FK service cache
  return this.fkDataService.getNameById('people', personId, 'name');
}

getCrewRoleName(crewRoleId: string): string {
  if (!crewRoleId) return '';
  const role = this.crewRoles.find(r => r._id === crewRoleId);
  if (role?.name) return role.name;
  return this.fkDataService.getNameById('crewRoles', crewRoleId, 'name');
}
```

### 3. Show Summary Display of Selected Relationships

In the template, display a summary of already-added relationships with readable names:

```html
<!-- Summary of added cast members (shows names, not IDs) -->
<div *ngIf="starcastArray.length > 0" class="alert alert-light border mb-2 p-2">
  <div class="small text-muted"><strong>Added Members:</strong></div>
  <div class="d-flex flex-wrap gap-2 mt-1">
    <span *ngFor="let member of starcastArray.value" class="badge bg-light text-dark">
      <i class="ti ti-movie me-1"></i>
      {{ getPersonName(member.personId) }} 
      <span class="text-muted mx-1">as</span>
      {{ getCrewRoleName(member.crewRoleId) }}
      <span *ngIf="member.characterName" class="text-muted small">({{ member.characterName }})</span>
    </span>
  </div>
</div>

<!-- Dropdown sections with <option> labels showing names -->
<div *ngFor="let member of starcastArray.controls; let i = index" [formArrayName]="'starcast'">
  <div [formGroupName]="i">
    <div class="col-md-4">
      <label class="form-label small">Person <span class="text-danger">*</span></label>
      <select class="form-select form-select-sm" formControlName="personId">
        <option value="">Select Person</option>
        <!-- ALWAYS show name in option text, store ID in value -->
        <option *ngFor="let p of people" [value]="p._id">{{ p.name }}</option>
      </select>
    </div>
    <div class="col-md-4">
      <label class="form-label small">Role <span class="text-danger">*</span></label>
      <select class="form-select form-select-sm" formControlName="crewRoleId">
        <option value="">Select Role</option>
        <option *ngFor="let r of crewRoles" [value]="r._id">{{ r.name }}</option>
      </select>
    </div>
  </div>
</div>
```

### 4. Store IDs in Form Data, Never Names

Always store the ID in the form data on save, never the display name:

```typescript
// ✅ CORRECT - store IDs
const formData = {
  starcast: formValue.starcast.map((m: any) => ({
    personId: m.personId,        // ← ID only
    crewRoleId: m.crewRoleId,    // ← ID only
    characterName: m.characterName
  }))
};

// ❌ WRONG - don't store names
// { personName: "John Doe", crewRoleName: "Actor" } ← NO!
```

### Example: Movies Modal Pattern

The `MoviesCinemaModalComponent` demonstrates this pattern:
- **Dropdowns**: `<option>` tags display person/role names while values hold IDs
- **Summary**: Badges show "Person Name as Role Name" for all added members
- **Storage**: Only IDs stored in `starcast` array
- **Lookup**: `getPersonName()` / `getCrewRoleName()` convert IDs to names on display

See [MoviesCinemaModalComponent](../../../shared/components/movies-cinema-modal/) for full implementation.



The seat layout modal (`SeatLayoutModalComponent`) is `xl` size with a complex nested form:
- `isDefault` toggle — if true, hides the screen dropdown (template layout, not bound to a specific screen)
- When a screen is selected, "Generate Layout" button creates a `FormArray` of rows (A, B, C...) each with a nested `FormArray` of seats
- Row-level `rowSeatType` / `rowPrice` controls propagate their values to all non-aisle seats in that row via `valueChanges`
- Aisle seats are toggled per-cell; marking a seat as aisle clears its `seatTypeCode` and `price`
- On save, `rowSeatType` / `rowPrice` (UI-only controls) are stripped — only clean `rows[]` data is sent to the API

## Adding a New Cinema Management Module

1. Create service in `src/app/shared/services/{name}.service.ts` with `private readonly SLUG = '{plural-kebab}'`
2. Create modal in `src/app/shared/components/{name}-modal/`
3. Create list component in `src/app/demo/cinema-management/{name}/`
4. Add route to `src/app/app-routing.module.ts` under the `cinema` children
5. Add nav item to `src/app/theme/layout/admin/navigation/navigation.ts` under `cinema-section` children
6. Verify the slug matches the backend form manager JSON `"slug"` field exactly
