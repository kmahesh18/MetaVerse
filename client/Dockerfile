# ===================================
# 🎨 Production Dockerfile for MetaVerse Client
# Multi-stage build with Nginx for static serving
# ===================================

# Stage 1: Builder - Build React + Vite application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy client source code and config files
COPY client/ .

# Copy shared types AFTER client files (needed for TypeScript imports)
COPY shared ../shared

# Build arguments for environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_BACKEND_URL

# Set environment variables for build
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build the application
RUN npm run build

# ===================================
# Stage 2: Production - Nginx server
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add nginx user permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
