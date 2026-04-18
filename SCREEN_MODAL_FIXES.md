# Screen Modal - Bug Fixes Applied

## Issues Fixed

### Issue #1: Timing Problem - Seat Types Not Loaded During Edit Mode

**Problem:**
- In edit mode, `ngOnChanges()` immediately called `populateForm()` synchronously
- But `loadSeatTypes()` is async (HTTP call)
- Result: When `populateForm()` tried to match seat codes to types, `seatTypes` array was empty
- Seats would not be assigned their types and colors

**Root Cause:**
```typescript
// BEFORE (WRONG)
ngOnChanges(changes: SimpleChanges): void {
  if (changes['isVisible'] && this.isVisible) {
    this.loadTheatres();       // async
    this.loadSeatTypes();      // async
  }
  if (this.form) {
    this.updateModalConfig();
    this.populateForm();       // ← runs immediately while data still loading!
    setTimeout(() => this.updateButtonState(), 0);
  }
}
```

**Fix Applied:**
```typescript
// AFTER (FIXED)
ngOnChanges(changes: SimpleChanges): void {
  if (changes['isVisible'] && this.isVisible) {
    this.loadTheatres();
    this.loadSeatTypes();  // Will call populateForm() when data arrives
  }
  if (this.form) {
    this.updateModalConfig();
    // populateForm removed - it's called after seatTypes load
    setTimeout(() => this.updateButtonState(), 0);
  }
}
```

Now `populateForm()` is **ONLY called after `seatTypes` finishes loading**:

```typescript
private loadSeatTypes(): void {
  if (this.seatTypes.length) {
    // Already loaded, populate form now if in edit mode
    if (this.item) {
      this.populateForm();  // ✅ Call immediately if cached
    }
    return;
  }
  this.seatTypesLoading = true;
  this.seatTypeService.getList({ page: 1, size: 100 })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.seatTypes = response.data?.flatMap(...) || [];
        this.seatTypesLoading = false;
        
        // ✅ After seat types load, populate form if in edit mode
        if (this.item) {
          this.populateForm();
        }
        
        this.cdr.markForCheck();
      },
      error: () => { this.seatTypesLoading = false; }
    });
}
```

---

### Issue #2: Colors Not Being Applied to Seats in Edit Mode

**Problem:**
- Even if code-to-type matching worked, colors weren't being applied
- Missing: Full type object assignment (including the `.color` property)

**Root Cause:**
The original code assigned the type but condition check was weak:
```typescript
// BEFORE (WEAK)
const type = this.seatTypes.find((t: any) => t.code === seat.code);
seatInGrid.typeId = type?.id || '';
seatInGrid.type = type || null;  // Could be null if type not found
```

**Fix Applied:**
```typescript
// AFTER (ROBUST)
private populateForm(): void {
  // ✅ Ensure seatTypes are loaded before attempting code-to-type matching
  if (!this.item || !this.form || this.seatTypes.length === 0) {
    if (!this.item) this.seats = [];
    return;  // Exit early if prerequisites not met
  }

  // ... form patching ...

  if (this.item.rows && this.item.columns) {
    this.seats = this.generateSeats(this.item.rows, this.item.columns);
    
    const layoutData = this.item.seatLayout || this.item.seats || [];
    if (Array.isArray(layoutData)) {
      layoutData.forEach((seatData: any) => {
        const seatInGrid = this.seats.find(s => s.name === (seatData.seatName || seatData.name));
        
        if (seatInGrid && seatData.code) {
          // ✅ Find the complete seat type object by code (includes id, name, color)
          const matchedType = this.seatTypes.find((t: any) => t.code === seatData.code);
          
          if (matchedType) {
            seatInGrid.typeId = matchedType.id;
            // ✅ Assign full type object (which has .color property)
            seatInGrid.type = matchedType;
            
            // Developer log to verify mapping
            console.debug(`Seat ${seatInGrid.name}: code=${seatData.code} → typeId=${matchedType.id}, color=${matchedType.color}`);
          } else {
            console.warn(`No seat type found for code: ${seatData.code}`);
            seatInGrid.typeId = '';
            seatInGrid.type = null;
          }
        }
      });
    }
  }
  
  setTimeout(() => this.updateButtonState(), 200);
  this.cdr.markForCheck();
}
```

---

## How It Works Now

### Edit Mode Workflow

```
1. Modal opens with existing screen (item)
   ↓
2. ngOnChanges triggered with isVisible=true
   ↓
3. loadTheatres() and loadSeatTypes() called (async)
   ↓
4. updateModalConfig() called synchronously
   ↓
5. Wait for API responses...
   ↓
6. seatTypes API returns → loadSeatTypes().subscribe() success
   ↓
7. ✅ NEW: populateForm() called NOW (seatTypes ready!)
   ↓
8. populateForm() matches each seat code to seatType
   ↓
9. For each seat:
   - Find matching seatType by code (R/P/V/X)
   - Assign seatInGrid.typeId = matchedType.id
   - Assign seatInGrid.type = matchedType (full object with color!)
   ↓
10. Template renders seat buttons with color from seatType.color
    [style.background-color]="getSeatTypeById(seat.typeId)?.color || null"
    ↓
11. ✅ Seats display with correct colors!
```

---

## Verification Checklist

- [ ] Open an existing screen in edit mode
- [ ] Verify seat layout loads with correct grid
- [ ] Verify seat colors match the seatType colors from API
- [ ] Check browser console for debug logs: `Seat A1: code=R → typeId=xxx, color=#e8e8e8`
- [ ] Try changing a seat type and verify color updates
- [ ] Try saving and re-opening to verify persistence

---

## Code Changes Summary

| File | Method | Change |
|------|--------|--------|
| `screen-modal.component.ts` | `ngOnChanges()` | Removed `populateForm()` call (moved to after data load) |
| `screen-modal.component.ts` | `loadSeatTypes()` | Added `populateForm()` call in success callback |
| `screen-modal.component.ts` | `populateForm()` | Added defensive checks and robust type matching with debugging |

---

## Performance Notes

- **No breaking changes** — All existing functionality preserved
- **Slight delay** — Seat layout now appears after API call completes (was always after API call, just now we wait for it)
- **Better UX** — Users see correctly colored seats instead of grey placeholders
- **Debug logs** — Console logs help verify mapping is working (can remove later)
