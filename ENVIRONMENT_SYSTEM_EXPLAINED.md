# Angular Environment System vs Laravel Environment System

## 🔄 **Key Difference: Build-time vs Runtime Configuration**

### **Laravel Approach (Runtime Configuration):**
```
┌─────────────────────────────────────────────┐
│ 1. Same code deployed to all servers       │
│ 2. Different .env file on each server      │
│ 3. Configuration read at runtime           │
└─────────────────────────────────────────────┘

Example:
- Deploy same Laravel code to 3 servers
- Each server has different .env file:
  
Server 1 (Local):     Server 2 (Staging):    Server 3 (Production):
APP_URL=localhost     APP_URL=staging.com     APP_URL=prod.com
DB_HOST=localhost     DB_HOST=staging-db      DB_HOST=prod-db
```

### **Angular Approach (Build-time Configuration):**
```
┌─────────────────────────────────────────────┐
│ 1. Different builds for each environment   │
│ 2. Configuration baked into the build      │
│ 3. No runtime configuration needed         │
└─────────────────────────────────────────────┘

Example:
- Create 3 different builds from same code
- Each build has different configuration embedded
```

## 🏗️ **How Angular Build Process Works**

### **File Replacement During Build:**

```typescript
// Your code always imports from:
import { environment } from './environments/environment';

// But during build, Angular replaces the file:
```

**1. Development Build (`npm start`):**
```bash
ng serve
# Uses: environment.ts (no replacement)
# API URL: http://localhost:8000/api
```

**2. Staging Build (`ng build --configuration=staging`):**
```bash
ng build --configuration=staging
# Replaces: environment.ts → environment.staging.ts
# API URL: https://staging-api.cineq.com/api
```

**3. Production Build (`npm run build`):**
```bash
ng build --configuration=production
# Replaces: environment.ts → environment.prod.ts  
# API URL: https://api.cineq.com/api
```

## 📋 **angular.json Configuration**

Here's what I added to your `angular.json`:

```json
{
  "configurations": {
    "production": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.prod.ts"
        }
      ]
    },
    "staging": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts", 
          "with": "src/environments/environment.staging.ts"
        }
      ]
    }
  }
}
```

## 🚀 **Build Output Comparison**

### **What Gets Generated:**

```bash
# Development (ng serve)
→ Serves files directly, uses environment.ts
→ Live reload, debugging enabled
→ API calls go to: http://localhost:8000/api

# Staging Build
ng build --configuration=staging
→ dist/
  ├── index.html
  ├── main.[hash].js     ← Contains staging API URL
  └── assets/
→ API calls go to: https://staging-api.cineq.com/api

# Production Build  
ng build --configuration=production
→ dist/
  ├── index.html
  ├── main.[hash].js     ← Contains production API URL
  └── assets/
→ API calls go to: https://api.cineq.com/api
```

## 🌍 **Deployment Strategy**

### **Laravel Deployment (What you do now):**
```bash
# Same code, different .env per server
git clone repo
composer install
cp .env.example .env
vim .env                 # Edit for this server
php artisan key:generate
php artisan config:cache
```

### **Angular Deployment (New approach):**
```bash
# Different builds per server

# For Staging Server:
ng build --configuration=staging
# Upload dist/ folder to staging server

# For Production Server:  
ng build --configuration=production
# Upload dist/ folder to production server
```

## 🐳 **Docker/Portainer Approach**

### **Option 1: Build-specific Images (Recommended)**
```dockerfile
# Dockerfile.staging
FROM node:18 AS build
COPY . .
RUN npm install
RUN ng build --configuration=staging

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

```dockerfile
# Dockerfile.production  
FROM node:18 AS build
COPY . .
RUN npm install
RUN ng build --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### **Option 2: Runtime Environment Override (Advanced)**
If you want Laravel-like behavior, you can override at runtime:

```typescript
// environment.ts
export const environment = {
  production: false,
  api: {
    baseUrl: window['env']?.['API_URL'] || 'http://localhost:8000/api'
  }
};
```

```javascript
// assets/env.js (loaded before Angular)
window.env = {
  API_URL: 'https://runtime-configured-api.com/api'
};
```

## ⚡ **Why Angular Uses Build-time Configuration**

### **Advantages:**
1. **Performance**: No runtime configuration lookup
2. **Security**: API URLs can't be changed by users
3. **Optimization**: Dead code elimination during build
4. **Caching**: Static assets cache better

### **Laravel vs Angular:**
| Aspect | Laravel | Angular |
|--------|---------|---------|
| **When configured** | Runtime | Build-time |
| **File changes** | Edit .env on server | Build new version |
| **Performance** | Runtime lookup | Embedded in code |
| **Flexibility** | High (change anytime) | Medium (need rebuild) |
| **Security** | Server-side only | Client-side visible |

## 🎯 **Best Practices for Your Workflow**

### **Development:**
```bash
npm start  # Always uses environment.ts
```

### **Staging Deployment:**
```bash
ng build --configuration=staging
# Deploy dist/ to staging server
```

### **Production Deployment:**
```bash
ng build --configuration=production  
# Deploy dist/ to production server
```

### **CI/CD Pipeline Example:**
```yaml
# .github/workflows/deploy.yml
- name: Build Staging
  run: ng build --configuration=staging
  if: branch == 'develop'

- name: Build Production  
  run: ng build --configuration=production
  if: branch == 'main'
```

## 💡 **Summary**

**Laravel**: One codebase + different .env files per server (runtime config)
**Angular**: Different builds + embedded config per environment (build-time config)

Both approaches work, but Angular's build-time approach is better for frontend apps because:
- Static files are faster to serve
- No server needed to read configuration
- Better for CDN distribution
- More secure (config not easily changeable)

The key is to think of each Angular build as a "compiled version" for that specific environment, rather than a generic build that reads config at runtime.