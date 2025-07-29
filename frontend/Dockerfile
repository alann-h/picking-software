# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

ARG VITE_API_BASE_URL

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm install

COPY frontend/ ./frontend/
COPY frontend/tsconfig.json ./frontend/

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build --workspace=frontend


# ---- Stage 2: Serve ----a
# Use a lightweight Nginx web server to serve the static files in production.
# This creates a much smaller and more secure final image than using Node.js.
FROM nginx:1.27-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
