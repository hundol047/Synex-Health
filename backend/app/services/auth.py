"""Authentication + RBAC for Synex Health.

Adapted from SynexAgent's auth.py (backend/app/services/auth.py in the SynexAgent / YMAS-GPT-6-Astra
repository) -- same session-cookie-over-bearer-token shape, same AUTH_MODE=demo/oidc split -- but with
Health's own role set (student/counselor/admin) instead of Clinical's (clinician/pharmacist/admin).

AUTH_MODE=demo (default): identity comes from the X-Synex-Demo-User header (falls back to
SYNEX_DEMO_USER_ID/SYNEX_DEMO_ROLE env vars, then the bundled demo student) -- this lets the demo
frontend switch between the seeded demo student and the demo counselor without a real login flow,
while still exercising the same RBAC checks every write path uses.

AUTH_MODE=oidc: real OIDC bearer-token verification (JWKS fetch + PyJWT), identical mechanism to
SynexAgent's -- unverified against a real campus SSO/IdP from this environment; see module docstring
parity note in SynexAgent's auth.py for the same caveat.

RBAC roles:
  - student: read/write their own health profile, measurements (via provider import), routines,
    workouts, and chat with the Health Agent. Cannot read another student's data.
  - counselor: read-only across the student roster assigned to the health center, plus write access
    to counselor notes. Never sees Clinical Agent / EMR data (this app does not expose it).
  - admin: everything, plus reference-range management (ReferenceRange CRUD) and user administration.
"""
import os, secrets, sqlite3, time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from fastapi import Cookie, Header, HTTPException, Depends

_READ_ACTIONS = {'health:read', 'measurement:read', 'routine:read', 'workout:read'}
_STUDENT_WRITE_ACTIONS = {'health:write', 'measurement:write', 'routine:write', 'workout:write', 'agent:chat'}
ROLE_PERMISSIONS = {
    'student': _READ_ACTIONS | _STUDENT_WRITE_ACTIONS,
    'counselor': {'roster:read', 'measurement:read', 'routine:read', 'workout:read', 'health:read',
                  'counselor_note:write', 'agent:chat'},
    'admin': _READ_ACTIONS | _STUDENT_WRITE_ACTIONS | {'roster:read', 'counselor_note:write',
                                                          'reference_range:write', 'user:admin'},
}
NEVER_GRANTED = {'measurement:fabricate', 'diagnosis:confirm'}


@dataclass
class User:
    id: str
    role: str
    def can(self, action: str) -> bool:
        if action in NEVER_GRANTED:
            return False
        return action in ROLE_PERMISSIONS.get(self.role, set())


DEMO_USERS = {
    'student-jimin': {'role': 'student', 'display_name': '김지민'},
    'counselor-demo': {'role': 'counselor', 'display_name': '건강센터 상담사'},
    'admin-demo': {'role': 'admin', 'display_name': '관리자'},
}


def verify_oidc_token(token: str, issuer: str, audience: str, role_claim: str = 'role', jwks=None) -> User:
    import jwt
    from jwt import PyJWKSet
    import httpx

    class _JWKS:
        def __init__(self, issuer):
            self.issuer = issuer.rstrip('/')
            self._client = httpx.Client(timeout=10)
            self._keys = None
            self._fetched_at = 0.0
        def keys(self):
            if self._keys is None or time.time() - self._fetched_at > 3600:
                cfg = self._client.get(f'{self.issuer}/.well-known/openid-configuration').json()
                self._keys = self._client.get(cfg['jwks_uri']).json()['keys']
                self._fetched_at = time.time()
            return self._keys
    jwks = jwks or _JWKS(issuer)
    header = jwt.get_unverified_header(token)
    key_set = PyJWKSet.from_dict({'keys': jwks.keys()})
    signing_key = next((k for k in key_set.keys if k.key_id == header.get('kid')), None)
    if signing_key is None:
        raise HTTPException(401, 'No matching JWKS key for token')
    claims = jwt.decode(token, key=signing_key.key, algorithms=['RS256', 'ES256'], options={'require': ['sub', 'exp', 'iss', 'aud']},
                         audience=audience, issuer=issuer)
    role = claims.get(role_claim)
    if isinstance(role, list):
        role = role[0] if role else None
    if role not in ROLE_PERMISSIONS:
        role = 'student'
    return User(id=str(claims.get('sub', 'unknown')), role=role)


AUTH_SESSION_TTL_SECONDS = 8 * 3600


