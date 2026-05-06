# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# Stage 2: Final image — Python 3.11 base + Node.js + supervisord
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install Node.js 20 and supervisord
RUN apt-get update && \
    apt-get install -y curl supervisor --no-install-recommends && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies using uv (system-wide, no venv needed)
COPY pyproject.toml uv.lock ./
RUN UV_SYSTEM_PYTHON=1 uv sync --frozen --no-dev --no-install-project

# Install Node.js backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy all source files
COPY backend/ ./backend/
COPY ai_pipeline/ ./ai_pipeline/

# Copy the React build from Stage 1
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/qpapermaker.conf

# HuggingFace Spaces requires port 7860
EXPOSE 7860

CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
