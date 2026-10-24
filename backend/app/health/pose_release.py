"""Real-video evidence is required before enabling camera correction in production."""
import os,json,math
from pathlib import Path

def pose_validation(env=None):
    e=os.environ if env is None else env
    if e.get('POSE_COACHING_ENABLED','true')=='false':return 'DISABLED'
    try:
        report=json.loads(Path(e.get('POSE_VALIDATION_REPORT','')).read_text())
        from .exercise_catalog import CATALOG
        if not e.get('BUILD_COMMIT') or report.get('commit_sha')!=e['BUILD_COMMIT']:return 'EXTERNAL VALIDATION DATA REQUIRED'
        if report.get('input_type')!='consented_real_video' or not report.get('reviewer') or not report.get('dataset_sha256') or not report.get('evidence_url','').startswith('https://'):return 'EXTERNAL VALIDATION DATA REQUIRED'
        rows=report['per_exercise']
        for exercise in CATALOG:
            row=rows[exercise['id']]
            if not row.get('minimum_sample_target_met') or row.get('result')!='PASS':return 'EXTERNAL VALIDATION DATA REQUIRED'
            for metric in ('detection_recall','correction_precision'):
                value=row.get(metric)
                if type(value) not in (int,float) or not math.isfinite(value) or not .9<=value<=1:return 'EXTERNAL VALIDATION DATA REQUIRED'
        return 'VERIFIED'
    except (OSError,ValueError,KeyError,TypeError):return 'EXTERNAL VALIDATION DATA REQUIRED'

def enforce_pose_release():
    from fastapi import HTTPException
    if os.getenv('POSE_COACHING_ENABLED','true')=='false':raise HTTPException(503,'카메라 자세 분석은 현재 제공하지 않습니다.')
    if (os.getenv('APP_ENV')=='production' or os.getenv('PILOT_MODE')=='true') and pose_validation()!='VERIFIED':
        raise HTTPException(503,'실제 영상 검증이 완료되지 않아 자세 교정을 제공하지 않습니다. 운동 안내와 기록은 이용할 수 있습니다.')