class _AuthSessionStore:
    def __init__(self, path=None):
        self.database=None
        if path is None and os.getenv('DATABASE_URL'):
            from .persistence import Database
            self.database=Database(os.environ['DATABASE_URL'],'health_auth')
        self.path = str(path or os.getenv('SYNEX_HEALTH_AUTH_SESSION_PATH',
                         Path(__file__).resolve().parents[2] / 'data' / 'auth_session.sqlite3'))
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS auth_sessions (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, '
                       'role TEXT NOT NULL, created_at_ts REAL NOT NULL)')

    @contextmanager
    def _connect(self):
        if self.database:
            with self.database.connect() as db:yield db
            return
        db = sqlite3.connect(self.path, timeout=15)
        try:
            with db:
                yield db
        finally:
            db.close()

    def put(self, session_id, *, user_id, role):
        with self._connect() as db:
            db.execute('INSERT OR REPLACE INTO auth_sessions VALUES (?,?,?,?)', (session_id, user_id, role, time.time()))
            db.execute('DELETE FROM auth_sessions WHERE created_at_ts < ?', (time.time() - AUTH_SESSION_TTL_SECONDS,))

    def get(self, session_id) -> Optional['User']:
        with self._connect() as db:
            row = db.execute('SELECT user_id, role, created_at_ts FROM auth_sessions WHERE session_id=?', (session_id,)).fetchone()
            if row is None:
                return None
            user_id, role, created_at_ts = row
            if time.time() - created_at_ts >= AUTH_SESSION_TTL_SECONDS:
                db.execute('DELETE FROM auth_sessions WHERE session_id=?', (session_id,))
                return None
        return User(id=user_id, role=role)


AUTH_SESSIONS = _AuthSessionStore()


def create_auth_session(*, user_id, role) -> str:
    session_id = secrets.token_urlsafe(24)
    AUTH_SESSIONS.put(session_id, user_id=user_id, role=role)
    return session_id


def get_current_user(authorization: Optional[str] = Header(None),
                      synex_health_auth_session: Optional[str] = Cookie(default=None),
                      x_synex_demo_user: Optional[str] = Header(default=None)) -> User:
    """Demo-mode identity switch: the frontend's role switcher (student / counselor) sends
    X-Synex-Demo-User so the same browser session can preview both experiences without a real
    login flow -- this header is only honored when AUTH_MODE=demo; in AUTH_MODE=oidc it is
    ignored entirely and identity comes only from a verified token/session."""
    mode = os.getenv('AUTH_MODE', 'demo').lower()
    if mode not in ('demo', 'oidc'):
        raise HTTPException(503, 'Invalid authentication configuration')
    if mode == 'demo':
        demo_id = x_synex_demo_user or os.getenv('SYNEX_DEMO_USER_ID', 'student-jimin')
        info = DEMO_USERS.get(demo_id, DEMO_USERS['student-jimin'])
        return _account_active(User(id=demo_id, role=os.getenv('SYNEX_DEMO_ROLE', info['role'])))
    if authorization and authorization.lower().startswith('bearer '):
        try:
            token=authorization.split(' ',1)[1]
            if os.getenv('SCHOOL_OIDC_CONFIG'):
                from .school_oidc import verify_school_token
                actor,school_id=verify_school_token(token)
                return _account_active(actor,school_id)
            issuer,audience=os.environ['OIDC_ISSUER'],os.environ['OIDC_AUDIENCE']
            return _account_active(verify_oidc_token(token, issuer, audience))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(401, '유효하지 않은 인증 토큰입니다.')
    if synex_health_auth_session:
        user = AUTH_SESSIONS.get(synex_health_auth_session)
        if user is not None:
            return _account_active(user)
    raise HTTPException(401, 'Missing bearer token or a valid authenticated session cookie')


def require(action: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if not user.can(action):
            raise HTTPException(403, f'Role "{user.role}" is not permitted to {action}')
        return user
    return checker


def require_self_or_counselor(student_id: str, user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency (used as `Depends(require_self_or_counselor)`, not called with args --
    FastAPI resolves `student_id` itself from the enclosing route's path parameter of the same
    name). A student may only read/write their own records; counselor/admin may access any
    student's."""
    if user.role == 'student' and user.id != student_id:
        raise HTTPException(403, 'Students may only access their own health records')
    if user.role not in ('student', 'counselor', 'admin'):
        raise HTTPException(403, 'Not permitted')
    return user


def _account_active(actor, school_id=None):
    from ..health.router import store
    from ..health.schemas import HealthUser
    with store.connect() as db:
        deleted=db.execute('SELECT user_id FROM deleted_accounts WHERE user_id=?',(actor.id,)).fetchone()
    if deleted:raise HTTPException(401,'삭제된 계정입니다.')
    if school_id:
        u=store.get_user(actor.id) or HealthUser(id=actor.id,name='사용자',role=actor.role)
        if u.school_id!=school_id:u.share_with_center=False
        u.school_id=school_id;u.role=actor.role;store.upsert_user(u)
        store.save_preference(actor.id,'membership',{'school_id':school_id,'verified':True})
    return actor
