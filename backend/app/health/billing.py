"""Subscriptions: server-verified RevenueCat entitlements, isolated demo mode."""
import os
import json
import secrets
import time
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Literal
from ..services.auth import get_current_user, User
from .router import store, audit

router = APIRouter(prefix='/api/billing', tags=['subscriptions'])



def mode():
    if os.getenv('LAUNCH_MODE')=='free':return 'disabled'
    value = os.getenv('BILLING_MODE', 'disabled')
    auth = os.getenv('AUTH_MODE', 'demo').lower()
    if value == 'demo' and auth == 'demo':
        return 'demo'
    if value == 'revenuecat' and auth == 'oidc' and os.getenv('REVENUECAT_SECRET_KEY'):
        return 'revenuecat'
    return 'disabled'


def purchase_config():
    apple=os.getenv('APPLE_PRODUCT_ID','').strip()
    google=os.getenv('GOOGLE_PRODUCT_ID','').strip()
    entitlement=os.getenv('ENTITLEMENT_ID',os.getenv('REVENUECAT_ENTITLEMENT','')).strip()
    return {'ready':bool(apple and google and entitlement and mode()=='revenuecat'),
            'apple_product_id':apple,'google_product_id':google,'entitlement_id':entitlement}


def account(uid):
    with store.connect() as db:
        db.execute('INSERT OR IGNORE INTO billing_accounts VALUES (?,?,?)', (uid, secrets.token_urlsafe(32), '{}'))
        row = db.execute('SELECT customer_id,payload FROM billing_accounts WHERE user_id=?', (uid,)).fetchone()
    return row[0], json.loads(row[1])


def save(uid, payload, expected=None):
    with store.connect() as db:
        if expected is None:
            db.execute('UPDATE billing_accounts SET payload=? WHERE user_id=?', (json.dumps(payload), uid))
            return True
        result=db.execute('UPDATE billing_accounts SET payload=? WHERE user_id=? AND payload=?', (json.dumps(payload),uid,json.dumps(expected)))
        return result.rowcount==1


def timestamp(value):
    if not value:
        return 0
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
    except (ValueError, TypeError):
        return 0


def refresh(uid):
    """Never trust customer IDs, plan names or receipts submitted by the client."""
    cid, before = account(uid)
    requested_at=time.time()
    try:
        response = httpx.get('https://api.revenuecat.com/v1/subscribers/' + quote(cid, safe=''),
                            headers={'Authorization': 'Bearer ' + os.environ['REVENUECAT_SECRET_KEY']}, timeout=10)
        response.raise_for_status()
        subscriber = response.json()['subscriber']
        entitlement = subscriber.get('entitlements', {}).get(os.getenv('ENTITLEMENT_ID',os.getenv('REVENUECAT_ENTITLEMENT', 'plus')), {})
        product = entitlement.get('product_identifier')
        subscription = subscriber.get('subscriptions', {}).get(product, {})
        expiry = timestamp(entitlement.get('expires_date'))
        grace = timestamp(subscription.get('grace_period_expires_date'))
        access_until=max(expiry,grace)
        allowed = set(os.getenv('REVENUECAT_PRODUCTS', 'synex_plus_monthly,synex_plus_yearly').split(','))
        environment='sandbox' if subscription.get('is_sandbox',False) else 'production'
        sandbox_ok = environment=='production' or (os.getenv('APP_ENV')!='production' and os.getenv('REVENUECAT_ALLOW_SANDBOX')=='true')
        revoked = bool(subscription.get('refunded_at'))
        active = bool(product in allowed and access_until > time.time() and subscription and sandbox_ok and not revoked)
        state=('refunded' if revoked else 'grace_period' if active and grace>time.time() else
               'billing_issue' if subscription.get('billing_issues_detected_at') else
               'expired' if product and not active else 'cancelled' if active and subscription.get('unsubscribe_detected_at') else
               'trial' if active and subscription.get('period_type')=='trial' else 'active' if active else 'free')
        payload = {'source': 'revenuecat', 'active': active, 'state':state,'expires_at': access_until,
                   'will_renew': active and not subscription.get('unsubscribe_detected_at') and not subscription.get('billing_issues_detected_at'),
                   'environment':environment,'store': subscription.get('store'), 'product': product, 'verified_at': requested_at}
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(503, '결제 상태 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.')
    if not save(uid, payload, expected=before):
        raise HTTPException(503, '결제 상태가 다른 요청에서 갱신되었습니다. 다시 확인해 주세요.')
    if before.get('state')!=payload['state'] or before.get('active')!=payload['active']:
        audit.record(uid,'subscription_change',{'state':payload['state'],'environment':payload['environment']},user_id=uid)
    return payload


def status(uid, verify=False):
    cid, payload = account(uid)
    if uid=='app-review-synthetic' and os.getenv('APP_REVIEW_MODE')=='true':
        return {'mode':'disabled','plan':'review','active':True,'demo':False,'review':True,'entitlements':{k:True for k in ('monthly_report','advanced_body','pose_coach','long_term_progress')}}
    current = mode()
    if current == 'revenuecat' and (verify or time.time() - payload.get('verified_at', 0) > 60):
        payload = refresh(uid)
    environment_ok=not (os.getenv('APP_ENV')=='production' and payload.get('environment')=='sandbox')
    active = bool(environment_ok and current != 'disabled' and payload.get('source') == current and payload.get('active') and payload.get('expires_at', 0) > time.time())
    return {'purchase_config':purchase_config(),'environment':payload.get('environment'),'mode': current, 'plan': 'plus' if active else 'free', 'active': active,
            'state':payload.get('state', 'active' if active and payload.get('will_renew') else 'cancelled' if active else 'free') if current!='disabled' else 'free',
            'expires_at': payload.get('expires_at') if active else None,
            'will_renew': bool(active and payload.get('will_renew')), 'store': payload.get('store') if active else None,
            'customer_id': cid if current == 'revenuecat' else None,
            'entitlements': {k:active for k in ('monthly_report','advanced_body','pose_coach','long_term_progress')}, 'demo': current == 'demo'}


