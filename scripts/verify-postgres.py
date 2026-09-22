"""Integration check for an EMPTY disposable PostgreSQL DB (never production data).
DATABASE_URL=postgresql+psycopg://... SYNEX_TEST_DATABASE=true python scripts/verify-postgres.py
"""
import os,sys
from pathlib import Path
if os.getenv('SYNEX_TEST_DATABASE')!='true' or not os.getenv('DATABASE_URL'):
    raise SystemExit('Requires explicit SYNEX_TEST_DATABASE=true and a disposable DATABASE_URL')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.health.store import HealthStore
from app.health.schemas import HealthUser,BodyCompositionMeasurement
from app.services.audit import AuditStore
from app.services.auth import _AuthSessionStore
s=HealthStore();uid='postgres-integration-probe'
s.upsert_user(HealthUser(id=uid,name='test'));s.upsert_user(HealthUser(id=uid,name='updated'))
assert s.get_user(uid).name=='updated'
s.save_preference(uid,'probe',{'value':1});s.save_preference(uid,'probe',{'value':2})
assert s.preference(uid,'probe')['value']==2
s.add_measurement(BodyCompositionMeasurement(id='postgres-probe',user_id=uid,measurement_date='2026-01-01',weight=70))
assert len(s.list_measurements(uid))==1
try:
    with s.connect() as db:
        db.execute('DELETE FROM measurements WHERE user_id=?',(uid,))
        raise ValueError('rollback')
except ValueError:pass
assert len(s.list_measurements(uid))==1
AuditStore().record(uid,'test',{})
assert AuditStore().list(uid)[0]['event']=='test'
auth=_AuthSessionStore();auth.put('probe',user_id=uid,role='student');assert auth.get('probe').id==uid
with s.connect() as db:
    for table in ('measurements','preferences'):db.execute(f'DELETE FROM {table} WHERE user_id=?',(uid,))
    db.execute('DELETE FROM users WHERE id=?',(uid,))
print('PostgreSQL repository, transaction rollback, audit and sessions passed')
