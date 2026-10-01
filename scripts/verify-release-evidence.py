"""Verify reviewed external evidence files before release; never substitutes for real device/store tests."""
import argparse,hashlib,json,sys
from pathlib import Path
from datetime import datetime,timezone

BASE={'ios_device','android_device','auth_lifecycle','offline_recovery','account_deletion','backup_restore','privacy_review','monitoring_alert','support_contact'}
PAID={'ios_purchase_restore_refund','android_purchase_restore_refund'}

def validate(manifest,root,launch_mode):
    problems=[]
    required=BASE | (PAID if launch_mode=='plus' else set())
    for name in sorted(required):
        row=manifest.get('checks',{}).get(name,{})
        if row.get('status')!='passed' or not row.get('reviewer') or not row.get('build_id'):
            problems.append(name+': actual evidence and review required');continue
        try:
            tested=datetime.fromisoformat(row['tested_at'].replace('Z','+00:00'))
            age=(datetime.now(timezone.utc)-tested).total_seconds()
            if not 0<=age<=30*86400:raise ValueError('stale evidence')
            path=(root/row['artifact']).resolve()
            if not path.is_relative_to(root.resolve()) or not path.is_file():raise ValueError('missing artifact')
            if hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('checksum mismatch')
        except (KeyError,ValueError,TypeError,OSError):problems.append(name+': missing, stale or invalid evidence')
    return problems

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('manifest');parser.add_argument('--launch-mode',choices=['free','plus'],default='free');args=parser.parse_args()
    try:
        path=Path(args.manifest);errors=validate(json.loads(path.read_text()),path.parent,args.launch_mode)
    except (OSError,ValueError):errors=['Release evidence manifest is missing or invalid']
    print('\n'.join(['RELEASE BLOCKED']+errors) if errors else 'External evidence files checked. Review attestation remains the operator responsibility.')
    sys.exit(bool(errors))
