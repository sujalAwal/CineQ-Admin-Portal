# Angular API Integration & Environment Setup Guide

## 🏗️ **Environment Configuration (Like Laravel .env)**

### **Local Development**
```bash
# Build for development (uses environment.ts)
ng serve
# or
npm start

# API Base URL: http://localhost:8000/api
```

### **Staging Environment**
```bash
# Build for staging (uses environment.staging.ts)
ng build --configuration=staging

# API Base URL: https://staging-api.cineq.com/api
```

### **Production Environment**
```bash
# Build for production (uses environment.prod.ts)
ng build --configuration=production

# API Base URL: https://api.cineq.com/api
```

## 📁 **Project Structure Created**

```
src/
├── environments/
│   ├── environment.ts          # Local development
│   ├── environment.staging.ts  # Staging server
│   └── environment.prod.ts     # Production server
├── app/shared/
│   ├── interfaces/
│   │   └── auth.interface.ts   # TypeScript interfaces
│   ├── services/
│   │   ├── auth.service.ts     # Authentication service (like Laravel Auth)
│   │   └── loading.service.ts  # Loading state management
│   ├── interceptors/
│   │   ├── auth.interceptor.ts # Auto-add auth tokens (like middleware)
│   │   └── loading.interceptor.ts # Handle loading states
│   └── guards/
│       ├── auth.guard.ts       # Protect authenticated routes
│       └── guest.guard.ts      # Protect guest routes (login/register)
```

## 🔧 **Laravel API Endpoints Required**

Your Laravel API should have these endpoints:

```php
// routes/api.php
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('auth:sanctum');
    Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');
});
```

### **Laravel AuthController Example**
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user,
                'token' => $token,
                'expires_in' => 24 * 60 * 60 // 24 hours
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function user(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()
        ]);
    }
}
```

## 🚀 **How to Use**

### **1. Update API URLs**
Edit the environment files to match your API endpoints:

```typescript
// src/environments/environment.ts (local)
api: {
  baseUrl: 'http://localhost:8000/api',  // Your local Laravel API
}

// src/environments/environment.prod.ts (production)
api: {
  baseUrl: 'https://your-production-api.com/api',  // Your production API
}
```

### **2. Test Login**
1. Start your Angular app: `npm start`
2. Go to http://localhost:4200/login
3. Enter credentials and click Login
4. Check browser DevTools Network tab for API calls

### **3. Build for Different Environments**

```bash
# Development
npm start

# Staging
ng build --configuration=staging

# Production
npm run build  # or ng build --configuration=production
```

## 🛠️ **How It Works (Laravel Developer Perspective)**

### **Authentication Flow**
```
Angular Frontend          Laravel Backend
┌─────────────────┐      ┌─────────────────┐
│ 1. Login Form   │─────▶│ POST /api/auth/login │
│ 2. Store Token  │◀─────│ Return JWT Token     │
│ 3. Auto-attach  │─────▶│ Authorization Header │
│    Token        │      │ (via Interceptor)    │
│ 4. Protected    │◀─────│ Validate Token       │
│    Routes       │      │ (via Sanctum)        │
└─────────────────┘      └─────────────────┘
```

### **Service Comparison**
| Angular | Laravel | Purpose |
|---------|---------|---------|
| `AuthService` | `Auth::attempt()` | Login user |
| `AuthService.getCurrentUser()` | `Auth::user()` | Get current user |
| `AuthService.logout()` | `Auth::logout()` | Logout user |
| `AuthGuard` | `auth` middleware | Protect routes |
| `GuestGuard` | `guest` middleware | Redirect if logged in |
| `environment.ts` | `.env` file | Configuration |

## 🔍 **Debugging Tips**

### **Check API Calls**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for `/auth/login` request
5. Check request/response data

### **Check Console Errors**
1. Open Browser DevTools Console
2. Look for any red error messages
3. Check for CORS issues with your Laravel API

### **Test API Directly**
```bash
# Test Laravel API directly
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## 🎯 **Next Steps**

1. **Update your Laravel API** to match the expected endpoints
2. **Configure CORS** in Laravel for your Angular domain
3. **Test the integration** with your actual API
4. **Deploy** using the environment-specific builds

Remember: Angular handles the frontend, Laravel handles the API. The environment files ensure your Angular app connects to the right API server for each stage!