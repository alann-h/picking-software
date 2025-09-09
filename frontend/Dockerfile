# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

ARG VITE_API_BASE_URL

# Enable pnpm using Corepack
RUN corepack enable pnpm

WORKDIR /app

# Copy the pnpm configuration and all package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies using pnpm
RUN pnpm install

COPY frontend/ ./frontend/
COPY frontend/tsconfig.json ./frontend/

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Run the build script for the 'frontend' workspace using pnpm filter
RUN pnpm --filter frontend run build


# ---- Stage 2: Serve ----
# This stage remains unchanged as it only uses Nginx.
FROM nginx:1.27-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80