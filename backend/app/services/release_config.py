"""Fail closed before any production storage or application initialization."""
import os
from urllib.parse import urlparse

def validate_production(env=None):
    e=os.environ if env is None else env
    if e.get('APP_ENV','development')!='production':return
    failures=[]
    if e.get('AUTH_MODE')!='oidc':failures.append('AUTH_MODE must be oidc')
    if not e.get('DATABASE_URL','').startswith('postgresql+psycopg://'):failures.append('PostgreSQL DATABASE_URL required')
    if not e.get('SCHOOL_OIDC_CONFIG') and not (e.get('OIDC_ISSUER','').startswith('https://') and e.get('OIDC_AUDIENCE')):failures.append('OIDC configuration required')
    for name in ('PUBLIC_API_URL','PRIVACY_POLICY_URL','SUPPORT_URL','TERMS_URL'):
        u=urlparse(e.get(name,''))
        if u.scheme!='https' or not u.hostname or u.hostname in ('localhost','127.0.0.1') or u.hostname.endswith(('.example','.test')) or u.hostname in ('example.com','example.org','example.net'):failures.append(name+' must be a real HTTPS URL')
    if not e.get('LEGAL_OPERATOR') or not e.get('SUPPORT_EMAIL'):failures.append('Legal operator and contact required')
    if e.get('SYNEX_HEALTH_DEMO_SEED','true')!='false':failures.append('Demo seeding must be disabled')
    if e.get('LAUNCH_MODE') not in ('free','plus'):failures.append('LAUNCH_MODE must be free or plus')
    if e.get('BILLING_MODE')=='demo':failures.append('Demo billing forbidden')
    if e.get('LAUNCH_MODE')=='plus' and not all(e.get(k) for k in ('REVENUECAT_SECRET_KEY','REVENUECAT_WEBHOOK_SECRET','REVENUECAT_PRODUCTS')):failures.append('Plus billing credentials required')
    if e.get('LAUNCH_MODE')=='free' and e.get('BILLING_MODE','disabled')!='disabled':failures.append('Free launch must disable billing')
    if e.get('HEALTH_AGENT_MODE','deterministic')!='deterministic':failures.append('External LLM requires a separate consent release; use deterministic')
    origins=e.get('SYNEX_CORS_ORIGINS','').split(',')
    if not origins or any(not (o.startswith('https://') or o=='capacitor://localhost') or '*' in o for o in origins):failures.append('Explicit HTTPS/native CORS origins required')
    if e.get('APP_REVIEW_MODE')=='true' and not all(e.get(k) for k in ('APP_REVIEW_USERNAME','APP_REVIEW_PASSWORD_HASH','APP_REVIEW_SALT')):failures.append('Review credentials required')
    if failures:raise RuntimeError('Invalid production configuration: '+'; '.join(failures))
