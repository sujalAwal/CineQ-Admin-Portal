# Cinema Management - Module Relationships Mapping

Complete analysis of all cinema-management modules and their dropdown dependencies.

---

## 🎯 Quick Summary

| Module | Total Dropdowns | Dynamic FK | Static | Needs Updates |
|--------|---|---|---|---|
| **People** | 0 | - | - | ✅ None |
| **CrewRoles** | 0 | - | - | ✅ None |
| **Theatre** | 0 | - | - | ✅ None |
| **SeatType** | 0 | - | - | ✅ None |
| **SeatStatus** | 0 | - | - | ✅ None |
| **ShowtimeStatus** | 0 | - | - | ✅ None |
| **Screen** | 1 | 1 | 0 | ⚠️ theatreId |
| **Movie** | 8 | 3 | 5 | ⚠️ genres, people, crewRoles |
| **Showtime** | 7 | 4 | 3 | ⚠️ movieId, theatreId, screenId, statusCode |
| **SeatLayout** | 2 | 2 | 0 | ⚠️ screenId, seatTypeCode |

---

## 📋 Detailed Module Analysis

### ✅ Simple Modules (No Dropdowns/Relationships)

#### 1. People Modal
- **Form Fields:** name, image, description, isActive
- **Dropdowns:** None
- **Status:** Ready as-is ✅

#### 2. CrewRoles Modal
- **Form Fields:** name, slug, description, isActive
- **Dropdowns:** None
- **Status:** Ready as-is ✅

#### 3. Theatre Modal
- **Form Fields:** name, email, phone, chain, address, city, state, pincode, latitude, longitude, isActive
- **Dropdowns:** None
- **Status:** Ready as-is ✅

#### 4. SeatType Modal
- **Form Fields:** code, name, description, isActive
- **Dropdowns:** None
- **Status:** Ready as-is ✅

#### 5. SeatStatus Modal
- **Form Fields:** code, name, description, isActive
- **Dropdowns:** None
- **Status:** Ready as-is ✅

#### 6. ShowtimeStatus Modal
- **Form Fields:** code, name, description, isActive
- **Dropdowns:** None
- **Status:** Ready as-is ✅

---

### ⚠️ Modules with Foreign Key Relationships

#### 7. Screen Modal

**Dropdown Dependencies:**
| Field | Type | Linked Module | Service | API Call |
|-------|------|---|---|---|
| **theatreId** | DYNAMIC (single select) | Theatre | TheatreService | `getList({ page: 1, size: 500 })` |

**Implementation:**
```typescript
// In screen-modal.component.ts
theatres: any[] = [];
theatresLoading = false;

private loadDropdownData(): void {
  if (this.theatres.length) return; // cache guard
  this.theatresLoading = true;
  
  this.theatreService.getList({ page: 1, size: 500 }).subscribe({
    next: (response) => {
      // Response structure: { success, data: [...theatres] }
      this.theatres = response.data || [];
      this.theatresLoading = false;
      this.cdr.markForCheck();
    },
    error: () => {
      this.theatresLoading = false;
    }
  });
}

// In template:
<select formControlName="theatreId">
  <option value="">Select Theatre</option>
  <option *ngFor="let t of theatres" [value]="t._id">{{ t.name }}</option>
</select>

// On save - store only ID:
{ theatreId: selectedTheatre._id } // NOT the name
```

---

#### 8. Movie Modal

