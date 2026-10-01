"""Run once as a release job: PYTHONPATH=. python scripts/migrate.py (from backend)."""
import os
os.environ['SYNEX_MIGRATING']='true'
from app.health.store import HealthStore
from app.health.migrations import VERSION
if os.getenv('APP_ENV')=='production' and not os.getenv('DATABASE_URL','').startswith('postgresql+psycopg://'):
    raise SystemExit('Production migrations require PostgreSQL')
# Serialize deploy jobs at the orchestration layer; take a PG advisory lock as well.
if os.getenv('DATABASE_URL'):
    from app.services.persistence import Database
    from sqlalchemy import text
    engine=Database(os.environ['DATABASE_URL']).engine
    with engine.connect() as connection:
        connection.execute(text('SELECT pg_advisory_lock(731845)'))
        try: HealthStore(migrate=True)
        finally: connection.execute(text('SELECT pg_advisory_unlock(731845)'))
else: HealthStore(migrate=True)
from app.services.auth import AUTH_SESSIONS
from app.services.audit import AuditStore
AuditStore()
if os.getenv('DATABASE_URL'):
    with AUTH_SESSIONS._connect() as db:
        db.execute('ALTER TABLE auth_sessions ALTER COLUMN created_at_ts TYPE DOUBLE PRECISION')
        db.execute('ALTER TABLE revoked_tokens ALTER COLUMN expires TYPE DOUBLE PRECISION')
print(f'Health schema {VERSION} applied')
