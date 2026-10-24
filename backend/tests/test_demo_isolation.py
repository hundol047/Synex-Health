import pytest
from test_health import client
from app.services.release_config import validate_auth_configuration

@pytest.mark.parametrize('env,match',[
 ({},'AUTH_MODE'),({'AUTH_MODE':'garbage'},'AUTH_MODE'),({'AUTH_MODE':'demo'},'SYNEX_ALLOW_DEMO'),
 ({'AUTH_MODE':'demo','SYNEX_ALLOW_DEMO':'true'},'DEMO_ACCESS_CODE'),
 ({'AUTH_MODE':'demo','SYNEX_ALLOW_DEMO':'true','DEMO_ACCESS_CODE':'short'},'DEMO_ACCESS_CODE')])
def test_invalid_auth_config_refuses_startup(env,match):
    with pytest.raises(RuntimeError,match=match):validate_auth_configuration(env)

def test_demo_database_rejects_real_identity(client):
    from app.health.router import store
    from app.health.schemas import HealthUser
    from app.services.release_config import validate_demo_database
    store.upsert_user(HealthUser(id='real-oidc-subject',name='Test'))
    with pytest.raises(RuntimeError,match='non-demo'):validate_demo_database(store)

def test_wrong_missing_access_code_and_failure_limit(client):
    client.headers.pop('Authorization',None)
    for i in range(10):
        payload={'demo_user_id':'student-jimin'}
        if i:payload['access_code']='wrong-code'
        assert client.post('/api/auth/demo-login',json=payload).status_code==401
    assert client.post('/api/auth/demo-login',json={'demo_user_id':'student-jimin','access_code':'test-only-demo-code'}).status_code==429

def test_demo_is_explicit_and_oidc_does_not_need_demo_code():
    validate_auth_configuration({'AUTH_MODE':'oidc'})
    validate_auth_configuration({'AUTH_MODE':'demo','SYNEX_ALLOW_DEMO':'true','DEMO_ACCESS_CODE':'test-only-demo-code'})

@pytest.mark.parametrize('mode',[None,'garbage'])
def test_actual_application_import_refuses_missing_or_invalid_mode(mode):
    import os,subprocess,sys
    env=dict(os.environ)
    if mode is None:env.pop('AUTH_MODE',None)
    else:env['AUTH_MODE']=mode
    result=subprocess.run([sys.executable,'-c','import app.main'],env=env,capture_output=True,text=True,timeout=15)
    assert result.returncode!=0
    assert 'AUTH_MODE must be explicitly set' in result.stderr