**Dropdown Dependencies:**
| Field | Type | Linked Module | Service | API Call | Data Field |
|-------|------|---|---|---|---|
| **genres** | DYNAMIC (multi-select checkboxes) | Genre | GenreService | `getGenres({ page: 1, size: 500, active: true })` | genre._id → genre.name |
| **people** (starcast) | DYNAMIC (FormArray multi-select) | People | PeopleService | `getList({ page: 1, size: 500 })` | person._id → person.name |
| **crewRoles** (starcast) | DYNAMIC (FormArray multi-select) | CrewRoles | CrewRolesService | `getList({ page: 1, size: 500 })` | role._id → role.name |
| language | STATIC (checkboxes) | N/A | N/A | N/A | ['ENG', 'HIN', 'NEP', 'MAL', 'MARA'] |
| formats | STATIC (checkboxes) | N/A | N/A | N/A | ['2D', '3D', 'IMAX', '4DX'] |
| certification | STATIC (select) | N/A | N/A | N/A | ['U', 'UA', 'A', 'R'] |
| status | STATIC (select) | N/A | N/A | N/A | ['coming_soon', 'now_showing', 'ended'] |

**Implementation Pattern:**
```typescript
// Load dropdown data
private loadDropdownData(): void {
  if (this.genres.length && this.people.length && this.crewRoles.length) return;
  
  this.loadingDropdowns = true;
  let pending = 3;
  const done = () => { if (--pending === 0) this.loadingDropdowns = false; };

  // Load genres
  this.genreService.getGenres({ page: 1, size: 500, active: true }).subscribe({
    next: (r) => { this.genres = r.data || []; done(); },
    error: () => done()
  });

  // Load people
  this.peopleService.getList({ page: 1, size: 500 }).subscribe({
    next: (r) => { this.people = r.data || []; done(); },
    error: () => done()
  });

  // Load crew roles
  this.crewRolesService.getList({ page: 1, size: 500 }).subscribe({
    next: (r) => { this.crewRoles = r.data || []; done(); },
    error: () => done()
  });
}

// Display name from ID (for edit mode or summary display)
getPersonName(personId: string): string {
  if (!personId) return '';
  const person = this.people.find(p => p._id === personId);
  return person?.name || '';
}

getCrewRoleName(crewRoleId: string): string {
  if (!crewRoleId) return '';
  const role = this.crewRoles.find(r => r._id === crewRoleId);
  return role?.name || '';
}

// On save - store ONLY IDs:
{
  genres: selectedGenreIds,  // e.g., ['g1', 'g2']
  starcast: [
    { 
      personId: 'p123',       // NOT person.name
      crewRoleId: 'r456',     // NOT role.name
      characterName: 'Batman'
    }
  ]
}
```

**Template Pattern:**
```html
<!-- Genre selection - show names, store IDs -->
<div *ngFor="let genre of genres" class="form-check">
  <input type="checkbox" [value]="genre._id" (change)="toggleGenre(genre._id)">
  <label>{{ genre.name }}</label>  <!-- Display name -->
</div>

<!-- Cast selection - FormArray dropdowns show names, store IDs -->
<select formControlName="personId">
  <option value="">Select Person</option>
  <option *ngFor="let p of people" [value]="p._id">{{ p.name }}</option>
</select>

<select formControlName="crewRoleId">
  <option value="">Select Role</option>
  <option *ngFor="let r of crewRoles" [value]="r._id">{{ r.name }}</option>
</select>

<!-- Summary - show readable names -->
<span *ngFor="let member of starcastArray.value">
  {{ getPersonName(member.personId) }} as {{ getCrewRoleName(member.crewRoleId) }}
</span>
```

---

#### 9. Showtime Modal

**Dropdown Dependencies:**
| Field | Type | Linked Module | Service | API Call |
|---|---|---|---|---|
| **movieId** | DYNAMIC (single select dropdown) | Movie | MoviesCinemaService | `getList({ page: 1, size: 500 })` |
| **theatreId** | DYNAMIC (single select dropdown) | Theatre | TheatreService | `getList({ page: 1, size: 500 })` |
| **screenId** | DYNAMIC (single select dropdown) | Screen | ScreenService | `getList({ page: 1, size: 500 })` |
| **statusCode** | DYNAMIC (single select dropdown) | ShowtimeStatus | ShowtimeStatusService | `getList({ page: 1, size: 500 })` |
| language | STATIC (select) | N/A | N/A | ['ENG', 'HIN', 'NEP', 'MAL', 'MARA'] |
| format | STATIC (select) | N/A | N/A | ['2D', '3D', 'IMAX', '4DX'] |

