# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm install

COPY frontend/ ./frontend/
COPY tsconfig.json ./

RUN npm run build --workspace=frontend


# ---- Stage 2: Serve ----a
# Use a lightweight Nginx web server to serve the static files in production.
# This creates a much smaller and more secure final image than using Node.js.
FROM nginx:1.27-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
