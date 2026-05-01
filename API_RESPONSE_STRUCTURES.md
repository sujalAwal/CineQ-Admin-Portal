# API Response Structures - Cinema Management Modules

Complete analysis of **actual API response structures** and how each module extracts data.

---

## 📡 Common Response Structure

All form-manager based endpoints return:
```typescript
{
  success: boolean,
  message?: string,
  data: [           // ← Array with ONE object
    {
      "[modelKey]": [...array of actual records...],  // Nested inside!
      // e.g., "people", "theatre", "screen", "movies", etc.
    }
  ],
  page: 1,
  totalPages: 1,
  totalElements: 50,
  size: 20
}
```

**Key Point:** The actual records are **NESTED** inside a model-specific key within `data[0]`.

---

## 🔍 Module-by-Module Extraction Patterns

### 1️⃣ People Module

**API Endpoint:** `GET /v1/list/people`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "people": [
        { "_id": "p1", "name": "John Doe", "image": "...", "description": "..." },
        { "_id": "p2", "name": "Jane Smith", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 50,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadPersonDropdownData(): void {
  if (this.people.length) return; // cache guard
  
  this.peopleService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        // Extract from nested structure
        this.people = response.data.flatMap((item: any) => {
          const records = item.people || item.person || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- Movie Modal → Starcast (people)
- Display field: `.name`
- Store field: `._id`

---

### 2️⃣ CrewRoles Module

**API Endpoint:** `GET /v1/list/crew-roles`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "crew-roles": [
        { "_id": "cr1", "name": "Actor", "slug": "actor" },
        { "_id": "cr2", "name": "Director", "slug": "director" }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 20,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadCrewRolesDropdownData(): void {
  if (this.crewRoles.length) return; // cache guard
  
  this.crewRolesService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        // Try multiple key variations
        this.crewRoles = response.data.flatMap((item: any) => {
          const records = item['crew-roles'] || item['crew_roles'] 
                        || item['crewRoles'] || item['crew-role'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- Movie Modal → Starcast (crewRole)
- Display field: `.name`
- Store field: `._id`

---

### 3️⃣ Theatre Module

**API Endpoint:** `GET /v1/list/theatres`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "theatre": [
        { "_id": "t1", "name": "Cinema City", "city": "Kathmandu", "phone": "..." },
        { "_id": "t2", "name": "Rastra Cinema", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 15,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadTheatreDropdownData(): void {
  if (this.theatres.length) return; // cache guard
  
  this.theatreService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.theatres = response.data.flatMap((item: any) => {
          const records = item['theatre'] || item['theatres'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- Screen Modal → Theatre (theatreId)
- Showtime Modal → Theatre (theatreId)
- Display field: `.name`
- Store field: `._id`

---

### 4️⃣ Screen Module

**API Endpoint:** `GET /v1/list/screens`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "screen": [
        { "_id": "s1", "screenName": "Screen A", "rows": 10, "columns": 15, "theatreId": "t1" },
        { "_id": "s2", "screenName": "Screen B", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 25,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadScreenDropdownData(): void {
  if (this.screens.length) return; // cache guard
  
  this.screenService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.screens = response.data.flatMap((item: any) => {
          const records = item['screen'] || item['screens'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- Showtime Modal → Screen (screenId)
- SeatLayout Modal → Screen (screenId)
- Display field: `.screenName`
- Store field: `._id`

---

### 5️⃣ Movie Module

**API Endpoint:** `GET /v1/list/movies`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "movies": [
        { "_id": "m1", "title": "Inception", "duration": 148, ... },
        { "_id": "m2", "title": "Interstellar", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 30,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadMovieDropdownData(): void {
  if (this.movies.length) return; // cache guard
  
  this.moviesService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.movies = response.data.flatMap((item: any) => {
          const records = item['movies'] || item['movie'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- Showtime Modal → Movie (movieId)
- Display field: `.title`
- Store field: `._id`

---

### 6️⃣ Genre Module (⚠️ DIFFERENT STRUCTURE!)

**API Endpoint:** `GET /genre` (NOT form-manager!)

**Response Structure:** *(Different!)*
```json
{
  "success": true,
  "data": [
    { "_id": "g1", "name": "Action", "description": "..." },
    { "_id": "g2", "name": "Comedy", ... }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 15,
  "size": 20
}
```

**Extraction Code:** *(Direct array, no nesting!)*
```typescript
private loadGenreDropdownData(): void {
  if (this.genres.length) return; // cache guard
  
  this.genreService.getGenres({ page: 1, size: 500, active: true })
    .subscribe({
      next: (response) => {
        // ⚠️ Genre uses direct array (not nested)
        this.genres = response.data || [];
      }
    });
}
```

**Used In Dropdowns:**
- Movie Modal → Genres (multi-select)
- Display field: `.name`
- Store field: `._id`

---

### 7️⃣ SeatType Module

**API Endpoint:** `GET /v1/list/seat-types`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "seat-types": [
        { "_id": "st1", "code": "P", "name": "Premium", "description": "..." },
        { "_id": "st2", "code": "N", "name": "Normal", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 5,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadSeatTypeDropdownData(): void {
  if (this.seatTypes.length) return; // cache guard
  
  this.seatTypeService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.seatTypes = response.data.flatMap((item: any) => {
          const records = item['seat-types'] || item['seat-type'] 
                        || item['seatTypes'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- SeatLayout Modal → Seat Type (per seat in grid)
- Display field: `.code` or `.name`
- Store field: `.code`

---

### 8️⃣ SeatStatus Module

**API Endpoint:** `GET /v1/list/seat-statuses`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "seat-statuses": [
        { "_id": "ss1", "code": 1, "name": "Available", ... },
        { "_id": "ss2", "code": 2, "name": "Booked", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 5,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadSeatStatusDropdownData(): void {
  if (this.seatStatuses.length) return; // cache guard
  
  this.seatStatusService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.seatStatuses = response.data.flatMap((item: any) => {
          const records = item['seat-statuses'] || item['seat-status'] 
                        || item['seatStatuses'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Not Used in Dropdowns** (leaf node - no foreign keys)

---

### 9️⃣ ShowtimeStatus Module

**API Endpoint:** `GET /v1/list/showtime-statuses`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "showtime-statuses": [
        { "_id": "sts1", "code": "AS", "name": "Available Soon", ... },
        { "_id": "sts2", "code": "AA", "name": "Available Actual", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 5,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadShowtimeStatusDropdownData(): void {
  if (this.showtimeStatuses.length) return; // cache guard
  
  this.showtimeStatusService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.showtimeStatuses = response.data.flatMap((item: any) => {
          const records = item['showtime-statuses'] || item['showtime-status'] 
                        || item['showtimeStatuses'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Used In Dropdowns:**
- Showtime Modal → Showtime Status (statusCode)
- Display field: `.name`
- Store field: `.code`

---

### 🔟 Showtime Module

**API Endpoint:** `GET /v1/list/showtimes`

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "showtime": [
        { "_id": "sh1", "movieId": "m1", "screenId": "s1", "showDate": "...", ... },
        { "_id": "sh2", ... }
      ]
    }
  ],
  "page": 1,
  "totalPages": 1,
  "totalElements": 100,
  "size": 20
}
```

**Extraction Code:**
```typescript
private loadShowtimeDropdownData(): void {
  if (this.showtimes.length) return; // cache guard
  
  this.showtimeService.getList({ page: 1, size: 500 })
    .subscribe({
      next: (response) => {
        this.showtimes = response.data.flatMap((item: any) => {
          const records = item['showtime'] || item['showtimes'] || [];
          if (Array.isArray(records)) return records;
          return item.id ? [item] : [];
        });
      }
    });
}
```

**Not Used in Dropdowns** (leaf node - no other modules reference showtime)

---

## 📋 Quick Reference - Nested Keys

| Module | Primary Key | Alternative Keys | Field to Display | Field to Store |
|--------|---|---|---|---|
| people | `people` | `person` | `.name` | `._id` |
| crew-roles | `crew-roles` | `crew_roles`, `crewRoles` | `.name` | `._id` |
| theatre | `theatre` | `theatres` | `.name` | `._id` |
| screen | `screen` | `screens` | `.screenName` | `._id` |
| movies | `movies` | `movie` | `.title` | `._id` |
| **genre** | **direct array** | **N/A** | `.name` | `._id` |
| seat-types | `seat-types` | `seat-type`, `seatTypes` | `.name` or `.code` | `.code` |
| seat-statuses | `seat-statuses` | `seat-status`, `seatStatuses` | `.name` | `.code` |
| showtime-statuses | `showtime-statuses` | `showtime-status`, `showtimeStatuses` | `.name` | `.code` |

---

## ⚠️ Key Gotchas

1. **Genre is Different!** ← No nesting, direct array
2. **Always use flatMap()** ← Unwraps the nested structure
3. **Multiple key variations** ← Try `kebab-case`, `snake_case`, `camelCase`
4. **Display vs Store** ← Show name to user, store ID
5. **Cache guard is crucial** ← Check `array.length > 0` to prevent re-fetching

---

## 🚀 Template Pattern (Always the Same)

```html
<!-- ALWAYS this pattern: show name/title, store ID -->
<select formControlName="fieldNameId">
  <option value="">Select...</option>
  <option *ngFor="let item of dropdownArray" [value]="item._id">
    {{ item.name }}  <!-- or item.title, item.screenName, etc. -->
  </option>
</select>
```

---

## 💾 Form Data on Save (Always the Same)

```typescript
// ALWAYS store ID, NEVER store the name
{
  theatreId: form.get('theatreId').value,  // ← Just the ID
  screenId: form.get('screenId').value,    // ← Just the ID
  movieId: form.get('movieId').value,      // ← Just the ID
  // NOT: theatreName, screenName, movieTitle
}
```
