import os, logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .health.router import router as health_router, store as health_store
from .health.demo_seed import seed_demo_data
from .health.providers.base import ProviderNotConfigured
from .health import health_agent

log = logging.getLogger('synex_health')


def resolve_cors_config(cors_origins_env=None, allow_credentials_env=None):
    """Same rule as SynexAgent's main.py: allow_credentials=True (needed for the demo auth session
    cookie) can never be combined with a wildcard origin -- see that file's docstring for the
    CSRF-shaped hole this prevents."""
    origins = [o.strip() for o in (cors_origins_env if cors_origins_env is not None else
               os.getenv('SYNEX_CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')).split(',') if o.strip()]
    allow_credentials = (allow_credentials_env if allow_credentials_env is not None else
                          os.getenv('SYNEX_CORS_ALLOW_CREDENTIALS', 'true')).lower() != 'false'
    if '*' in origins and allow_credentials:
        raise RuntimeError('SYNEX_CORS_ORIGINS must not be "*" while credentialed CORS is enabled.')
    return origins, allow_credentials


@asynccontextmanager
async def lifespan(app):
    if os.getenv('AUTH_MODE', 'demo').lower() == 'demo' and os.getenv('SYNEX_HEALTH_DEMO_SEED', 'true').lower() != 'false':
        seed_demo_data(health_store)
    yield

app = FastAPI(title='Synex Health API', version='0.1.0', lifespan=lifespan)
_cors_origins, _cors_allow_credentials = resolve_cors_config()
app.add_middleware(CORSMiddleware, allow_origins=_cors_origins, allow_credentials=_cors_allow_credentials,
                    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
                    allow_headers=['Content-Type', 'Authorization', 'X-Synex-Demo-User', 'Idempotency-Key'])


@app.exception_handler(ProviderNotConfigured)
async def provider_not_configured_handler(request, exc):
    return JSONResponse(status_code=501, content={'detail': str(exc)})


@app.get('/api/health/status')
def health_status():
    return {
        'status': 'ok', 'demo': os.getenv('AUTH_MODE', 'demo').lower() == 'demo', 'service': 'synex-health',
        'agent': {'status': 'ok', 'mode': health_agent.agent_mode()},
        'auth': {'status': 'ok', 'mode': os.getenv('AUTH_MODE', 'demo').lower()},
        'providers': {'mock': 'ok', 'manual': 'ok', 'csv': 'ok', 'inbody': 'not_configured', 'biogram': 'not_configured'},
    }


app.include_router(health_router)

DIST = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
if DIST.exists():
    app.mount('/assets', StaticFiles(directory=DIST / 'assets'), name='assets')
    models_dir = Path(__file__).resolve().parents[2] / 'frontend' / 'public' / 'models'
    if models_dir.exists():
        app.mount('/models', StaticFiles(directory=models_dir), name='models')

    @app.get('/{full_path:path}', include_in_schema=False)
    def spa(full_path: str):
        candidate = (DIST / full_path).resolve()
        if not candidate.is_relative_to(DIST.resolve()):
            raise HTTPException(404, 'Not found')
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / 'index.html')
