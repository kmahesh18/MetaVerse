FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# ── Stage 1: Install dependencies ──
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Build backend using esbuild to bundle local workspaces (shared package) natively into a single ESM file
RUN cd apps/server && pnpm dlx esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js \
    --external:bcryptjs --external:cors --external:dotenv --external:express --external:helmet \
    --external:jsonwebtoken --external:mongoose --external:socket.io --external:zod --external:express-rate-limit

# ── Stage 3: Production runtime ──
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
