# ============================================================================
# Multi-Stage Dockerfile for Port Inventory
# 
# Stages:
#   1. frontend-builder: Builds Vite + React 19 + TypeScript SPA via Bun
#   2. backend-builder:  Compiles Rust Axum + Tokio backend executable
#   3. runtime:          Minimal Debian runtime environment with procfs visibility
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Frontend Asset Compilation (Bun)
# ----------------------------------------------------------------------------
FROM oven/bun:1 AS frontend-builder
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock tsconfig.json vite.config.ts index.html ./

# Copy frontend client source code
COPY client ./client

# Install dependencies and compile static production distribution in ./dist
RUN bun install --frozen-lockfile
RUN bun run build

# ----------------------------------------------------------------------------
# Stage 2: Rust Backend Compilation
# ----------------------------------------------------------------------------
FROM rust:bookworm AS backend-builder
WORKDIR /app

# Copy Cargo configuration and source files
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Compile the release binary
RUN cargo build --release --locked

# ----------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# ----------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime

# Install CA certificates and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libcap2-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled backend executable
COPY --from=backend-builder /app/target/release/port-inventory /app/port-inventory

# Copy static frontend bundle
COPY --from=frontend-builder /app/dist /app/dist

# Default operational configuration
ENV HOST="0.0.0.0" \
    PORT="80" \
    STATIC_DIR="/app/dist" \
    RUST_LOG="info"

# Expose default HTTP Port 80
EXPOSE 80

# Healthcheck monitoring the REST status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT:-80}/api/status || exit 1

# Launch the Port Inventory daemon
ENTRYPOINT ["/app/port-inventory"]