**Implementation:**
```typescript
// Load all four dynamic dropdowns
private loadDropdownData(): void {
  if (this.movies.length && this.theatres.length && 
      this.screens.length && this.showtimeStatuses.length) return;
  
  this.loadingDropdowns = true;
  let pending = 4;
  const done = () => { if (--pending === 0) this.loadingDropdowns = false; };

  this.moviesService.getList({ page: 1, size: 500 }).subscribe({
    next: (r) => { this.movies = r.data || []; done(); },
    error: () => done()
  });

  this.theatreService.getList({ page: 1, size: 500 }).subscribe({
    next: (r) => { this.theatres = r.data || []; done(); },
    error: () => done()
  });

  this.screenService.getList({ page: 1, size: 500 }).subscribe({
    next: (r) => { this.screens = r.data || []; done(); },
    error: () => done()
  });

  this.showtimeStatusService.getList({ page: 1, size: 500 }).subscribe({
    next: (r) => { this.showtimeStatuses = r.data || []; done(); },
    error: () => done()
  });
}

// On save - store only IDs:
{
  movieId: selectedMovie._id,        // NOT title
  theatreId: selectedTheatre._id,    // NOT name
  screenId: selectedScreen._id,      // NOT screenName
  statusCode: selectedStatus.code,   // NOT name
  showDate: dateValue,
  showTime: timeValue,
  language: selectedLanguage,
  format: selectedFormat
}
```

**Template:**
```html
<select formControlName="movieId">
  <option value="">{{ loadingDropdowns ? 'Loading...' : 'Select Movie' }}</option>
  <option *ngFor="let m of movies" [value]="m._id">{{ m.title }}</option>
</select>

<select formControlName="theatreId">
  <option value="">{{ loadingDropdowns ? 'Loading...' : 'Select Theatre' }}</option>
  <option *ngFor="let t of theatres" [value]="t._id">{{ t.name }}</option>
</select>

<select formControlName="screenId">
  <option value="">{{ loadingDropdowns ? 'Loading...' : 'Select Screen' }}</option>
  <option *ngFor="let s of screens" [value]="s._id">{{ s.screenName }}</option>
</select>

<select formControlName="statusCode">
  <option value="">{{ loadingDropdowns ? 'Loading...' : 'Select Status' }}</option>
  <option *ngFor="let st of showtimeStatuses" [value]="st.code">
    {{ st.name }} ({{ st.code }})
  </option>
</select>
```

---

#### 10. SeatLayout Modal

**Dropdown Dependencies:**
| Field | Type | Linked Module | Service | API Call | Context |
|---|---|---|---|---|---|
| **screenId** | DYNAMIC (single select dropdown) | Screen | ScreenService | `getList({ page: 1, size: 200 })` | Main form - required unless isDefault=true |
| **seatTypeCode** (per seat in grid) | DYNAMIC (select per row) | SeatType | SeatTypeService | `getList({ page: 1, size: 100 })` | FormArray - multi-select for each seat |

**Implementation:**
```typescript
screens: any[] = [];
seatTypes: any[] = [];
loadingDropdowns = false;

private loadDropdownData(): void {
  if (this.screens.length && this.seatTypes.length) return;
  
  this.loadingDropdowns = true;
  let pending = 2;
  const done = () => { if (--pending === 0) this.loadingDropdowns = false; };

  this.screenService.getList({ page: 1, size: 200 }).subscribe({
    next: (r) => { this.screens = r.data || []; done(); },
    error: () => done()
  });

  this.seatTypeService.getList({ page: 1, size: 100 }).subscribe({
    next: (r) => { this.seatTypes = r.data || []; done(); },
    error: () => done()
  });
}

// On save - store only IDs/codes:
{
  name: layoutName,
  isDefault: false,
  screenId: selectedScreen._id,  // NOT screenName
  rows: [
    {
      rowLabel: 'A',
      seats: [
        {
          seatCode: 'A1',
          seatTypeCode: 'P',    // NOT seat type name
          price: 150,
          isActive: true
        }
      ]
    }
  ]
}
```

