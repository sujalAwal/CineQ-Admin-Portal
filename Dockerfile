# Multi-stage build for Angular application

# Stage 1: Build the Angular application
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Build argument to specify environment (default to production)
ARG BUILD_CONFIGURATION=production

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate environment.prod.ts from environment variables (if production)
RUN if [ "${BUILD_CONFIGURATION}" = "production" ]; then \
      node scripts/generate-env.js || echo "Warning: Could not generate env file"; \
    fi

# Build the application for specified environment
RUN npm run ng build -- --configuration=${BUILD_CONFIGURATION}

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]