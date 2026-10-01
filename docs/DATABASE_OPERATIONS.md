# Database operations

IMPLEMENTED: SQLite demo and SQLAlchemy/psycopg PostgreSQL adapter. Schema version 3 adds adaptive history and pose-session tables, ownership/date indexes, unique routine history and routine foreign key. Existing entities remain payload repositories: segment measurements and routine items are nested JSON, integration status/goals/consents use existing tables/preferences. This is deliberate compatibility, not a claim that every entity has been normalized.

Production requires PostgreSQL and an applied schema. Run from backend: `PYTHONPATH=. python scripts/migrate.py` as a release job, before app startup, with DATABASE_URL. Migration is repeatable, creates auth/audit schemas, and uses an advisory lock for health changes. Do not run concurrent release jobs. Runtime production skips schema creation. CI runs a disposable PostgreSQL service and verifies migrations, 32 concurrent upserts and uniqueness; production load/restore remain separate gates.

Connections use pooled transactions and pre-ping. Do not retry uncertain committed writes blindly. Workout logical keys and unique upserts make retransmission idempotent; offline queue retains failed writes and retries on reconnect/user action. No broad automatic retry of arbitrary mutations is enabled. Timestamps are UTC ISO strings; workout dates are user-entered calendar dates.

## Backup and restore
Use a secret-managed DATABASE_URL_PG (ordinary postgresql URL for pg tools). `pg_dump --format=custom --file=backup.dump "$DATABASE_URL_PG"`; encrypt backups with operator KMS, restricted access and defined retention. Never commit dumps. Restore to a NEW empty staging database using `pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" backup.dump`. Check counts, ownership access, latest measurement/routine, consent and deletion behavior before switching traffic.

## Deployment / rollback / recovery
1. Back up and complete a restore drill in staging; record backup timestamp and recovery objective.
2. Apply migration to staging and run tests with synthetic data.
3. Stop writes or use an operator maintenance window; back up production and apply migration once.
4. Start the candidate, verify own-account health checks and audit without printing health data.
5. Roll back compatible app code first. No destructive automatic down migration exists. If database rollback is required, restore the pre-migration backup into a separate database and explicitly reconcile writes after backup before switching traffic.

EXTERNAL SETUP REQUIRED: actual PostgreSQL host/TLS/private network, least-privilege migration/runtime roles, backup scheduler, off-site retention, point-in-time recovery and measured RPO/RTO. Live SQLite-to-PostgreSQL transfer tooling and full foreign-key normalization are NOT IMPLEMENTED. No successful production restore is claimed.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
