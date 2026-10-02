"""Public login settings. Secrets and staff mappings must never reach clients."""
import json
import os
from urllib.parse import urlparse


def public_login_config(env=None):
    e = os.environ if env is None else env
    issuer = e.get('OIDC_ISSUER', '').strip()
    client = e.get('OIDC_CLIENT_ID', '').strip()
    audience = e.get('OIDC_AUDIENCE', '').strip()
    try:
        parsed = urlparse(issuer)
        if not parsed.hostname: return {'configured': False, 'provider': None}
    except ValueError:
        return {'configured': False, 'provider': None}
    try:
        redirects = json.loads(e.get('OIDC_REDIRECT_URLS', '[]'))
    except (ValueError, TypeError):
        redirects = None
    valid_redirects = isinstance(redirects, list) and bool(redirects) and all(
        isinstance(url, str) and _valid_redirect(url, e.get('APP_ENV') == 'production')
        for url in redirects
    )
    ready = bool(parsed.scheme == 'https' and parsed.hostname and not parsed.username
                 and not parsed.password and not parsed.query and not parsed.fragment
                 and client and audience and valid_redirects)
    if not ready:
        return {'configured': False, 'provider': None}
    return {'configured': True, 'provider': {
        'issuer': issuer, 'client_id': client,
        'native_client_id': e.get('OIDC_NATIVE_CLIENT_ID', '').strip() or client,
        'audience': audience, 'redirect_urls': redirects,
        'refresh_enabled': e.get('OIDC_REFRESH_ENABLED') == 'true',
    }}


def _valid_redirect(value, production):
    try:
        u = urlparse(value)
    except ValueError:
        return False
    if u.username or u.password or u.query or u.fragment or '*' in value:
        return False
    if u.path != '/auth/callback' and not (u.netloc == 'auth' and u.path == '/callback'):
        return False
    if u.scheme == 'https':
        return bool(u.hostname)
    if u.scheme == 'http':
        return not production and u.hostname in ('localhost', '127.0.0.1')
    return '.' in u.scheme and u.netloc == 'auth' and u.path == '/callback'
