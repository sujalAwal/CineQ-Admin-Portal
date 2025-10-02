# CineQ Dashboard - Docker Deployment Guide

## Prerequisites
1. **Install Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Follow installation instructions
   - Restart your computer after installation

2. **Install Portainer (if not already installed)**
   ```bash
   docker run -d -p 9000:9000 --name=portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest
   ```

## Files Created for Docker Deployment

### 1. Dockerfile
- Multi-stage build using Node.js 22 and Nginx
- Optimized for production deployment
- Located at: `./Dockerfile`

### 2. docker-compose.yml
- Complete stack configuration
- Health checks included
- Ready for Portainer deployment
- Located at: `./docker-compose.yml`

### 3. nginx.conf
- Optimized for Angular SPA routing
- Security headers included
- Gzip compression enabled
- Located at: `./nginx.conf`

### 4. .dockerignore
- Excludes unnecessary files from build
- Reduces image size
- Located at: `./.dockerignore`

## Deployment Options

### Option 1: Using Docker Commands
```bash
# Build the image
docker build -t cineq-dashboard .

# Run the container
docker run -d -p 80:80 --name cineq-dashboard cineq-dashboard
```

### Option 2: Using Docker Compose
```bash
# Build and start
docker-compose up -d

# Stop
docker-compose down
```

### Option 3: Using Portainer (Recommended)
1. Open Portainer web interface (usually http://localhost:9000)
2. Go to "Stacks" section
3. Click "Add stack"
4. Paste the contents of `docker-compose.yml`
5. Deploy the stack

## Build Process
The Docker build will:
1. Install Node.js dependencies
2. Build Angular app for production (`npm run build`)
3. Copy built files to Nginx
4. Configure Nginx for SPA routing

## Access Your Application
- **Local development**: http://localhost:4200 (ng serve)
- **Docker container**: http://localhost:80 (after deployment)

## Troubleshooting
- Ensure Docker Desktop is running
- Check that ports 80 and 9000 are available
- Verify Node.js build completes successfully
- Check Portainer logs for deployment issues

## Next Steps After Docker Installation
1. Restart your computer
2. Verify Docker installation: `docker --version`
3. Run: `docker build -t cineq-dashboard .`
4. Deploy to Portainer using the docker-compose.yml file

## Production Considerations
- Change the host in docker-compose.yml for production
- Configure SSL/TLS certificates
- Set up proper domain name
- Configure reverse proxy if needed
- Monitor resource usage and logs