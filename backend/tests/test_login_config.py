import json
import pytest
from test_health import client
from app.services.login_config import public_login_config


def configured():
    return {'OIDC_ISSUER': 'https://login.example.test/', 'OIDC_CLIENT_ID': 'web-client',
            'OIDC_NATIVE_CLIENT_ID': 'native-client', 'OIDC_AUDIENCE': 'synex-api',
            'OIDC_REDIRECT_URLS': json.dumps(['https://health.example.test/auth/callback',
                                            'com.synex.health://auth/callback'])}


def test_public_settings_allowlist(client, monkeypatch):
    for key, value in configured().items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv('OIDC_CLIENT_SECRET', 'must-not-be-returned')
    monkeypatch.setenv('OIDC_REFRESH_ENABLED', 'true')
    result = client.get('/api/auth/config')
    assert result.status_code == 200
    data = result.json()
    assert data['configured'] and data['provider']['refresh_enabled']
    assert data['provider']['native_client_id'] == 'native-client'
    assert data['provider']['issuer'].endswith('/')
    assert 'must-not-be-returned' not in result.text
    assert set(data['provider']) == {'issuer', 'client_id', 'native_client_id', 'audience', 'redirect_urls', 'refresh_enabled'}


@pytest.mark.parametrize('key,value', [('OIDC_ISSUER', 'http://insecure.test'),
    ('OIDC_CLIENT_ID', ''), ('OIDC_AUDIENCE', ''), ('OIDC_REDIRECT_URLS', '{}'),
    ('OIDC_REDIRECT_URLS', '[123]'), ('OIDC_REDIRECT_URLS', 'invalid'),
    ('OIDC_REDIRECT_URLS', '["https://site.test/auth/callback?next=evil"]'),
    ('OIDC_REDIRECT_URLS', '["javascript://auth/callback"]')])
def test_incomplete_or_unsafe_settings_disabled(key, value):
    env = configured(); env[key] = value
    assert public_login_config(env) == {'configured': False, 'provider': None}


def test_local_callback_development_only():
    env = configured(); env['OIDC_REDIRECT_URLS'] = '["http://localhost:5173/auth/callback"]'
    assert public_login_config(env)['configured']
    env['APP_ENV'] = 'production'
    assert not public_login_config(env)['configured']


def test_general_and_school_login_coexist(monkeypatch):
    import jwt
    from app.services import auth
    monkeypatch.setenv('AUTH_MODE', 'oidc')
    monkeypatch.setenv('OIDC_ISSUER', 'https://general.test/')
    monkeypatch.setenv('OIDC_AUDIENCE', 'api')
    monkeypatch.setenv('SCHOOL_OIDC_CONFIG', '[]')
    monkeypatch.setattr(auth, 'verify_oidc_token', lambda token, issuer, audience: auth.User('general-user', 'student'))
    monkeypatch.setattr(auth, '_account_active', lambda actor: actor)
    token = jwt.encode({'iss': 'https://general.test/'}, 'test-key', algorithm='HS256')
    result = auth.get_current_user(authorization='Bearer '+token, synex_health_auth_session=None, x_synex_demo_user=None)
    assert result.id == 'general-user'


def test_exact_trailing_slash_issuer_and_signed_token(monkeypatch):
    import time
    import jwt
    import httpx
    from cryptography.hazmat.primitives.asymmetric import rsa
    from app.services.auth import verify_oidc_token
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
    jwk['kid'] = 'login-test'
    issuer = 'https://id.example.test/'
    urls = []
    class Client:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def get(self, url):
            urls.append(url)
            data = {'issuer': issuer, 'jwks_uri': issuer+'keys'} if url.endswith('openid-configuration') else {'keys': [jwk]}
            return httpx.Response(200, json=data, request=httpx.Request('GET', url))
        def close(self): pass
    monkeypatch.setattr(httpx, 'Client', Client)
    token = jwt.encode({'sub': 'new-user', 'iss': issuer, 'aud': 'health-api', 'exp': time.time()+60},
                       key, algorithm='RS256', headers={'kid': 'login-test'})
    assert verify_oidc_token(token, issuer, 'health-api').id == 'new-user'
    assert urls[0] == issuer+'.well-known/openid-configuration'
    assert verify_oidc_token(token, issuer, 'health-api').id == 'new-user'
    assert len(urls) == 2
    with pytest.raises(jwt.InvalidAudienceError):
        verify_oidc_token(token, issuer, 'wrong-api')


def test_release_rejects_missing_public_client_configuration():
    from app.services.release_config import validate_production
    with pytest.raises(RuntimeError, match='OIDC_CLIENT_ID'):
        validate_production({'APP_ENV': 'production', 'OIDC_ISSUER': 'https://id.test/', 'OIDC_AUDIENCE': 'api'})
