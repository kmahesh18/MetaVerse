# ===================================
# 🚀 Production Dockerfile for MetaVerse Server
# Optimized for MediaSoup with C++ worker threads
# ===================================

# Stage 1: Builder - Install dependencies and compile
FROM node:18-bullseye AS builder

# Install system dependencies required for MediaSoup
# MediaSoup requires build tools for C++ compilation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Set environment variables to limit parallel builds (reduce memory usage)
ENV MAKEFLAGS="-j1"
ENV npm_config_jobs=1

# Install dependencies (including devDependencies for build)
# Using single-threaded build to avoid OOM errors
RUN npm ci --only=production=false

# Copy server source code
COPY server/src ./src

# Build TypeScript
RUN npm run build

# ===================================
# Stage 2: Production - Minimal runtime image
FROM node:18-bullseye-slim

# Install only runtime dependencies for MediaSoup
# MediaSoup needs these at runtime for worker processes
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Copy all node_modules from builder (includes compiled MediaSoup)
# This avoids rebuilding MediaSoup which requires Python/C++ build tools
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN groupadd -r metaverse && useradd -r -g metaverse metaverse

# Change ownership
RUN chown -R metaverse:metaverse /app

# Switch to non-root user
USER metaverse

# Expose ports
# HTTP/WebSocket port
EXPOSE 3000
# MediaSoup RTC ports range
EXPOSE 40000-49999/tcp
EXPOSE 40000-49999/udp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/server.js"]
