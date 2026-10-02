FROM node:22-bookworm-slim AS frontend-base
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run pose:setup

FROM frontend-base AS frontend-dev
RUN npm run build

FROM frontend-base AS frontend-release
ARG VITE_API_BASE
ARG VITE_PRIVACY_URL
ARG VITE_SUPPORT_URL
ARG VITE_TERMS_URL
ARG LEGAL_OPERATOR
ARG SUPPORT_EMAIL
ARG RETENTION_POLICY
ARG VITE_LAUNCH_MODE=free
ENV VITE_RELEASE_TARGET=web
RUN npm run build:release && node scripts/verify-release-assets.mjs

FROM python:3.12-slim AS runtime-base
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend/ /app/backend/
RUN useradd --create-home --uid 10001 synex && mkdir -p /app/runtime && chown -R synex:synex /app/runtime
USER synex
ENV SYNEX_HEALTH_DB_PATH=/app/runtime/health.sqlite3
ENV SYNEX_HEALTH_AUTH_SESSION_PATH=/app/runtime/auth.sqlite3
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/readyz')"
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]

FROM runtime-base AS development
COPY --from=frontend-dev /build/dist /app/frontend/dist

FROM runtime-base AS production
COPY --from=frontend-release /build/dist /app/frontend/dist
ENV APP_ENV=production AUTH_MODE=oidc SYNEX_HEALTH_DEMO_SEED=false
