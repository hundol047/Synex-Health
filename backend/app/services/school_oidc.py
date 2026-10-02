"""Deployment-managed IdP allowlist; selecting a school never authenticates a user."""
import os,json,hashlib
from fastapi import HTTPException

def configurations(env=None):
    e=os.environ if env is None else env
    try:items=json.loads(e.get('SCHOOL_OIDC_CONFIG','[]'))
    except ValueError:raise HTTPException(503,'학교 SSO 설정 오류')
    if not isinstance(items,list):raise HTTPException(503,'학교 SSO 설정 오류')
    valid=[]
    for item in items:
        if not isinstance(item, dict) or not all(isinstance(item.get(k),str) and item[k] for k in ('school_id','issuer','client_id','audience','redirect_url')) or not item['issuer'].startswith('https://'):
            raise HTTPException(503,'학교 SSO 설정 오류')
        if item.get('status')=='connected':
            from .login_config import public_login_config
            probe={**e,'OIDC_ISSUER':item['issuer'],'OIDC_CLIENT_ID':item['client_id'],'OIDC_AUDIENCE':item['audience'],'OIDC_REDIRECT_URLS':json.dumps([item['redirect_url']])}
            if not public_login_config(probe)['configured']:raise HTTPException(503,'학교 SSO redirect 설정 오류')
            valid.append(item)
    if len({i['issuer'] for i in valid})!=len(valid):raise HTTPException(503,'학교 issuer는 고유해야 합니다.')
    return valid

def verify_school_token(token):
    import jwt
    from .auth import verify_oidc_token, User
    # Unverified issuer only selects among server-managed allowlist; it grants no identity.
    claims=jwt.decode(token,options={'verify_signature':False})
    config=next((c for c in configurations() if c['issuer']==claims.get('iss')),None)
    if not config:raise HTTPException(401,'등록되지 않은 학교 인증 서버입니다.')
    verified=verify_oidc_token(token,config['issuer'],config['audience'],config.get('role_claim','role'))
    uid='oidc-'+hashlib.sha256((config['issuer']+'|'+verified.id).encode()).hexdigest()
    # Privileged roles come only from deployment managed mappings, never generic campus role claims.
    role=config.get('staff_subjects',{}).get(verified.id,'student')
    if role not in ('student','counselor','admin'):role='student'
    return User(uid,role),config['school_id']
