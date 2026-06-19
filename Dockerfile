# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (devDeps needed for Vite).
# --ignore-scripts prevents postinstall from trying to build before src/ is copied.
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build the frontend
COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Copy built frontend FIRST — postinstall finds dist/index.html and exits immediately,
# so npm ci --omit=dev never tries to re-run vite (which has no devDeps here).
COPY --from=builder /app/dist ./dist

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy server code and helper scripts
COPY server ./server
COPY scripts ./scripts

# Create dirs that the server writes to at runtime.
# news-images and image-library are fallback paths — Cloud Run uses GCS in production
# but the directories must exist or express.static / readdir will error on startup.
RUN mkdir -p \
      server/public/news-images \
      server/public/image-library \
      server/uploads/cornerOffice

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
