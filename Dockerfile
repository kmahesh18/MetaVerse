# This Dockerfile is for Railway deployment (Server)
# Railway will use this instead of docker-compose.yml

FROM node:18-bullseye AS builder

# Install system dependencies for MediaSoup
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Set environment for single-threaded build
ENV MAKEFLAGS="-j1"
ENV npm_config_jobs=1

# Install dependencies
RUN npm ci --only=production=false

# Copy server source
COPY server/src ./src

# Copy shared types
COPY shared ../shared

# Build
RUN npm run build

# Production stage
FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y \
    libssl1.1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN groupadd -r metaverse && useradd -r -g metaverse metaverse
RUN chown -R metaverse:metaverse /app
USER metaverse

EXPOSE 3000
EXPOSE 40000-49999/tcp
EXPOSE 40000-49999/udp

CMD ["node", "dist/server.js"]
