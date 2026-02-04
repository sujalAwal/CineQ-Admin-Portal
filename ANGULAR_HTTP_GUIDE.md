# Angular HTTP & API Guide (Continuation)

## 8. HTTP Requests & API Integration

### Laravel HTTP Client:
```php
// Laravel Controller
use Illuminate\Support\Facades\Http;

class ApiController extends Controller {
    public function fetchUsers() {
        // External API call
        $response = Http::get('https://api.example.com/users');
        $users = $response->json();
        
        return view('users.index', compact('users'));
    }
    
    public function createUser(Request $request) {
        $response = Http::post('https://api.example.com/users', [
            'name' => $request->name,
            'email' => $request->email
        ]);
        
        if ($response->successful()) {
            return redirect()->back()->with('success', 'User created');
        }
        
        return redirect()->back()->with('error', 'Failed to create user');
    }
}
```

### Angular HTTP Client:
```typescript
// Angular Service
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://api.example.com';
  
  constructor(private http: HttpClient) {}
  
  // GET request (like Laravel Http::get())
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`)
      .pipe(
        catchError(this.handleError)
      );
  }
  
  // POST request (like Laravel Http::post())
  createUser(userData: any): Observable<User> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
    
    return this.http.post<User>(`${this.baseUrl}/users`, userData, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }
  
  // Error handling (like Laravel try-catch)
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized access';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 500:
          errorMessage = 'Server error';
          break;
        default:
          errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    return throwError(errorMessage);
  }
  
  private getToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
}
```

## 9. Quick Reference: Laravel vs Angular

| Task | Laravel | Angular |
|------|---------|---------|
| **Routing** | `routes/web.php` | `app-routing.module.ts` |
| **Controllers** | `app/Http/Controllers/` | `*.component.ts` |
| **Views** | `resources/views/*.blade.php` | `*.component.html` |
| **Models** | `app/Models/` | `services/*.service.ts` |
| **Middleware** | `app/Http/Middleware/` | `guards/*.guard.ts` |
| **Validation** | `$request->validate()` | `FormGroup` + `Validators` |
| **Database** | Eloquent ORM | HTTP Client + Services |
| **Sessions** | `session()` | `localStorage` / Services |
| **Redirects** | `redirect()` | `router.navigate()` |
| **Loops** | `@foreach` | `@for` or `*ngFor` |
| **Conditionals** | `@if` | `@if` or `*ngIf` |
| **Variables** | `{{ $variable }}` | `{{ variable }}` |

## 10. Getting Started with Your Project

1. **Explore the routing**: Check `app-routing.module.ts`
2. **Look at components**: Start with `demo/dashboard/default/`
3. **Understand data flow**: See how `ListGroup` data flows from component to template
4. **Practice**: Try modifying the dashboard data and see changes
5. **Create new**: Try creating a simple component following the existing patterns

Your CineQ Dashboard project is well-structured and follows Angular best practices. Use this guide as a reference while exploring the codebase!