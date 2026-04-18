# Screen Modal Component - Deep Analysis

## Overview

The `ScreenModalComponent` is a comprehensive Angular form modal for creating and editing cinema screens with a **dynamic seat layout grid**. It allows:
- Configuration of screen details (name, theatre, type, sound system, break time)
- Interactive generation and management of seat layouts (rows × columns)
- Per-seat type assignment with visual color coding
- Bulk operations for entire rows/columns
- Form validation and submission

---

## 1. Component Architecture

### Inputs/Outputs
```typescript
@Input() isVisible: boolean        // Show/hide modal
@Input() item: any                 // Null = create mode, object = edit mode
@Input() isLoading: boolean        // API loading state

@Output() closed                   // Fired when modal closes
@Output() itemSaved                // Fired when save succeeds with response
```

### Key Services
- `ScreenService` — API calls for screen operations
- `TheatreService` — Fetches theatre list for dropdown
- `SeatTypeService` — Fetches available seat types (Regular, Premium, VIP, Disabled)
- `ToastrService` — Toast notifications (ngx-toastr)
- `ChangeDetectorRef` — Manual change detection (OnPush strategy)

---

## 2. Component Lifecycle

### Initialization (`ngOnInit`)
1. **Initialize form** with blank fields and validators
2. **Set up global click handler** to close dropdowns on outside clicks
3. Reactive form value change subscriptions trigger seat layout regeneration

### On Visibility Change (`ngOnChanges`)
1. Trigger lazy-load of theatres and seat types (cached after first fetch)
2. Update modal title/buttons based on create vs. edit mode
3. **Populate form** with existing data if editing

### On Form Control Changes
- **Rows or Columns change** → Regenerate seat layout automatically
- **Any field change** → Update button enabled/disabled state

---

## 3. Seat Layout Generation & Management

### Seat Object Structure
```typescript
{
  row: number,           // 0-based row index
  col: number,           // 0-based column index
  name: string,          // "A1", "B5", "AA10", etc.
  typeId: string,        // ID of selected seat type (or empty)
  type: any              // Full seat type object { id, code, name, color }
}
```

### How Seats Are Generated

**Entry Point:** `regenerateSeatLayout()` (triggered when rows/columns form fields change)

```typescript
private regenerateSeatLayout(): void {
  const rows = this.form.get('rows')?.value;
  const columns = this.form.get('columns')?.value;
  if (rows && columns) {
    this.seats = this.generateSeats(rows, columns);  // ← Creates all seat objects
    this.cdr.markForCheck();
  }
}
```

### Seat Naming Algorithm: `getRowLabel(rowIndex)`
Converts row indices to letter labels:
- Rows 0-25 → A, B, C, ..., Z
- Rows 26-51 → AA, AB, AC, ..., AZ
- Rows 52-77 → BA, BB, BC, ..., BZ
- etc.

**Example:** For 3 rows × 4 columns:
```
A1, A2, A3, A4
B1, B2, B3, B4
C1, C2, C3, C4
```

### Grid Grouping for Display: `getGroupedSeats()`
Groups all seats by row for efficient rendering:
```typescript
[
  { row: "A", seats: [seatA1, seatA2, ...] },
  { row: "B", seats: [seatB1, seatB2, ...] },
  ...
]
```

---

## 4. Seat Color & Type Handling

### Seat Types
Fetched from backend via `SeatTypeService.getList()`. Expected structure:
```typescript
{
  id: string,
  code: string,      // 'R' (Regular), 'P' (Premium), 'V' (VIP), 'X' (Disabled)
  name: string,      // "Regular", "Premium", "VIP", "Disabled"
  color: string      // Hex color from backend (e.g., "#e8e8e8")
}
```

### Color Assignment Logic: `getSeatTypeColors(typeId)`

**Two-tier fallback system:**

1. **If API provides `color` field** → Use it directly (dynamic, from backend)
2. **If no API color** → Use hardcoded fallback based on `code`:
   - `R` (Regular) → `#e8e8e8` (light gray)
   - `P` (Premium) → `#d1e7f7` (light blue)
   - `V` (VIP) → `#fff3cd` (light yellow)
   - `X` (Disabled) → `#495057` (dark gray)

