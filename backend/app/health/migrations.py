"""Explicit, versioned health-store additions; production invokes the CLI before startup."""
VERSION = 4

def upgrade(db, timestamp):
    db.execute('CREATE TABLE IF NOT EXISTS billing_accounts (user_id TEXT PRIMARY KEY, customer_id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS adaptive_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, old_routine_id TEXT, new_routine_id TEXT NOT NULL UNIQUE REFERENCES routines(id) ON DELETE CASCADE, payload TEXT NOT NULL, created_at TEXT NOT NULL)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_adaptive_user_date ON adaptive_history(user_id,created_at)')
    db.execute('CREATE TABLE IF NOT EXISTS pose_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_pose_user ON pose_sessions(user_id,created_at)')
    db.execute('INSERT OR IGNORE INTO schema_migrations VALUES (?,?)',(VERSION,timestamp))

    # Versioned immutable DDL checksum: detects changed migration definitions on rerun.
    import hashlib
    statements=[
        'CREATE TABLE IF NOT EXISTS billing_webhook_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TEXT NOT NULL)',
    ]
    db.execute('CREATE TABLE IF NOT EXISTS migration_history (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL, checksum TEXT NOT NULL)')
    checksum=hashlib.sha256('\n'.join(statements).encode()).hexdigest()
    previous=db.execute('SELECT checksum FROM migration_history WHERE version=?',(VERSION,)).fetchone()
    if previous and previous[0]!=checksum:raise RuntimeError('Migration checksum mismatch')
    for statement in statements:db.execute(statement)
    db.execute('INSERT OR IGNORE INTO migration_history VALUES (?,?,?)',(VERSION,timestamp,checksum))
