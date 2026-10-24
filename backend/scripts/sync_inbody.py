"""Run from an authenticated institution scheduler. No polling loop or guessed webhook."""
import argparse,json
from app.health.extensions import provider_sync
from app.health.router import store
from app.services.auth import User

def main():
    p=argparse.ArgumentParser();p.add_argument('--user-id',required=True);a=p.parse_args()
    u=store.get_user(a.user_id)
    if not u or u.role!='student':raise SystemExit('Verified student required')
    from app.health.consents import consent_status
    if not consent_status(store,u.id)['active']:
        print(json.dumps({'status':'skipped_consent','count':0}));return
    result=provider_sync(User(id=u.id,role=u.role),trigger='scheduled_server')
    print(json.dumps({'status':result['status'],'count':result['count']}))
if __name__=='__main__':main()
