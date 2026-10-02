"""Bounded per-issuer JWKS cache with single-flight fetch and rotation cooldown."""
import time
from functools import lru_cache
from threading import RLock
import httpx
from fastapi import HTTPException
from jwt import PyJWKSet

TTL = 300
RETRY_DELAY = 30

class IssuerKeys:
    def __init__(self, issuer):
        self.issuer = issuer
        self.keys = None
        self.expires = 0
        self.last_attempt = float('-inf')
        self.last_rotation = float('-inf')
        self.lock = RLock()

    def fetch(self):
        self.last_attempt = time.monotonic()
        try:
            with httpx.Client(timeout=10, follow_redirects=False) as client:
                response = client.get(self.issuer.rstrip('/')+'/.well-known/openid-configuration')
                response.raise_for_status()
                config = response.json()
                if config.get('issuer') != self.issuer or not config.get('jwks_uri', '').startswith('https://'):
                    raise ValueError('Invalid discovery')
                response = client.get(config['jwks_uri'])
                response.raise_for_status()
                keys = PyJWKSet.from_dict(response.json()).keys
                if not keys: raise ValueError('Empty signing keys')
            self.keys = keys
            self.expires = time.monotonic() + TTL
        except Exception as exc:
            raise HTTPException(503, '인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.') from exc

    def signing_key(self, kid):
        if not isinstance(kid, str) or not kid or len(kid) > 256:
            raise HTTPException(401, 'Invalid token key ID')
        with self.lock:
            now = time.monotonic()
            fetched = False
            if self.keys is None or now >= self.expires:
                if now - self.last_attempt < RETRY_DELAY:
                    raise HTTPException(503, '인증 서버를 다시 확인하는 중입니다.')
                self.fetch(); fetched = True
            key = next((key for key in self.keys if key.key_id == kid), None)
            if key is None and not fetched and now - self.last_rotation >= RETRY_DELAY:
                self.last_rotation = now
                self.fetch()
                key = next((key for key in self.keys if key.key_id == kid), None)
            if key is None:
                raise HTTPException(401, 'No matching JWKS key for token')
            return key

@lru_cache(maxsize=32)
def issuer_keys(issuer):
    return IssuerKeys(issuer)
