# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install dependencies
COPY frontend-react/package.json frontend-react/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend-react/ ./
# Build for production (Vite produces dist/)
RUN npm run build

# ==========================================
# Stage 2: Setup Python Backend
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# xhtml2pdf requires pango, etc.
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ ./backend/
COPY assets/ ./assets/
COPY scripts/ ./scripts/
COPY wsgi.py .
# Ensure instance folder exists for SQLite fallback or other needs
RUN mkdir -p instance exports backups

# Copy Frontend Build from Stage 1
# We put it inside backend/static_dist so it's easy to reference
COPY --from=frontend-builder /app/dist ./backend/static_dist

# Environment Configuration
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend.main
ENV APP_STATIC_DIR=/app/backend/static_dist
ENV PORT=8000

# Expose Port
EXPOSE 8000

# Run with Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
