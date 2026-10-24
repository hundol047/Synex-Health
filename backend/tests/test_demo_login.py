import pytest
from test_health import client

@pytest.mark.parametrize('identity', ['student-jimin','counselor-demo','admin-demo','forged'])
def test_header_without_session_is_rejected(client, identity):
    client.headers.pop('Authorization',None)
    client.cookies.clear()
    assert client.get('/api/body-composition/latest',headers={'X-Synex-Demo-User':identity}).status_code == 401
    assert client.post('/api/body-composition',headers={'X-Synex-Demo-User':identity},json={'measurement_date':'2026-01-01','weight':60}).status_code == 401
    assert client.get('/api/counselor/students',headers={'X-Synex-Demo-User':identity}).status_code == 401

@pytest.mark.parametrize('identity,role', [('student-jimin','student'),('counselor-demo','counselor'),('admin-demo','admin')])
@pytest.mark.parametrize('transport',['web','native'])
def test_session_transport_and_permissions(client,identity,role,transport):
    client.headers.pop('Authorization',None)
    response=client.post('/api/auth/demo-login',json={'demo_user_id':identity,'transport':transport})
    assert response.status_code == 200
    assert response.json()['role'] == role
    if transport=='web':
        assert 'session_token' not in response.json()
        assert 'HttpOnly' in response.headers['set-cookie']
        assert 'SameSite=lax' in response.headers['set-cookie']
        headers={'Origin':'http://localhost:5173'}
    else:
        assert 'set-cookie' not in response.headers
        headers={'Authorization':'Bearer '+response.json()['session_token']}
    # A spoofed header cannot change the logged-in identity or permissions.
    headers['X-Synex-Demo-User']='admin-demo'
    me=client.get('/api/health/profile',headers=headers)
    assert me.status_code==200 and me.json()['id']==identity
    assert client.get('/api/counselor/students',headers=headers).status_code==(403 if role=='student' else 200)
    assert client.delete('/api/auth/session',headers=headers).status_code==200
    assert client.get('/api/health/profile',headers=headers).status_code==401

def test_login_allowlist_and_oidc_gate(client,monkeypatch):
    assert client.post('/api/auth/demo-login',json={'demo_user_id':'unlisted'}).status_code==422
    monkeypatch.setenv('AUTH_MODE','oidc')
    assert client.post('/api/auth/demo-login',json={'demo_user_id':'student-jimin'}).status_code==404

def test_expired_session_is_rejected(client,monkeypatch):
    from app.services import auth
    monkeypatch.setattr(auth,'AUTH_SESSION_TTL_SECONDS',-1)
    assert client.get('/api/health/profile').status_code==401
