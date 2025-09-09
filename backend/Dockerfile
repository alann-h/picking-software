# ---- Stage 1: Build & Prune ----
FROM node:22-alpine AS builder

# Enable pnpm using Corepack (included in Node 22)
RUN corepack enable pnpm

WORKDIR /app

# Copy the pnpm configuration and all package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies using pnpm
RUN pnpm install

# Copy the backend source code
COPY backend/ ./backend/

# Prune development dependencies using pnpm
RUN pnpm prune --prod


# ---- Stage 2: Production ----
FROM node:22-alpine

# Enable pnpm using Corepack for the CMD
RUN corepack enable pnpm

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY backend/package.json ./
COPY backend/ ./

EXPOSE 5033

# Start the application using pnpm
CMD ["pnpm", "start"]