### Visual Application in Template

**Inline styles on seat buttons:**
```html
<button class="seat-button"
        [style.background-color]="getSeatTypeById(seat.typeId)?.color || null"
        [style.border-color]="getSeatTypeById(seat.typeId)?.color || null">
  {{ seat.name }}
</button>
```

**CSS Classes for fallback styling:**
```scss
&.seat-R { background: #e8e8e8; color: #495057; border-color: #bbb; }
&.seat-P { background: #d1e7f7; color: #0056b3; border-color: #80b0d5; }
&.seat-V { background: #fff3cd; color: #856404; border-color: #ffc107; }
&.seat-X { background: #495057; color: #fff; border-color: #343a40; }
```

---

## 5. Individual Seat Handling

### Seat Button Interaction
1. **Click on seat** → Opens a floating dropdown menu
2. **Select seat type** → Updates `seat.typeId` and `seat.type`
3. **Visual feedback** → Seat button color updates immediately

### Key Methods

#### `openStatusMenuAt(event, 'seat', seatName, label)`
- Positioned dropdown relative to `.seat-layout-wrapper`
- Displays all available seat types
- Sets `this.openSeatStatusMenu = seatName` to track which menu is open

#### `changeSingleSeatStatus(seat, typeId)`
```typescript
seat.typeId = typeId;
seat.type = this.getSeatTypeById(typeId);
this.openSeatStatusMenu = null;
this.cdr.markForCheck();  // Force Angular to detect change
```

#### `getUnassignedSeatsCount()`
Counts seats where `typeId` is empty (for validation).

---

## 6. Row & Column Selection (Bulk Operations)

### Selection State
```typescript
selectedRowsForBulkEdit: number[] = [];      // Array of selected row indices
selectedColumnsForBulkEdit: number[] = [];   // Array of selected column indices
```

### How Row/Column Selection Works

#### Row Selection: `toggleRowSelection(rowIndex)`
1. Click row label → Toggle row index in `selectedRowsForBulkEdit` array
2. Visual feedback: Row highlighted with `row-selected` class
3. **Kebab menu (⋮) appears** only on selected rows
4. Click menu → `openStatusMenuAt($event, 'row', rowIndex, label)`

#### Column Selection: `toggleColumnSelection(colIndex)`
1. Click column header number → Toggle column index in `selectedColumnsForBulkEdit` array
2. Visual feedback: Column number highlighted with `col-selected` class
3. **Kebab menu (⋮) appears** only on selected columns
4. Click menu → `openStatusMenuAt($event, 'col', colIndex, label)`

### Bulk Type Assignment

#### For Selected Rows: `changeAllSelectedRowsStatus(typeId)`
```typescript
this.selectedRowsForBulkEdit.forEach(rowIndex => {
  this.seats.forEach(seat => {
    if (seat.row === rowIndex) {
      seat.typeId = typeId;
      seat.type = type;
    }
  });
});
this.selectedRowsForBulkEdit = [];  // Clear selection
```

#### For Selected Columns: `changeAllSelectedColumnsStatus(typeId)`
```typescript
this.selectedColumnsForBulkEdit.forEach(colIndex => {
  this.seats.forEach(seat => {
    if (seat.col === colIndex) {
      seat.typeId = typeId;
      seat.type = type;
    }
  });
});
this.selectedColumnsForBulkEdit = [];  // Clear selection
```

---

## 7. Quick Fill Operations

### Whole-Screen Fill Buttons
Displayed in the UI above the seat grid:

```typescript
fillAllSeatsWithType(typeId: string): void {
  const type = this.getSeatTypeById(typeId);
  this.seats.forEach(seat => {
    seat.typeId = typeId;
    seat.type = type;
  });
  this.cdr.markForCheck();
}
```

### Shortcuts (if needed)
- `fillAllRegular()` — Fill all seats with Regular type (code 'R')
- `fillAllPremium()` — Fill all seats with Premium type (code 'P')
- `fillAllVIP()` — Fill all seats with VIP type (code 'V')
- `clearAllSeats()` — Reset all seats to unassigned

---

## 8. Dropdown Menu System

### Unified Floating Dropdown
A single `.status-dropdown` used for **seat, row, and column** menus.

