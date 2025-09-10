# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

COPY backend/ ./backend/

RUN pnpm install --filter=backend

RUN pnpm deploy --prod --filter=backend /app/deploy


# ---- Stage 2: Production ----
FROM node:22-alpine

RUN corepack enable pnpm

WORKDIR /app

COPY --from=builder /app/deploy .

EXPOSE 5033
CMD ["pnpm", "start"]