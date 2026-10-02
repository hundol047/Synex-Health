"""Optional bounded login sessions; no IdP refresh tokens are stored."""
import os
import secrets
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Header
from pydantic import BaseModel
from .auth import (AUTH_SESSIONS, AUTH_SESSION_TTL_SECONDS, User, get_current_user,
                   session_storage_key)

router = APIRouter(prefix='/api/auth')
COOKIE = 'synex_health_auth_session'

class SessionRequest(BaseModel):
    remember: bool = False
    transport: Literal['web', 'native'] = 'web'

def clear_session(response, cookie=None, bearer=None):
    with AUTH_SESSIONS._connect() as db:
        for token in (cookie, bearer):
            if isinstance(token, str) and token.startswith('synex-session.'):
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
