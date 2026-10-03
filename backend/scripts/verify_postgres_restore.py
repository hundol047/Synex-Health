"""Disposable database backup/drop/restore verification. Refuses non-CI database names."""
import hashlib,json,os,subprocess,tempfile,uuid
from urllib.parse import urlsplit,unquote
import psycopg

def verify():
    url=os.environ['DATABASE_URL'].replace('postgresql+psycopg://','postgresql://',1)
    parsed=urlsplit(url)
    if os.getenv('SYNEX_DISPOSABLE_DB')!='true' or not parsed.path.lstrip('/').startswith('synex_test'):
        raise RuntimeError('Explicit disposable synex_test database required')
    name='synex_test_restore_'+uuid.uuid4().hex[:12]
    admin=url.rsplit('/',1)[0]+'/postgres'
    env={**os.environ,'PGHOST':parsed.hostname,'PGPORT':str(parsed.port or 5432),'PGUSER':unquote(parsed.username or ''),'PGPASSWORD':unquote(parsed.password or ''),'PGDATABASE':name}
    def command(*args):subprocess.run(args,env=env,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    def fingerprint(db):
        with psycopg.connect(db) as connection:
            rows=connection.execute('SELECT id,payload FROM restore_fixture ORDER BY id').fetchall()
        return len(rows),hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()
    scratch=admin.rsplit('/',1)[0]+'/'+name
    with psycopg.connect(admin,autocommit=True) as connection:
        from psycopg import sql
        try:
            connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
            with psycopg.connect(scratch) as db:
                db.execute('CREATE TABLE restore_fixture(id integer PRIMARY KEY,payload text NOT NULL)')
                for i in range(20):db.execute('INSERT INTO restore_fixture VALUES (%s,%s)',(i,f'synthetic-{i}'))
            before=fingerprint(scratch)
            with tempfile.TemporaryDirectory() as folder:
                target=folder+'/backup.dump'
                command('pg_dump','--format=custom','--no-owner','--no-acl','--file',target)
                connection.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(name)))
                connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
                command('pg_restore','--exit-on-error','--no-owner','--no-acl','--dbname',name,target)
            assert fingerprint(scratch)==before
            print('VERIFIED: disposable PostgreSQL backup/drop/restore, 20 rows and content checksum')
        finally:
            connection.execute(sql.SQL('DROP DATABASE IF EXISTS {}').format(sql.Identifier(name)))
if __name__=='__main__':verify()
