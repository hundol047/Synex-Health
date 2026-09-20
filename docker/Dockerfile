FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend/ /app/backend/
COPY --from=frontend /build/dist /app/frontend/dist
COPY --from=frontend /build/public /app/frontend/public
RUN useradd --create-home --uid 10001 synex && mkdir -p /app/runtime && chown -R synex:synex /app/runtime
USER synex
ENV SYNEX_HEALTH_DB_PATH=/app/runtime/health.sqlite3
ENV SYNEX_HEALTH_AUTH_SESSION_PATH=/app/runtime/auth.sqlite3
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/status')"
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
