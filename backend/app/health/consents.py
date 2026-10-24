"""Versioned, append-only processing consent; school sharing remains independent."""
import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, StrictBool
from ..services.auth import get_current_user, User
from .store import now

CONSENT_VERSION = '2026-10-24.1'
KINDS = ('privacy_collection', 'sensitive_health')
router = APIRouter(prefix='/api/consents')

def health_store():
    from .router import store
    return store

def under_age(user):
    if not user or not user.birth_date:
        return False
    born = date.fromisoformat(str(user.birth_date))
    today = date.today()
    return today.year - born.year - ((today.month,today.day) < (born.month,born.day)) < 14

def consent_status(store, uid):
    with store.connect() as db:
        rows = db.execute('SELECT kind,version,granted,age_14_or_over,created_at FROM processing_consents WHERE user_id=? ORDER BY sequence', (uid,)).fetchall()
    history = [dict(kind=r[0],version=r[1],granted=bool(r[2]),age_14_or_over=bool(r[3]),timestamp=r[4]) for r in rows]
    latest = {row['kind']:row for row in history}
    active = all(latest.get(k,{}).get('granted') and latest[k]['version']==CONSENT_VERSION and latest[k]['age_14_or_over'] for k in KINDS)
    return {'version':CONSENT_VERSION,'active':bool(active and not under_age(store.get_user(uid))), 'history':history,
            'retention_policy':os.getenv('RETENTION_POLICY',''), 'operator':os.getenv('LEGAL_OPERATOR',''), 'support_email':os.getenv('SUPPORT_EMAIL','')}

def ensure_consent(uid, store=None):
    if not consent_status(store or health_store(),uid)['active']:
        raise HTTPException(403, {'code':'SENSITIVE_CONSENT_REQUIRED','message':'건강정보 저장·분석을 위해 현재 버전의 별도 동의가 필요합니다.'})

def record(store, uid, kinds, granted, age):
    with store.connect() as db:
        for kind in kinds:
            db.execute('INSERT INTO processing_consents (user_id,kind,version,granted,age_14_or_over,created_at) VALUES (?,?,?,?,?,?)',
                       (uid,kind,CONSENT_VERSION,int(granted),int(age),now()))

class ConsentGrant(BaseModel):
    privacy_collection: StrictBool = False
    sensitive_health: StrictBool = False
    age_14_or_over: StrictBool = False
    version: str = CONSENT_VERSION

@router.get('')
def status(user:User=Depends(get_current_user)):
    return consent_status(health_store(),user.id)

@router.post('')
def grant(req:ConsentGrant,user:User=Depends(get_current_user)):
    store=health_store()
    if not all((req.privacy_collection,req.sensitive_health,req.age_14_or_over)):
        raise HTTPException(422,'세 항목을 각각 확인하고 동의해 주세요.')
    if req.version != CONSENT_VERSION:
        raise HTTPException(409,'동의 내용이 변경되었습니다. 다시 확인해 주세요.')
    if under_age(store.get_user(user.id)):
        raise HTTPException(403,'만 14세 미만은 현재 서비스를 이용할 수 없습니다. 보호자 동의 절차는 제공하지 않습니다.')
    if not os.getenv('RETENTION_POLICY','').strip():
        raise HTTPException(503,'운영자의 건강정보 보유 기간 설정이 필요합니다.')
    record(store,user.id,KINDS,True,True)
    return consent_status(store,user.id)

@router.post('/withdraw')
def withdraw(user:User=Depends(get_current_user)):
    store=health_store()
    record(store,user.id,('sensitive_health',),False,False)
    return {**consent_status(store,user.id),'message':'민감정보 동의를 철회했습니다. 새 저장·자동 연동·상담사 조회를 중지합니다. 기존 기록은 삭제하지 않으며 개인정보 화면에서 삭제할 수 있습니다.'}
