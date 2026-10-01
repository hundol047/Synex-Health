"""Encrypted PostgreSQL backup. Requires pg_dump + age and BACKUP_AGE_RECIPIENT.
No database credentials in argv, logs or manifests. Does not configure a schedule or upload.
"""
import argparse,hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlsplit,unquote,parse_qs


def pg_environment(url):
    parsed=urlsplit(url.replace('postgresql+psycopg://','postgresql://',1))
    if parsed.scheme!='postgresql' or not parsed.hostname or not parsed.path.strip('/'):
        raise ValueError('PostgreSQL connection required')
    env=dict(os.environ,PGHOST=parsed.hostname,PGPORT=str(parsed.port or 5432),PGDATABASE=unquote(parsed.path.lstrip('/')),PGUSER=unquote(parsed.username or ''),PGPASSWORD=unquote(parsed.password or ''))
    for key,val in parse_qs(parsed.query).items():
        if key in ('sslmode','sslrootcert','sslcert','sslkey'):env['PG'+key.upper()]=val[-1]
    return env


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('output');args=parser.parse_args()
    recipient=os.environ.get('BACKUP_AGE_RECIPIENT','')
    if not recipient.startswith(('age1','ssh-')):raise ValueError('Set the backup recipient public key')
    target=Path(args.output).resolve();target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():raise ValueError('Refusing to overwrite an existing backup')
    env=pg_environment(os.environ.get('DATABASE_URL',''))
    with tempfile.TemporaryDirectory(dir=target.parent,prefix='.synex-backup-') as temporary:
        encrypted=Path(temporary)/'backup.age'
        dump=subprocess.Popen(['pg_dump','--format=custom','--no-owner','--no-acl'],env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
        try:
            encrypt=subprocess.run(['age','-r',recipient,'-o',str(encrypted)],stdin=dump.stdout,stderr=subprocess.DEVNULL)
            dump.stdout.close();code=dump.wait()
            if code or encrypt.returncode:raise RuntimeError('Backup or encryption failed; incomplete output removed')
            os.chmod(encrypted,0o600);os.link(encrypted,target)
        finally:
            if dump.poll() is None:dump.kill();dump.wait()
    digest=hashlib.sha256()
    with target.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):digest.update(block)
    manifest={'created_at':datetime.now(timezone.utc).isoformat(),'sha256':digest.hexdigest(),'bytes':target.stat().st_size,'format':'pg_dump-custom+age','restore_tested':False}
    target.with_suffix(target.suffix+'.json').write_text(json.dumps(manifest,indent=2))
    print('Encrypted backup and checksum manifest created. Restore validation is still required.')

if __name__=='__main__':
    try:main()
    except Exception:print('BACKUP FAILED: check prerequisites, connection and protected output path. No plaintext backup retained.',file=sys.stderr);sys.exit(1)