### Positioning Logic: `openStatusMenuAt(event, menuType, id, label)`
```typescript
// Get button and wrapper positions
const buttonRect = button.getBoundingClientRect();
const wrapperRect = wrapper.getBoundingClientRect();

// Position relative to wrapper (avoids scroll clipping)
this.dropdownPosition = {
  top: buttonRect.bottom - wrapperRect.top + 2,
  left: buttonRect.right - wrapperRect.left + 4
};
```

### Dropdown State
- `showRowStatusMenu: number | null` — Row index when row menu is open
- `showColumnStatusMenu: number | null` — Column index when column menu is open
- `openSeatStatusMenu: string | null` — Seat name when seat menu is open

### Menu Close Events
1. **Outside click** → Global document click handler closes all menus
2. **Item selected** → Menu closes after `onDropdownItemClick(typeId)`
3. **Toggle same menu** → Closes if already open

---

## 9. Form Validation & Submission

### Form Structure
```typescript
{
  screenName: ['', [required, minLength(2), maxLength(100)]],
  theatreId: ['', [required]],
  rows: ['', [required, min(1), max(50)]],
  columns: ['', [required, min(1), max(50)]],
  screenType: ['', [required]],
  soundSystem: ['', [minLength(2), maxLength(50)]],
  breakTime: [10, [required, min(0), max(60)]],
  isActive: [true, [required]]
}
```

### Validation Layers

#### Layer 1: Form-Level Validation (`isFieldInvalid()`)
Checks individual field state:
```typescript
isFieldInvalid(fieldName: string): boolean {
  const field = this.form.get(fieldName);
  return !!(field && field.invalid && (field.dirty || field.touched));
}
```

#### Layer 2: Seat Layout Validation (in `onModalSave()`)
```typescript
if (this.seats.length === 0) {
  throw error("Please generate seat layout");
}

const unassignedSeats = this.seats.filter(s => !s.typeId);
if (unassignedSeats.length > 0) {
  throw error(`Please select seat type for all ${unassignedSeats.length} seat(s)`);
}
```

### Button State Management
```typescript
private updateButtonState(): void {
  this.modalConfig.primaryButtonDisabled = this.form.invalid || this.isLoading;
}
```

---

## 10. Save Payload Structure

### Sent to Backend
```typescript
{
  stepSlug: 'v1',
  action: 'CREATE' | 'UPDATE',
  id: string,                    // Only on UPDATE
  formData: {
    id: string,                  // Only on UPDATE
    screenName: string,
    theatreId: string,
    rows: number,
    columns: number,
    screenType: string,
    soundSystem: string,
    breakTime: number,
    seatLayout: [                // ← The critical array
      {
        seatName: "A1",          // Display name
        row: "A",                // Row letter (A, B, AA, etc.)
        col: 1,                  // 1-based column number
        code: "R"                // Seat type code (R/P/V/X)
      },
      ...
    ],
    isActive: boolean
  }
}
```

---

## 11. Editing Existing Screens

### Data Loading: `populateForm()`
When modal opens with `item` provided:

1. **Populate form fields** from existing screen
2. **Regenerate seat layout** with existing row/column counts
3. **Match existing seat types** by comparing seat codes:
   ```typescript
   const layoutData = this.item.seatLayout || [];
   layoutData.forEach((seat) => {
     const seatInGrid = this.seats.find(s => s.name === seat.seatName);
     if (seatInGrid && seat.code) {
       const type = this.seatTypes.find(t => t.code === seat.code);
       seatInGrid.typeId = type?.id;
       seatInGrid.type = type;
     }
   });
   ```

---

## 12. Styling & UI Layout

### Grid Structure
```
┌─────────────────────────────────┐
│ Column Header (sticky top)      │  ← Column numbers (clickable)
├──────────┬──────────────────────┤
│ Row Label │ Seat Grid           │  ← Scrollable container
│ (sticky)  │ (40px × 40px seats) │
│           │                      │
└──────────┴──────────────────────┘
```

### Container Scrolling
- `.seats-grid-container` → Max height 450px, scrollable
- **Sticky column header** → Stays at top during scroll
- **Sticky row labels** → Stay at left during scroll
- **Floating dropdown menu** → Positioned outside scroll area (avoids clipping)

