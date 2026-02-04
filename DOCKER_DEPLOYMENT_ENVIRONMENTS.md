# 🚀 Docker Deployment Guide for CineQ Dashboard

## 📋 **Available Build Options**

### **1. Generic Dockerfile (Flexible)**
```bash
# Build with different environments using build args
docker build --build-arg BUILD_CONFIGURATION=production -t cineq-dashboard:prod .
docker build --build-arg BUILD_CONFIGURATION=staging -t cineq-dashboard:staging .
docker build --build-arg BUILD_CONFIGURATION=development -t cineq-dashboard:dev .
```

### **2. Environment-Specific Dockerfiles**
```bash
# Production build (uses environment.prod.ts)
docker build -f Dockerfile.production -t cineq-dashboard:production .

# Staging build (uses environment.staging.ts)  
docker build -f Dockerfile.staging -t cineq-dashboard:staging .
```

## 🏗️ **What Each Build Does**

### **Production Build:**
```typescript
// Uses: environment.prod.ts
api: {
  baseUrl: 'https://api.cineq.com/api'    // Production Laravel API
}
features: {
  enableRegistration: false               // Disable registration in prod
}
```

### **Staging Build:**
```typescript
// Uses: environment.staging.ts
api: {
  baseUrl: 'https://staging-api.cineq.com/api'  // Staging Laravel API
}
features: {
  enableRegistration: true                      // Allow testing in staging
}
```

## 🐳 **Docker Compose Deployment**

### **Production Deployment:**
```bash
# Deploy to production
docker-compose -f docker-compose.production.yml up -d

# Or with Portainer:
# Upload docker-compose.production.yml to Portainer
# Deploy as stack named "cineq-dashboard-production"
```

### **Staging Deployment:**
```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Or with Portainer:
# Upload docker-compose.staging.yml to Portainer  
# Deploy as stack named "cineq-dashboard-staging"
```

## 📱 **Portainer Deployment Steps**

### **Step 1: Choose Your Environment**
```
Production Server: Use docker-compose.production.yml
Staging Server:    Use docker-compose.staging.yml
```

### **Step 2: Deploy in Portainer**
1. Open Portainer web interface
2. Go to "Stacks" section
3. Click "Add stack"
4. Choose your environment file:
   - **Production**: Copy contents of `docker-compose.production.yml`
   - **Staging**: Copy contents of `docker-compose.staging.yml`
5. Name your stack: `cineq-dashboard-production` or `cineq-dashboard-staging`
6. Click "Deploy the stack"

### **Step 3: Verify Deployment**
```bash
# Check if container is running
docker ps | grep cineq-dashboard

# Check logs
docker logs cineq-dashboard-production

# Test the application
curl http://your-server/health
```

## 🌍 **Environment URLs After Deployment**

### **Production:**
- **Container**: `cineq-dashboard-production`
- **URL**: `http://dashboard.cineq.com`
- **API Calls Go To**: `https://api.cineq.com/api`
- **Features**: Registration disabled, Google Auth enabled

### **Staging:**
- **Container**: `cineq-dashboard-staging`  
- **URL**: `http://staging-dashboard.cineq.com`
- **API Calls Go To**: `https://staging-api.cineq.com/api`
- **Features**: All features enabled for testing

## ⚙️ **Build Process Comparison**

### **Laravel (What you know):**
```bash
# Same build, different config per server
docker build -t myapp .                    # Same image everywhere
docker run -e DB_HOST=prod-db myapp         # Different env vars per server
```

### **Angular (New approach):**
```bash
# Different builds per environment
docker build -f Dockerfile.production .    # Production-specific build
docker build -f Dockerfile.staging .       # Staging-specific build
```

## 🔧 **CI/CD Pipeline Example**

```yaml
# .github/workflows/deploy.yml
name: Deploy CineQ Dashboard

on:
  push:
    branches: 
      - main      # Deploy to production
      - develop   # Deploy to staging

jobs:
  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Production Image
        run: docker build -f Dockerfile.production -t cineq-dashboard:prod .
      - name: Deploy to Production
        run: |
          docker-compose -f docker-compose.production.yml up -d
          
  deploy-staging:
    if: github.ref == 'refs/heads/develop'  
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Staging Image
        run: docker build -f Dockerfile.staging -t cineq-dashboard:staging .
      - name: Deploy to Staging
        run: |
          docker-compose -f docker-compose.staging.yml up -d
```

## 🚨 **Important Notes**

### **1. No Runtime Configuration Needed**
Unlike Laravel, you don't need to edit any files on the server after deployment. The configuration is baked into the Docker image.

### **2. Different Images for Different Environments**
Each environment gets its own Docker image with the correct API URLs embedded.

### **3. Portainer Stack Names**
Use descriptive stack names:
- `cineq-dashboard-production`
- `cineq-dashboard-staging`

### **4. Health Checks**
All containers include health checks at `/health` endpoint for monitoring.

## 🎯 **Quick Commands Reference**

```bash
# Local testing
npm start                                    # Development with hot reload

# Production build and run
docker build -f Dockerfile.production -t cineq:prod .
docker run -p 80:80 cineq:prod

# Staging build and run  
docker build -f Dockerfile.staging -t cineq:staging .
docker run -p 80:80 cineq:staging

# Production deployment
docker-compose -f docker-compose.production.yml up -d

# Staging deployment
docker-compose -f docker-compose.staging.yml up -d
```

## ✅ **Ready for Production**

Your Docker setup is now ready! Each environment will:
- Use the correct API URLs automatically
- Have the right features enabled/disabled
- Be optimized for that specific environment
- Work seamlessly with Portainer

Just choose the right docker-compose file for your target environment and deploy! 🚀