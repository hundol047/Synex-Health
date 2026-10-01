"""Disposable CI database only. Exercises real PG migration/upsert/concurrent transactions."""
import os
from concurrent.futures import ThreadPoolExecutor
from app.health.store import HealthStore
from app.health.schemas import HealthUser
assert os.environ['DATABASE_URL'].startswith('postgresql+psycopg://')
store=HealthStore(migrate=True)
uid='ci-concurrency-only'
store.upsert_user(HealthUser(id=uid,name='CI synthetic',role='student'))
def write(i):store.save_preference(uid,'concurrency',{'revision':i})
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(write,range(32)))
assert store.preference(uid,'concurrency')['revision'] in range(32)
with store.connect() as db:
 assert db.execute('SELECT COUNT(*) FROM preferences WHERE user_id=? AND kind=?',(uid,'concurrency')).fetchone()[0]==1
 db.execute('DELETE FROM preferences WHERE user_id=?',(uid,))
 db.execute('DELETE FROM users WHERE id=?',(uid,))
print('PostgreSQL migration, concurrent atomic upsert, uniqueness and cleanup passed')