### Seat Button Styling

**At rest:**
```scss
width: 40px; height: 40px;
border: 2px solid #dee2e6;
border-radius: 4px;
font-size: 11px; font-weight: 600;
```

**On hover:**
```scss
transform: scale(1.1);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
```

### Responsive Indicators
- **Screen bar** above grid (visual center marker)
- **Legend** showing all seat types with color patches
- **Status alert** showing unassigned seat count and progress
- **Quick fill buttons** for each seat type color

---

## 13. Edge Cases & Defensive Programming

### Null/Empty Safety
```typescript
// Flatten nested API responses
this.theatres = response.data?.flatMap((item: any) => {
  const records = item['theatre'] || item['theatres'] || [];
  if (Array.isArray(records)) return records;
  return item.id ? [item] : [];
}) || [];
```

### Unsubscribe Pattern
```typescript
private destroy$ = new Subject<void>();

// On load:
this.service.subscribe(takeUntil(this.destroy$));

// On destroy:
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### Type Safety
- Checks `type?.id` before accessing properties
- Fallback to empty string if seat type not found
- `getSeatTypeById()` validates ID exists before assignment

---

## 14. Key Behaviors Summary

| Interaction | Result |
|---|---|
| **Change rows/columns** | Seat layout regenerates automatically |
| **Click seat** | Floating dropdown shows all seat types |
| **Select seat type** | Seat color updates, counter decrements |
| **Click row label** | Toggle row selection, show kebab menu |
| **Click column header** | Toggle column selection, show kebab menu |
| **Click row/column kebab** | Apply type to all seats in row/column, clear selection |
| **Quick fill button** | All seats become that type instantly |
| **Click "Clear All"** | All seats become unassigned (empty typeId) |
| **Form invalid or unassigned seats exist** | Save button disabled, toast error shown |

---

## 15. Performance Considerations

### Change Detection Strategy
- `ChangeDetectionStrategy.OnPush` — Only check on input changes or explicit `cdr.markForCheck()`
- Called after every user interaction (dropdown, selection, type change)

### Caching
- Theatres and seat types loaded once and cached:
  ```typescript
  if (this.theatres.length) return;  // Skip if already loaded
  ```

### TrackBy Function
```typescript
trackByFn(index: number): number {
  return index;  // Helps Angular track seat objects in *ngFor
}
```

---

## 16. Visual Tour

```
╔════════════════════════════════════════════╗
║          Add Screen Modal                  ║
╠════════════════════════════════════════════╣
║ Screen Name: [________________]            ║
║ Theatre:     [________________]            ║
║ Rows: [__]  Columns: [__]                  ║
║ ... other fields ...                       ║
╟────────────────────────────────────────────╢
║ Seat Layout                                ║
║                                            ║
║ Legend:                                    ║
║  [■] Regular  [■] Premium  [■] VIP        ║
║                                            ║
║ Status: ✓ All seats assigned!              ║
║                                            ║
║ Quick fill: [All Regular] [All Premium]    ║
║             [All VIP] [Clear All]          ║
║                                            ║
║            ┌─────────────────────────┐    ║
║            │  SCREEN                 │    ║
║            ├─────────────────────────┤    ║
║        1 2 3 4 5 6                        ║
║ A [A1][A2][A3][A4][A5][A6]             ║
║ B [B1][B2][B3][B4][B5][B6] ⋮           ║
║ C [C1][C2][C3][C4][C5][C6]             ║
║            └─────────────────────────┘    ║
║                                            ║
╠════════════════════════════════════════════╣
║ [Cancel]  [Create Screen]                  ║
╚════════════════════════════════════════════╝
```

---

## Conclusion

This is a **highly sophisticated interactive seat layout builder** that:
1. ✅ Dynamically generates grid layouts with Excel-like row/column naming
2. ✅ Assigns seat types with visual color coding (API-driven colors with fallbacks)
3. ✅ Supports individual, row, and column bulk assignments
4. ✅ Validates all seats are assigned before save
5. ✅ Handles both create and edit scenarios seamlessly
6. ✅ Uses modern Angular patterns (standalone, reactive forms, OnPush change detection)
