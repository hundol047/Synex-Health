"""Run additive schema migrations using deployment DATABASE_URL (or SQLite default).
Back up the database first. Data transfer from SQLite is deliberately explicit.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.main import app
from app.health.router import store
with store.connect() as db:
    versions=[r[0] for r in db.execute('SELECT version FROM schema_migrations ORDER BY version')]
print('Health schema versions:',versions)
