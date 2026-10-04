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

from app.health.schemas import WorkoutLog
from app.health.store import WorkoutConflict
workout_id='ci-cas-only'
with store.connect() as db:db.execute('DELETE FROM workouts WHERE id=?',(workout_id,))
def workout_write(i):
 try:return store.add_workout(WorkoutLog(id=workout_id,user_id=uid,date='2026-10-01',exercise_name='CI',mutation_id=str(i)),0)
 except WorkoutConflict:return None
with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(workout_write,range(20)))
assert sum(r is not None for r in results)==1
assert store.list_workouts(uid)[0].revision==1
with store.connect() as db:db.execute('DELETE FROM workouts WHERE id=?',(workout_id,))
print('PostgreSQL optimistic workout concurrency passed')

# Twenty independent records must all survive; injected exceptions must roll back.
ids=[f'ci-unique-{i}' for i in range(20)]
def distinct(i):return store.add_workout(WorkoutLog(id=ids[i],user_id=uid,date='2026-10-01',exercise_name='CI',mutation_id=str(i)),0)
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(distinct,range(20)))
assert len(store.list_workouts(uid))==20
try:
 with store.connect() as db:
  db.execute('DELETE FROM workouts WHERE user_id=?',(uid,))
  raise RuntimeError('injected rollback')
except RuntimeError:pass
assert len(store.list_workouts(uid))==20
HealthStore(migrate=True)
with store.connect() as db:
 assert db.execute('SELECT checksum FROM migration_history WHERE version=?',(4,)).fetchone()[0]
 db.execute('DELETE FROM workouts WHERE user_id=?',(uid,))
print('PostgreSQL 20 independent writes, rollback, repeated migration passed')

# Ownership must remain unique across schools even under simultaneous admin writes.
map_ids=['ci-mapping-one','ci-mapping-two']
with store.connect() as db:
 for mapped_uid in map_ids:db.execute('DELETE FROM preferences WHERE user_id=?',(mapped_uid,))
def assign_subject(mapped_uid):
 try:
  store.assign_inbody_mapping(mapped_uid,{'school_id':mapped_uid,'school_user_id':mapped_uid,'subject':'ci-shared-subject'})
  return True
 except ValueError:return False
with ThreadPoolExecutor(max_workers=2) as pool:
 assert sorted(pool.map(assign_subject,map_ids))==[False,True]
with store.connect() as db:
 for mapped_uid in map_ids:db.execute('DELETE FROM preferences WHERE user_id=?',(mapped_uid,))
print('PostgreSQL cross-school provider mapping concurrency passed')