**Template:**
```html
<!-- Screen selector -->
<select formControlName="screenId">
  <option value="">{{ loadingDropdowns ? 'Loading...' : 'Select Screen' }}</option>
  <option *ngFor="let s of screens" [value]="s._id">
    {{ s.screenName }} ({{ s.rows }}×{{ s.columns }})
  </option>
</select>

<!-- Seat type selector per seat -->
<select formControlName="seatTypeCode">
  <option value="">Type</option>
  <option *ngFor="let st of seatTypes" [value]="st.code">
    {{ st.code }}
  </option>
</select>
```

---

## 🔄 Module Cross-References

```
People
  ↑
  └─ Movie (starcast: personId)
  └─ (No other modules reference People)

CrewRoles
  ↑
  └─ Movie (starcast: crewRoleId)
  └─ (No other modules reference CrewRoles)

Theatre
  ↑
  ├─ Screen (theatreId)
  ├─ Showtime (theatreId)
  └─ (No other modules reference Theatre)

Screen
  ↑
  ├─ SeatLayout (screenId)
  ├─ Showtime (screenId)
  └─ (References Theatre)

SeatType
  ↑
  └─ SeatLayout (seatTypeCode in grid)
  └─ (No other modules reference SeatType)

Movie
  ↑
  ├─ Showtime (movieId)
  ├─ (References Genres)
  ├─ (References People)
  └─ (References CrewRoles)

Showtime
  ↑
  ├─ (References Movie)
  ├─ (References Theatre)
  ├─ (References Screen)
  └─ (References ShowtimeStatus)

Genre, SeatStatus, ShowtimeStatus
  └─ (Leaf nodes - no references from other modules)
```

---

## ✅ Implementation Checklist

- [ ] **Screen Modal** - Add theatre dropdown with API call
- [ ] **Movie Modal** - Ensure genres, people, crewRoles load from API
- [ ] **Showtime Modal** - Add all 4 dynamic dropdowns (movie, theatre, screen, status)
- [ ] **SeatLayout Modal** - Verify screen and seatType dropdowns load correctly

---

## 📝 General Pattern for All Dropdowns

```typescript
// STEP 1: Declare array and loading state
myRelatedEntities: any[] = [];
loadingDropdowns = false;

// STEP 2: Load in ngOnChanges
ngOnChanges(changes: SimpleChanges): void {
  if (changes['isVisible']?.currentValue === true) {
    this.loadDropdownData();
  }
}

// STEP 3: Implement loadDropdownData()
private loadDropdownData(): void {
  if (this.myRelatedEntities.length) return; // ← CACHE GUARD
  this.loadingDropdowns = true;

  // Call the existing service method
  this.myService.getList({ page: 1, size: 500 })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        // Use the SAME response structure as the listing page
        this.myRelatedEntities = response.data || [];
        this.loadingDropdowns = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDropdowns = false;
      }
    });
}

// STEP 4: In template - show names, store IDs
<option *ngFor="let item of myRelatedEntities" [value]="item._id">
  {{ item.name }}
</option>

// STEP 5: On save - store ONLY IDs
const formData = {
  fieldId: selectedItem._id,  // ← ID only
  // NOT: fieldName: selectedItem.name
};
```

---

## 🚀 Priority Order

1. **Screen Modal** (1 dropdown - simplest)
2. **Showtime Modal** (4 dropdowns - medium complexity)
3. **SeatLayout Modal** (2 dropdowns - medium complexity)
4. **Movie Modal** (3 dynamic dropdowns - already partially done)
