import hashlib
import pytest
from test_health import client
from app.services.release_config import validate_production

def test_production_config_fails_closed():
 with pytest.raises(RuntimeError,match='AUTH_MODE'):validate_production({'APP_ENV':'production','AUTH_MODE':'demo'})
 validate_production({'APP_ENV':'development'})

def test_review_requires_configuration_and_password(client,monkeypatch):
 assert client.post('/api/auth/review',json={'username':'review','password':'wrong'}).status_code==404
 monkeypatch.setenv('APP_REVIEW_MODE','true');monkeypatch.setenv('APP_REVIEW_USERNAME','review');monkeypatch.setenv('APP_REVIEW_SALT','test-salt')
 monkeypatch.setenv('APP_REVIEW_PASSWORD_HASH',hashlib.pbkdf2_hmac('sha256',b'test-only-password',b'test-salt',600000).hex())
 assert client.post('/api/auth/review',json={'username':'review','password':'wrong'}).status_code==401
 token=client.post('/api/auth/review',json={'username':'review','password':'test-only-password'}).json()['access_token']
 monkeypatch.setenv('AUTH_MODE','oidc')
 headers={'Authorization':'Bearer '+token}
 profile=client.get('/api/health/profile',headers=headers).json()
 assert profile['id']=='app-review-synthetic' and not profile['share_with_center']
 assert len(client.get('/api/body-composition',headers=headers).json())==2
 assert client.get('/api/advanced/pose',headers=headers).status_code==200
 assert client.post('/api/exercise-routines/generate',headers=headers).status_code==200
 assert client.post('/api/auth/logout',headers=headers).status_code==200
 assert client.get('/api/health/profile',headers=headers).status_code==401

def test_body_size_and_security_headers(client):
 r=client.post('/api/health-agent/chat',content=b'x'*(2*1024*1024+1))
 assert r.status_code==413
 assert client.get('/api/health/status').headers['x-content-type-options']=='nosniff'

def test_free_launch_disables_paid_mode(client,monkeypatch):
 monkeypatch.setenv('BILLING_MODE','demo');monkeypatch.setenv('LAUNCH_MODE','free')
 assert client.get('/api/billing/subscription').json()['mode']=='disabled'


def test_status_does_not_claim_configured_without_contract(client):
 assert client.get('/api/health/status').json()['providers']['inbody']=='not_configured'
