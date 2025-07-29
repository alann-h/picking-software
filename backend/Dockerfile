# ---- Stage 1: Build & Prune ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm install

# Copy the backend source code
COPY backend/ ./backend/

RUN npm prune --omit=dev


# ---- Stage 2: Production ----
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY backend/package.json ./

COPY backend/ ./

EXPOSE 5033

CMD ["npm", "start"]
