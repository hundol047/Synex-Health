import json
from pathlib import Path

def test_every_catalog_motion_has_an_explicit_pose_protocol():
    from app.health.exercise_catalog import CATALOG
    profiles=json.loads((Path(__file__).parents[2]/'frontend/src/health/components/exercise/catalogPoseProfiles.json').read_text())
    assert set(profiles)=={e['id'] for e in CATALOG}
    for exercise in CATALOG:
        p=profiles[exercise['id']]
        assert p['label']==exercise['name'] and p['dose_type']==exercise['dose_type']
        assert p['instructions']==exercise['instructions']
        assert p['camera'] and p['metric'] and p['validation']=='external_validation_required'

def test_pose_readiness_requires_real_current_build_evidence(tmp_path):
    from app.health.pose_release import pose_validation
    assert pose_validation({})=='EXTERNAL VALIDATION DATA REQUIRED'
    assert pose_validation({'POSE_COACHING_ENABLED':'false'})=='DISABLED'
    f=tmp_path/'fake.json';f.write_text(json.dumps({'commit_sha':'x','input_type':'synthetic'}))
    assert pose_validation({'BUILD_COMMIT':'x','POSE_VALIDATION_REPORT':str(f)})=='EXTERNAL VALIDATION DATA REQUIRED'

def test_pose_evidence_checks_every_exercise_and_rejects_stale_or_missing_metrics(tmp_path):
    from app.health.pose_release import pose_validation
    from app.health.exercise_catalog import CATALOG
    report={'commit_sha':'test-build','input_type':'consented_real_video','reviewer':'test reviewer',
            'dataset_sha256':'a'*64,'evidence_url':'https://validation.example.test/report',
            'per_exercise':{e['id']:{'minimum_sample_target_met':True,'result':'PASS','detection_recall':.95,'correction_precision':.95} for e in CATALOG}}
    f=tmp_path/'report.json';env={'BUILD_COMMIT':'test-build','POSE_VALIDATION_REPORT':str(f)}
    f.write_text(json.dumps(report));assert pose_validation(env)=='VERIFIED'
    assert pose_validation({**env,'BUILD_COMMIT':'new-build'})=='EXTERNAL VALIDATION DATA REQUIRED'
    report['per_exercise']['squat']['correction_precision']=None
    f.write_text(json.dumps(report));assert pose_validation(env)=='EXTERNAL VALIDATION DATA REQUIRED'
    report['per_exercise'].pop('squat')
    f.write_text(json.dumps(report));assert pose_validation(env)=='EXTERNAL VALIDATION DATA REQUIRED'
