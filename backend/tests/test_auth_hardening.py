import json
import time
import pytest
from fastapi import HTTPException
from test_health import client


def test_empty_disconnected_and_malformed_school_config_cannot_launch():
    from app.services.release_config import validate_production
    for value in ('[]', '{}', '[null]', 'bad', '[{"school_id":"s","issuer":"https://id.test","client_id":"c","audience":"a","redirect_url":"https://app.test/auth/callback","status":"pending"}]'):
        with pytest.raises(RuntimeError, match='usable OIDC'):
            validate_production({'APP_ENV':'production','AUTH_MODE':'oidc','SCHOOL_OIDC_CONFIG':value})


def test_cached_keys_rotation_expiry_and_failed_fetch_are_bounded(monkeypatch):
    import httpx
    import jwt
    from cryptography.hazmat.primitives.asymmetric import rsa
    from app.services.oidc_keys import IssuerKeys
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    jwk=json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()));jwk['kid']='one'
    keys=[jwk];requests=[];clock=[1000];fail=[False]
    monkeypatch.setattr('app.services.oidc_keys.time.monotonic',lambda:clock[0])
    class Client:
        def __init__(self,**kwargs):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def get(self,url):
            requests.append(url)
            if fail[0]:raise httpx.ConnectError('offline')
            data={'issuer':'https://id.test/','jwks_uri':'https://id.test/keys'} if url.endswith('openid-configuration') else {'keys':keys}
            return httpx.Response(200,json=data,request=httpx.Request('GET',url))
    monkeypatch.setattr(httpx,'Client',Client)
    cache=IssuerKeys('https://id.test/')
    for _ in range(20):assert cache.signing_key('one').key_id=='one'
    assert len(requests)==2
    keys.append({**jwk,'kid':'two'})
    assert cache.signing_key('two').key_id=='two'
    assert len(requests)==4
    for n in range(20):
        with pytest.raises(HTTPException):cache.signing_key('unknown'+str(n))
    assert len(requests)==4
    clock[0]+=301;fail[0]=True
    for _ in range(10):
        with pytest.raises(HTTPException) as err:cache.signing_key('one')
        assert err.value.status_code==503
    assert len(requests)==5
    clock[0]+=31;fail[0]=False
    assert cache.signing_key('two').key_id=='two'


def setup_login(client,monkeypatch):
    import jwt
    from app.services import auth
    client.base_url='https://testserver'
    monkeypatch.setenv('AUTH_MODE','oidc')
    monkeypatch.setenv('OIDC_ISSUER','https://id.test/')
    monkeypatch.setenv('OIDC_AUDIENCE','api')
    monkeypatch.setattr(auth,'verify_oidc_token',lambda *args:auth.User('session-user','student'))
    token=jwt.encode({'iss':'https://id.test/','sub':'session-user','exp':time.time()+60},'test-only',algorithm='HS256')
    return {'Authorization':'Bearer '+token},auth


def test_web_cookie_restores_expires_and_requires_csrf_origin(client,monkeypatch):
    headers,auth=setup_login(client,monkeypatch)
    result=client.post('/api/auth/session',headers=headers,json={'remember':True})
    assert result.status_code==200 and 'session_token' not in result.json()
    cookie=result.headers['set-cookie']
    assert 'HttpOnly' in cookie and 'Secure' in cookie and 'Max-Age=28800' in cookie and 'SameSite=lax' in cookie
    assert client.get('/api/health/profile').json()['id']=='session-user'
    assert client.put('/api/health/profile',json={'name':'attacker'}).status_code==403
    assert client.put('/api/health/profile',headers={'Origin':'https://evil.test','Authorization':'nonsense'},json={'name':'attacker'}).status_code==403
    assert client.post('/api/auth/session',headers={'Origin':'http://localhost:5173','Authorization':'fake.has.dots'},json={'remember':True}).status_code==401
    raw=client.cookies.get('synex_health_auth_session')
    with auth.AUTH_SESSIONS._connect() as db:
        assert db.execute('SELECT session_id FROM auth_sessions WHERE session_id=?',(raw,)).fetchone() is None
        db.execute('UPDATE auth_sessions SET created_at_ts=?',(time.time()-28801,))
    assert client.get('/api/health/profile').status_code==401
    assert client.delete('/api/auth/session',headers={'Origin':'http://localhost:5173'}).status_code==200
    assert not client.cookies.get('synex_health_auth_session')


def test_native_session_revoked_on_logout_cannot_extend_itself(client,monkeypatch):
    headers,auth=setup_login(client,monkeypatch)
    response=client.post('/api/auth/session',headers=headers,json={'remember':True,'transport':'native'})
    token=response.json()['session_token']
    native={'Authorization':'Bearer '+token}
    assert client.get('/api/health/profile',headers=native).json()['id']=='session-user'
    digest=auth.session_storage_key(token)
    assert auth.AUTH_SESSIONS.get(digest) is None
    assert client.get('/api/health/profile',headers={'Authorization':'Bearer '+digest}).status_code==401
    assert client.post('/api/auth/session',headers=native,json={'remember':True,'transport':'native'}).status_code==401
    assert client.post('/api/auth/logout',headers=native).status_code==200
    assert client.get('/api/health/profile',headers=native).status_code==401


def test_opt_out_clears_existing_cookie_and_no_new_session(client,monkeypatch):
    headers,auth=setup_login(client,monkeypatch)
    client.post('/api/auth/session',headers=headers,json={'remember':True})
    response=client.post('/api/auth/session',headers=headers,json={'remember':False})
    assert response.json()=={'remembered':False}
    assert client.get('/api/health/profile').status_code==401
    with auth.AUTH_SESSIONS._connect() as db:
        assert not db.execute('SELECT session_id FROM auth_sessions').fetchall()


def test_admin_cannot_persist_role(client,monkeypatch):
    headers,auth=setup_login(client,monkeypatch)
    monkeypatch.setattr(auth,'verify_oidc_token',lambda *args:auth.User('admin','admin'))
    assert client.post('/api/auth/session',headers=headers,json={'remember':True}).status_code==403
