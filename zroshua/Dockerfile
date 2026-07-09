# ---- Frontend build ----
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Backend build ----
FROM node:22-alpine AS backend
# toolchain for native modules (better-sqlite3 compiles from source on musl)
RUN apk add --no-cache python3 make g++
WORKDIR /build
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---- Runtime ----
# Same image as the build stages: native modules (better-sqlite3) are ABI-compatible by construction.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    ZROSHUA_DATA_DIR=/data \
    ZROSHUA_PUBLIC_DIR=/app/public \
    ZROSHUA_PORT=8099
COPY --from=backend /build/dist ./dist
COPY --from=backend /build/node_modules ./node_modules
COPY --from=backend /build/package.json ./package.json
COPY --from=frontend /build/dist ./public
COPY card ./card
EXPOSE 8099
CMD [ "node", "dist/main.js" ]
