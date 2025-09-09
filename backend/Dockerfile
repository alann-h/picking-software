# ---- Stage 1: Build ----
    FROM node:22-alpine AS builder

    RUN corepack enable pnpm
    
    WORKDIR /app
    
    COPY pnpm-lock.yaml pnpm-workspace.yaml ./
    COPY package.json ./
    COPY frontend/package.json ./frontend/
    COPY backend/package.json ./backend/
    
    RUN pnpm install --prod --filter=backend
    
    
    # ---- Stage 2: Production ----
    FROM node:22-alpine
    
    RUN corepack enable pnpm
    
    WORKDIR /app
    
    COPY --from=builder /app/node_modules ./node_modules
    
    COPY backend/ ./
    
    EXPOSE 5033
    
    CMD ["pnpm", "start"]