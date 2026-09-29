"""Explicit authenticated review account; never a public production bypass."""
import os,hashlib,hmac,time
from fastapi import APIRouter,HTTPException,Depends,Response,Header
from pydantic import BaseModel,Field
from .auth import create_auth_session,get_current_user,AUTH_SESSIONS,User
router=APIRouter(prefix='/api/auth')
class Login(BaseModel):
 username:str=Field(max_length=200)
 password:str=Field(max_length=200)
@router.post('/review')
def review(req:Login):
 if os.getenv('APP_REVIEW_MODE')!='true':raise HTTPException(404)
 salt=os.getenv('APP_REVIEW_SALT','');expected=os.getenv('APP_REVIEW_PASSWORD_HASH','')
 digest=hashlib.pbkdf2_hmac('sha256',req.password.encode(),salt.encode(),600000).hex()
 if not expected or not hmac.compare_digest(req.username,os.getenv('APP_REVIEW_USERNAME','')) or not hmac.compare_digest(digest,expected):raise HTTPException(401,'로그인 정보를 확인하세요.')
 from ..health.router import store
 from ..health.schemas import HealthUser,ExerciseProfile
 from ..health.providers.mock import MockProvider
 uid='app-review-synthetic'
 with store.connect() as db:
  if db.execute('SELECT user_id FROM deleted_accounts WHERE user_id=?',(uid,)).fetchone():raise HTTPException(401,'삭제된 심사 계정입니다. 운영자에게 새 심사 환경을 요청하세요.')
 if not store.get_user(uid):store.upsert_user(HealthUser(id=uid,name='App Review · 가상 데이터',gender='female',height=165,share_with_center=False))
 if not store.get_profile(uid):store.upsert_profile(ExerciseProfile(user_id=uid))
 if not store.list_measurements(uid):MockProvider(store).seed_demo_readings(uid)
 return {'access_token':create_auth_session(user_id=uid,role='student'),'expires_in':28800,'synthetic':True}
@router.post('/logout')
def logout(response:Response,user:User=Depends(get_current_user),authorization:str=Header(default='')):
 with AUTH_SESSIONS._connect() as db:
  db.execute('DELETE FROM auth_sessions WHERE user_id=?',(user.id,))
  if authorization.lower().startswith('bearer '):
   token=authorization.split(' ',1)[1]
   expiry=time.time()+28800
   try:
    import jwt
    expiry=float(jwt.decode(token,options={'verify_signature':False})['exp'])
   except Exception:pass
   db.execute('INSERT OR REPLACE INTO revoked_tokens VALUES (?,?)',(hashlib.sha256(token.encode()).hexdigest(),expiry))
   db.execute('DELETE FROM revoked_tokens WHERE expires<?',(time.time(),))
 response.delete_cookie('synex_health_auth_session',secure=True,httponly=True,samesite='lax')
 return {'logged_out':True}
