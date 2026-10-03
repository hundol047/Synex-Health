# PostgreSQL backup and recovery

Status: IMPLEMENTED / NOT DEVICE VERIFIED until the named disposable CI restore run succeeds; production recovery remains EXTERNAL SETUP REQUIRED.

Migrate before app startup: `cd backend && PYTHONPATH=. python scripts/migrate.py`. Repeat safely. Version 4 adds `migration_history(version, applied_at, checksum)` and webhook deduplication. Legacy schema_migrations remains intact; legacy migrations are not retrospectively claimed to have immutable checksums. A changed v4 checksum aborts the transaction.

Pool: DB_POOL_SIZE=5, DB_MAX_OVERFLOW=5, DB_POOL_TIMEOUT=30 seconds, DB_POOL_RECYCLE=1800 seconds. Tune against total workers and PostgreSQL max_connections; values are validated.

Backup: use `DATABASE_URL` through a protected environment and `BACKUP_AGE_RECIPIENT` public encryption recipient, then `python scripts/backup-postgres.py /protected/backups/synex.dump.age`. This streams `pg_dump --format=custom --no-owner --no-acl` into age; no plaintext dump remains. Keep checksum manifest separately. Never put passwords in argv, repository or logs.

Restore drill: provision an isolated server with matching PostgreSQL major version/extensions, private access and enough capacity. Verify encrypted file SHA256 against manifest. With age identity from the secret manager, stream `age --decrypt -i /protected/identity /protected/backups/synex.dump.age | pg_restore --exit-on-error --no-owner --no-acl --dbname=synex_recovery`. Use PGHOST/PGUSER/PGPASSWORD or protected pgpass, never a password-bearing command URL. Start against an empty disposable database. Compare counts and canonical content checksums for health/auth/audit tables, migration version, foreign keys, roles and application read/write behavior. Measure elapsed restore time. Do not point the application at restored data until the operator approves validation.

Automated drill: `SYNEX_DISPOSABLE_DB=true DATABASE_URL=postgresql+psycopg://.../synex_test PYTHONPATH=. python scripts/verify_postgres_restore.py` from backend. Requires pg_dump/pg_restore matching server major. It creates a unique synex_test_restore_* DB, inserts 20 synthetic rows, dumps, drops, recreates, restores and checks count/content checksum, then cleans up. Refuses a non-test DB name or missing explicit opt-in. This tests the actual database tools, not encrypted off-site production recovery. `verify_postgres.py` separately tests migrations, 20 contending writes, 20 distinct writes and rollback.

| Operating policy | Decision |
|---|---|
| RPO / WAL archiving / backup interval | OPERATOR DECISION REQUIRED |
| RTO / scheduled restore drill | OPERATOR DECISION REQUIRED |
| Retention / legal deletion | OPERATOR DECISION REQUIRED |
| Encryption recipient / rotation / recovery custody | OPERATOR DECISION REQUIRED |
| Off-site account / region / immutable retention | OPERATOR DECISION REQUIRED |
| Restore approver / alert owner | OPERATOR DECISION REQUIRED |
