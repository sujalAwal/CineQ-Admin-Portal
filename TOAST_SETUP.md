# Toast Notification Setup

This project uses ngx-toastr for toast notifications.

## Dependencies
The following packages are automatically installed via `npm install`:
- `ngx-toastr: ^19.1.0`
- `@angular/animations: ^20.0.5`

## Manual Configuration Required

### 1. styles.scss
Add this import to `src/styles.scss`:
```scss
@import 'ngx-toastr/toastr';
```

### 2. main.ts
Add this provider to `src/main.ts`:
```typescript
import { provideToastr } from 'ngx-toastr';

// In providers array:
provideToastr({
  timeOut: 3000,
  positionClass: 'toast-top-right',
  preventDuplicates: true,
  progressBar: true,
  closeButton: true,
  enableHtml: true
})
```

### 3. Toast Service
Copy `src/app/shared/services/toast.service.ts` to your project.

### 4. Usage
```typescript
// In any component:
import { ToastService } from 'path/to/toast.service';

constructor(private toastService: ToastService) {}

someMethod() {
  this.toastService.success('Success message!');
  this.toastService.error('Error message!');
  this.toastService.warning('Warning message!');
  this.toastService.info('Info message!');
}
```

## Configuration Options
You can modify the toast behavior in `main.ts`:
- `timeOut`: Auto-close time (ms)
- `positionClass`: Position on screen
- `preventDuplicates`: Prevent same message multiple times
- `progressBar`: Show progress bar
- `closeButton`: Show close button
- `enableHtml`: Allow HTML in messages