@router.get('/plans')
def plans():
    return {'mode': mode(), 'plans': [
        {'id': 'free', 'name': 'Free', 'price_label': '무료', 'features': ['체성분 기록 · 3D 인체도', '맞춤 루틴 · 운동 동작 가이드', '학교 공유 설정 · 운동 기록']},
        {'id': 'plus', 'name': 'Plus', 'price_label': '스토어에서 가격 확인', 'features': ['Free의 모든 기능', 'Before/After 3D 비교 · 카메라 자세 코치', '월별 요약 리포트 · 장기 변화 분석', '웹에서 리포트 인쇄 · PDF 저장']}],
        'message': '요금은 연결된 스토어 상품의 실제 가격으로 표시합니다. 미연결 상태에서는 결제되지 않습니다.'}


@router.get('/subscription')
def subscription(user: User = Depends(get_current_user)):
    return status(user.id)


@router.post('/sync')
def sync(user: User = Depends(get_current_user)):
    return status(user.id, verify=True)


class DemoRequest(BaseModel):
    action: Literal['activate', 'cancel', 'expire', 'reset']


@router.post('/demo')
def demo(req: DemoRequest, user: User = Depends(get_current_user)):
    if mode() != 'demo':
        raise HTTPException(404, '데모 구독이 활성화되지 않았습니다.')
    _, payload = account(user.id)
    if req.action == 'activate':
        payload = {'source': 'demo', 'active': True, 'expires_at': time.time() + 30 * 86400, 'will_renew': True}
    elif req.action == 'cancel':
        payload['will_renew'] = False
    else:
        payload = {'source': 'demo', 'active': False, 'expires_at': 0, 'will_renew': False}
    save(user.id, payload)
    return status(user.id)


@router.post('/webhook/revenuecat')
def webhook(body: dict, authorization: str = Header(default='')):
    expected = os.getenv('REVENUECAT_WEBHOOK_AUTH', '')
    if mode() != 'revenuecat' or not expected:
        raise HTTPException(503, 'Webhook is not configured')
    if not secrets.compare_digest(expected, authorization):
        raise HTTPException(401, 'Invalid webhook authorization')
    event = body.get('event', {})
    if not isinstance(event, dict):
        raise HTTPException(422, 'Invalid event')
    if event.get('type') == 'TEST':
        return {'ok': True}
    event_id=event.get('id')
    if not isinstance(event_id,str) or not 1<=len(event_id)<=200:
        raise HTTPException(422,'Event ID required')
    with store.connect() as db:
        if db.execute('SELECT event_id FROM billing_webhook_events WHERE event_id=?',(event_id,)).fetchone():return {'ok':True,'duplicate':True}
    ids = [event.get('app_user_id'), event.get('original_app_user_id')]
    for key in ('aliases', 'transferred_from', 'transferred_to'):
        if isinstance(event.get(key), list):
            ids += event[key]
    ids = list({cid for cid in ids if isinstance(cid, str)})[:100]
    # Fetch the source of truth; duplicate and out-of-order events cannot directly grant access.
    for cid in ids:
        with store.connect() as db:
            row = db.execute('SELECT user_id FROM billing_accounts WHERE customer_id=?', (cid,)).fetchone()
        if row:
            refresh(row[0])
    with store.connect() as db:
        db.execute('INSERT OR IGNORE INTO billing_webhook_events VALUES (?,?,?)',(event_id,str(event.get('type','unknown')),datetime.now(timezone.utc).isoformat()))
    return {'ok': True}


@router.get('/report')
def report(month: str, user: User = Depends(get_current_user)):
    if not status(user.id)['active']:
        raise HTTPException(403, 'Plus 구독에서 월별 리포트를 이용할 수 있습니다.')
    try:
        start = date.fromisoformat(month + '-01')
        end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        if start > date.today():
            raise ValueError()
    except ValueError:
        raise HTTPException(422, '현재 또는 이전 월을 YYYY-MM 형식으로 입력하세요.')
    measurements = sorted([m for m in store.list_measurements(user.id) if start.isoformat() <= m.measurement_date < end.isoformat()], key=lambda m: m.measurement_date)
    workouts = [w for w in store.list_workouts(user.id) if start.isoformat() <= w.date < end.isoformat()]
    completed = [w for w in workouts if w.completed]
    changes = {}
    for key in ('weight', 'skeletal_muscle_mass', 'body_fat_percentage'):
        valid = [getattr(m, key) for m in measurements if getattr(m, key) is not None]
        changes[key] = round(valid[-1] - valid[0], 2) if len(valid) > 1 else None
    return {'month': month, 'measurement_count': len(measurements), 'completed_count': len(completed),
            'active_days': len({w.date for w in completed}), 'changes': changes,
            'notice': '이 리포트는 기록 요약이며 의학적 진단이나 운동 효과의 인과관계를 판단하지 않습니다.'}
