"""Optional bounded login sessions; no IdP refresh tokens are stored."""
import os
import secrets
import re
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Header, Request
from pydantic import BaseModel
from .auth import (AUTH_SESSIONS, AUTH_SESSION_TTL_SECONDS, User, get_current_user,
                   session_storage_key, create_auth_session, DEMO_USERS, _account_active)

router = APIRouter(prefix='/api/auth')
COOKIE = 'synex_health_auth_session'

class SessionRequest(BaseModel):
    remember: bool = False
    transport: Literal['web', 'native'] = 'web'

def clear_session(response, cookie=None, bearer=None):
    with AUTH_SESSIONS._connect() as db:
        for token in (cookie, bearer):
            if isinstance(token, str) and (token.startswith('synex-session.') or re.fullmatch(r'[A-Za-z0-9_-]{32}', token)):
                db.execute('DELETE FROM auth_sessions WHERE session_id=?', (session_storage_key(token),))
    response.delete_cookie(COOKIE, secure=True, httponly=True, samesite='lax')

@router.post('/session')
def establish(req: SessionRequest, response: Response, user: User = Depends(get_current_user),
              authorization: str = Header(default=''), synex_health_auth_session: str = Cookie(default=None)):
    # Only a freshly verified IdP JWT can create a session, never an existing session/review token.
    token = authorization.removeprefix('Bearer ').removeprefix('bearer ')
    if not authorization.lower().startswith('bearer ') or os.getenv('AUTH_MODE') != 'oidc' or token.count('.') != 2 or token.startswith('synex-session.'):
        raise HTTPException(401, '새로운 계정 로그인이 필요합니다.')
    # Privileged accounts retain IdP token verification on every request.
    if req.remember and user.role != 'student':
        raise HTTPException(403, '관리 계정은 로그인 유지 기능을 사용할 수 없습니다.')
    from .audit import AuditStore
    AuditStore().record(user.id,'login',{'transport':req.transport},user_id=user.id,role=user.role)
    clear_session(response, synex_health_auth_session)
    if not req.remember: return {'remembered': False}
    session = 'synex-session.' + secrets.token_urlsafe(32)
    AUTH_SESSIONS.put(session_storage_key(session), user_id=user.id, role=user.role)
    result = {'remembered': True, 'expires_in': AUTH_SESSION_TTL_SECONDS}
    if req.transport == 'native':
        result['session_token'] = session
    else:
        response.set_cookie(COOKIE, session, max_age=AUTH_SESSION_TTL_SECONDS,
                            secure=True, httponly=True, samesite='lax', path='/')
    return result

@router.delete('/session')
def forget(response: Response, synex_health_auth_session: str = Cookie(default=None),
           authorization: str = Header(default='')):
    # Works for expired sessions too. Possession only permits revoking that exact session.
    bearer = authorization.split(' ', 1)[1] if authorization.lower().startswith('bearer ') else None
    clear_session(response, synex_health_auth_session, bearer)
    return {'forgotten': True}


class DemoLoginRequest(BaseModel):
    demo_user_id: str
    transport: Literal['web', 'native'] = 'web'


@router.post('/demo-login')
def demo_login(req: DemoLoginRequest, request: Request, response: Response):
    if os.getenv('AUTH_MODE', 'demo').lower() != 'demo':
        raise HTTPException(404, 'Demo login disabled')
    if req.demo_user_id not in DEMO_USERS:
        raise HTTPException(422, 'Unknown demo account')
    actor = _account_active(User(req.demo_user_id, DEMO_USERS[req.demo_user_id]['role']))
    token = create_auth_session(user_id=actor.id, role=actor.role)
    result = {'expires_in': AUTH_SESSION_TTL_SECONDS, 'id': actor.id, 'role': actor.role}
    if req.transport == 'native':
        result['session_token'] = token
    else:
        # Local HTTP demos work; HTTPS deployments retain Secure cookies like OIDC sessions.
        response.set_cookie(COOKIE, token, max_age=AUTH_SESSION_TTL_SECONDS,
                            secure=request.url.scheme == 'https', httponly=True, samesite='lax', path='/')
    return result
