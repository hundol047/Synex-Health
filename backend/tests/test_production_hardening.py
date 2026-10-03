from datetime import date,datetime,timedelta,timezone
import pytest
from test_health import client

def test_migration_checksums_repeated_and_tamper_rejected(tmp_path):
    from app.health.store import HealthStore
    path=tmp_path/'migration.db'
    store=HealthStore(path)
    HealthStore(path)
    with store.connect() as db:
        assert db.execute('SELECT COUNT(*) FROM migration_history').fetchone()[0]==1
        db.execute('UPDATE migration_history SET checksum=?',('tampered',))
    with pytest.raises(RuntimeError,match='checksum'):HealthStore(path)

def test_reusing_mutation_with_changed_body_conflicts(client):
    r=client.post('/api/exercise-routines/generate').json();e=r['exercises'][0]
    p={'routine_id':r['id'],'routine_exercise_id':e['exercise_id'],'day_number':e['day_number'],'exercise_name':e['exercise_name'],'date':date.today().isoformat(),'mutation_id':'checksum-replay','sets_completed':1}
    assert client.post('/api/workouts',json=p).status_code==200
    assert client.post('/api/workouts',json=p).json()['revision']==1
    assert client.post('/api/workouts',json={**p,'sets_completed':2}).status_code==409

def test_pool_settings_validate_without_connecting(monkeypatch):
    from app.services.persistence import Database
    monkeypatch.setenv('DB_POOL_SIZE','2');monkeypatch.setenv('DB_MAX_OVERFLOW','1');monkeypatch.setenv('DB_POOL_TIMEOUT','7');monkeypatch.setenv('DB_POOL_RECYCLE','90')
    d=Database('postgresql+psycopg://test:test@localhost/synex_test')
    assert d.engine.pool.size()==2 and d.engine.pool.timeout()==7
    d.engine.dispose();monkeypatch.setenv('DB_POOL_SIZE','0')
    with pytest.raises(ValueError):Database('postgresql+psycopg://test:test@localhost/synex_test')

def configure(monkeypatch):
    for k,v in {'AUTH_MODE':'oidc','BILLING_MODE':'revenuecat','REVENUECAT_SECRET_KEY':'unit-secret','REVENUECAT_WEBHOOK_AUTH':'Bearer unit','REVENUECAT_PRODUCTS':'plus-test','APPLE_PRODUCT_ID':'plus-test','GOOGLE_PRODUCT_ID':'plus-test','ENTITLEMENT_ID':'plus'}.items():monkeypatch.setenv(k,v)

@pytest.mark.parametrize('event,subscription,state,active',[
 ('INITIAL_PURCHASE',{},'active',True),('RENEWAL',{},'active',True),
 ('CANCELLATION',{'unsubscribe_detected_at':'2026-01-01'},'cancelled',True),
 ('BILLING_ISSUE',{'billing_issues_detected_at':'2026-01-01','grace_period_expires_date':'2099-01-01T00:00:00Z'},'grace_period',True),
 ('BILLING_ISSUE',{'billing_issues_detected_at':'2026-01-01'},'billing_issue',True),
 ('EXPIRATION',{},'expired',False),('REFUND',{'refunded_at':'2026-01-01'},'refunded',False),
 ('PRODUCT_CHANGE',{},'active',True),
])
def test_webhook_lifecycle_refetch_deduplicate_and_auth(client,monkeypatch,event,subscription,state,active):
    from app.health import billing
    configure(monkeypatch)
    cid,_=billing.account('student-jimin');calls=[]
    def get(*args,**kwargs):
        calls.append(1)
        return type('Response',(),{'raise_for_status':lambda self:None,'json':lambda self:{'subscriber':{'entitlements':{'plus':{'product_identifier':'plus-test','expires_date':'2000-01-01T00:00:00Z' if event=='EXPIRATION' else '2099-01-01T00:00:00Z'}},'subscriptions':{'plus-test':{'store':'app_store','is_sandbox':False,**subscription}}}}})()
    monkeypatch.setattr(billing.httpx,'get',get)
    body={'event':{'id':'unique-'+event,'type':event,'app_user_id':cid}}
    with pytest.raises(Exception):billing.webhook(body,'bad')
    assert billing.webhook(body,'Bearer unit')=={'ok':True}
    assert billing.account('student-jimin')[1]['state']==state
    assert billing.account('student-jimin')[1]['active']==active
    assert billing.webhook(body,'Bearer unit')['duplicate'] is True and len(calls)==1
    # Old events must read the current server state, not replay their original entitlement.
    body['event'].update(id='older-'+event,event_timestamp_ms=1)
    billing.webhook(body,'Bearer unit')
    assert billing.account('student-jimin')[1]['state']==state

def test_production_rejects_sandbox_even_when_allow_flag_set(client,monkeypatch):
    from app.health import billing
    configure(monkeypatch);monkeypatch.setenv('REVENUECAT_ALLOW_SANDBOX','true');monkeypatch.setenv('APP_ENV','production')
    billing.account('student-jimin')
    data={'subscriber':{'entitlements':{'plus':{'product_identifier':'plus-test','expires_date':'2099-01-01T00:00:00Z'}},'subscriptions':{'plus-test':{'is_sandbox':True}}}}
    monkeypatch.setattr(billing.httpx,'get',lambda *a,**k:type('R',(),{'raise_for_status':lambda s:None,'json':lambda s:data})())
    p=billing.refresh('student-jimin');assert p['environment']=='sandbox' and not p['active']
    assert not billing.status('student-jimin')['active']
    monkeypatch.delenv('APPLE_PRODUCT_ID');assert not billing.purchase_config()['ready']

def test_catalog_camera_and_export_audit(client):
    entries=client.get('/api/exercise-catalog').json()
    assert next(e for e in entries if e['id']=='squat')['recommended_camera_angle']
    assert client.get('/api/privacy/export').status_code==200
    from app.health.router import audit
    assert any(e['event']=='data_export' and e['detail']=={} for e in audit.list('student-jimin'))
