"""Own-data lifecycle, goals, institution state and paid feature APIs."""
import json
from datetime import date, timedelta
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from ..services.auth import User, get_current_user, require
from .router import store, audit, _school_directory, _require_user_record
from .schools import body_model_profile
from .billing import status
from .store import now, new_id
from .schemas import Goal, ExerciseProfile
from .providers.inbody import InBodyProvider
router=APIRouter(prefix='/api')

def plus(user):
    if not status(user.id)['active']:raise HTTPException(403,'Plus 권한이 필요합니다. 멤버십에서 연결 상태를 확인하세요.')

@router.get('/advanced/body')
def advanced_body(user:User=Depends(require('measurement:read'))):
    plus(user)
    return {'profile':body_model_profile(_require_user_record(user.id)),'measurements':store.list_measurements(user.id)}

@router.get('/advanced/pose')
def pose_access(user:User=Depends(require('health:read'))):
    plus(user)
    return {'enabled':True,'upload_video':False,'exercises':['squat'],'notice':'설명용 자세 추정. 진단·정확한 관절각 측정이 아닙니다.'}

class GoalRequest(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    strategy:Literal['fat_loss','muscle_gain','maintain','weight_loss','weight_gain','habit','balance']
    metric:Literal['weight','body_fat_percentage','skeletal_muscle_mass','weekly_sessions']
    target:float=Field(gt=0,le=500)
    target_date:date

@router.get('/goals')
def goal(user:User=Depends(require('health:read'))):
    g=store.preference(user.id,'goal')
    if not g:return None
    m=store.latest_measurement(user.id)
    if g['metric']=='weekly_sessions':
        start=(date.today()-timedelta(days=date.today().weekday())).isoformat()
        current=len({w.date for w in store.list_workouts(user.id) if w.completed and start<=w.date<=date.today().isoformat()})
    else:current=getattr(m,g['metric'],None) if m else None
    baseline=g.get('baseline');span=g['target']-baseline if baseline is not None else 0
    progress=max(0,min(100,round((current-baseline)/span*100,1))) if current is not None and span else None
    return {**g,'current':current,'progress':progress}

@router.put('/goals')
def save_goal(req:GoalRequest,user:User=Depends(require('health:write'))):
    if req.target_date<date.today():raise HTTPException(422,'목표 날짜는 오늘 이후로 선택하세요.')
    if (req.metric=='weekly_sessions' and (req.target>7 or req.target!=int(req.target))) or (req.metric=='body_fat_percentage' and req.target>100):raise HTTPException(422,'목표 범위를 확인하세요.')
    m=store.latest_measurement(user.id)
    baseline=0 if req.metric=='weekly_sessions' else getattr(m,req.metric,None) if m else None
    store.save_preference(user.id,'goal',{**req.model_dump(mode='json'),'baseline':baseline,'created_at':now()})
    p=store.get_profile(user.id) or ExerciseProfile(user_id=user.id)
    p.goal={'fat_loss':Goal.FAT_MANAGEMENT,'weight_loss':Goal.FAT_MANAGEMENT,'muscle_gain':Goal.MUSCLE_GAIN,'weight_gain':Goal.MUSCLE_GAIN,'balance':Goal.BALANCE,'habit':Goal.GENERAL_FITNESS,'maintain':Goal.GENERAL_HEALTH}[req.strategy]
    store.upsert_profile(p)
    return goal(user)

@router.get('/privacy/export')
def export_data(user:User=Depends(require('health:read'))):
    with store.connect() as db:
        analyses=[json.loads(r[0]) for r in db.execute('SELECT payload FROM analyses WHERE user_id=?',(user.id,))]
        history=[dict(id=r[0],school_id=r[1],shared=bool(r[2]),created_at=r[3]) for r in db.execute('SELECT id,school_id,shared,created_at FROM consent_history WHERE user_id=? ORDER BY created_at',(user.id,))]
    return {'profile':store.get_user(user.id),'measurements':store.list_measurements(user.id),'analyses':analyses,'exercise_profile':store.get_profile(user.id),'routines':store.list_routines(user.id),'workouts':store.list_workouts(user.id),'goal':goal(user),'sharing_history':history,'exported_at':now()}

class DeleteRequest(BaseModel):
    confirmation:Literal['DELETE']

def purge(uid,account=False):
    with store.connect() as db:
        for table in ('measurements','routines','workouts','analyses','exercise_profiles','preferences'):
            db.execute(f'DELETE FROM {table} WHERE user_id=?',(uid,))
        db.execute('DELETE FROM counselor_notes WHERE student_id=?',(uid,))
        db.execute('UPDATE users SET share_with_center=0 WHERE id=?',(uid,))
        if account:
            db.execute('DELETE FROM users WHERE id=?',(uid,))
            db.execute('DELETE FROM billing_accounts WHERE user_id=?',(uid,))
            db.execute('DELETE FROM school_requests WHERE user_id=?',(uid,))
            db.execute('DELETE FROM consent_history WHERE user_id=?',(uid,))
            db.execute('INSERT OR REPLACE INTO deleted_accounts VALUES (?,?)',(uid,now()))
    # The minimal tombstone blocks existing tokens from silently recreating a deleted account.

@router.delete('/privacy/health-data')
def delete_health(req:DeleteRequest,user:User=Depends(require('health:write'))):
    purge(user.id)
    audit.record(user.id,'health_data_deleted',{},user_id=user.id,role=user.role)
    return {'deleted':True}

@router.delete('/privacy/account')
def delete_account(req:DeleteRequest,user:User=Depends(require('health:read'))):
    purge(user.id,True)
    audit.record(user.id,'account_deleted',{},user_id=user.id,role=user.role)
    return {'deleted':True,'notice':'스토어 구독은 별도로 해지해야 합니다. 외부 학교 계정은 삭제하지 않습니다.'}

@router.delete('/body-composition/{mid}')
def delete_measurement(mid:str,user:User=Depends(require('measurement:write'))):
    m=store.get_measurement(mid)
    if not m or m.user_id!=user.id:raise HTTPException(404,'본인 측정 기록이 없습니다.')
    with store.connect() as db:
        db.execute('DELETE FROM measurements WHERE id=? AND user_id=?',(mid,user.id))
        # Comparison summaries may reference any earlier reading. Invalidate all derived
        # records, but retain independently entered workout history without stale links.
        db.execute('DELETE FROM analyses WHERE user_id=?',(user.id,))
        db.execute('DELETE FROM routines WHERE user_id=?',(user.id,))
        rows=db.execute('SELECT id,payload FROM workouts WHERE user_id=?',(user.id,)).fetchall()
        for wid,payload in rows:
            record=json.loads(payload)
            record.update(routine_id=None,routine_exercise_id=None,day_number=None)
            db.execute('UPDATE workouts SET payload=? WHERE id=? AND user_id=?',(json.dumps(record),wid,user.id))
    return {'deleted':True}

@router.delete('/workouts/{wid}')
def delete_workout(wid:str,user:User=Depends(require('workout:write'))):
    with store.connect() as db:
        result=db.execute('DELETE FROM workouts WHERE id=? AND user_id=?',(wid,user.id))
        if not result.rowcount:raise HTTPException(404,'본인 운동 기록이 없습니다.')
    return {'deleted':True}

@router.get('/integrations/inbody')
def provider_status(user:User=Depends(require('health:read'))):
    from .providers.configured import inbody
    adapter=inbody(store)
    state=store.preference(user.id,'inbody_sync',{})
    mapping=store.preference(user.id,'inbody_mapping',{})
    ready=adapter.configured() and bool(mapping.get('subject'))
    return {'status':state.get('status','pending') if ready else 'not_connected','last_sync_time':state.get('last_sync_time'),'message':'공식 계약 adapter 설정됨. 동기화 성공 전까지 연결을 확인하세요.' if ready else '공식 API 계약 adapter와 외부 계정 매핑이 필요합니다. 수동/CSV 입력을 이용하세요.'}

@router.post('/integrations/inbody/sync')
def provider_sync(user:User=Depends(require('measurement:write'))):
    from .providers.configured import inbody
    from .providers.inbody import ProviderFailure
    from .providers.base import ProviderNotConfigured
    from .router import _regenerate_after_measurement
    u=_require_user_record(user.id)
    membership=store.preference(user.id,'membership',{})
    mapping=store.preference(user.id,'inbody_mapping',{})
    if not (membership.get('verified') and membership.get('school_id')==u.school_id and mapping.get('school_id')==u.school_id and mapping.get('subject')):
        raise HTTPException(501,'학교 인증과 공식 외부 계정 매핑이 아직 연결되지 않았습니다.')
    prior=store.preference(user.id,'inbody_sync',{})
    adapter=inbody(store)
    try:readings=adapter.sync(user.id,mapping['subject'])
    except ProviderNotConfigured:
        store.save_preference(user.id,'inbody_sync',{**prior,'status':'not_connected','last_attempt':now()});raise
    except ProviderFailure as exc:
        store.save_preference(user.id,'inbody_sync',{**prior,'status':'error','last_attempt':now(),'error_code':str(exc)})
        raise HTTPException(503,'측정 서버 동기화 실패. 기존 데이터는 유지됩니다.') from None
    state=store.save_preference(user.id,'inbody_sync',{'status':'connected','last_attempt':now(),'last_sync_time':now()})
    if readings:_regenerate_after_measurement(user,store.latest_measurement(user.id).id)
    return {**state,'count':len(readings)}

class ProviderMapping(BaseModel):
    school_id:str
    subject:str=Field(min_length=1,max_length=200)

@router.put('/admin/users/{uid}/inbody-mapping')
def set_provider_mapping(uid:str,req:ProviderMapping,user:User=Depends(require('user:admin'))):
    u=_require_user_record(uid)
    if req.school_id!=u.school_id:raise HTTPException(422,'사용자의 소속 학교와 일치해야 합니다.')
    store.save_preference(uid,'inbody_mapping',req.model_dump())
    audit.record(uid,'provider_mapping_updated',{'school_id':req.school_id},user_id=user.id,role=user.role)
    return {'status':'pending'}

class SchoolState(BaseModel):
    integration_status:Literal['not_connected','pending','connected','error']
    integration_message:str=Field(max_length=300)

@router.put('/admin/schools/{sid}/status')
def update_school(sid:str,req:SchoolState,user:User=Depends(require('user:admin'))):
    school=_school_directory().get(sid)
    if not school:raise HTTPException(404,'학교를 찾을 수 없습니다.')
    # An operator cannot label a disconnected adapter as a verified production connection.
    if req.integration_status=='connected':
        from .providers.center import center_adapter
        adapter=center_adapter(sid)
        try:connected=adapter is not None and adapter.probe() is True
        except Exception:connected=False
        if not connected:raise HTTPException(409,'건강센터 adapter 연결 검증 전에는 connected로 변경할 수 없습니다.')
    return store.register_school({**school,**req.model_dump()})

@router.get('/health/school-connection')
def connection(user:User=Depends(require('health:read'))):
    u=_require_user_record(user.id);membership=store.preference(user.id,'membership',{})
    return {'school_id':u.school_id,'verified':bool(membership.get('school_id')==u.school_id and membership.get('verified')),'share_with_center':u.share_with_center,'integration_status':_school_directory().get(u.school_id,{}).get('integration_status','not_connected')}

@router.get('/admin/dashboard')
def admin_dashboard(user:User=Depends(require('user:admin'))):
    with store.connect() as db:
        users=[{'id':r[0],'name':r[1],'role':r[2],'school_id':r[3]} for r in db.execute('SELECT id,name,role,school_id FROM users')]
        subscriptions=[{'user_id':r[0],'source':json.loads(r[1]).get('source'),'expires_at':json.loads(r[1]).get('expires_at')} for r in db.execute('SELECT user_id,payload FROM billing_accounts')]
    return {'schools':list(_school_directory().values()),'users':users,'school_requests':store.list_school_requests(),'subscriptions':subscriptions,'providers':{'inbody':'not_connected','biogram':'not_connected'},'references':store.list_reference_ranges(),'system':{'database':'ok'}}

@router.get('/auth/schools')
def school_logins():
    from ..services.school_oidc import configurations
    return [{k:c[k] for k in ('school_id','issuer','client_id','audience','redirect_url','status')} for c in configurations()]

@router.get('/exercise-catalog')
def catalog(user:User=Depends(require('routine:read'))):
    from .exercise_catalog import CATALOG
    return CATALOG

@router.get('/advanced/progress')
def long_term_progress(user:User=Depends(require('measurement:read'))):
    plus(user)
    items=store.list_measurements(user.id)
    from .comparison import describe_change
    return {'measurement_count':len(items),'first_date':items[0].measurement_date if items else None,'last_date':items[-1].measurement_date if items else None,'summary':describe_change(items[0],items[-1]) if len(items)>1 else '두 번 이상의 측정이 필요합니다.','notice':'전체 기록의 첫 측정과 마지막 측정 비교이며 진단이 아닙니다.'}
