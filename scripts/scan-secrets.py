"""Conservative tracked-content scan. Prints paths/categories, never matched secrets."""
import re,subprocess,sys
patterns=[('private key',re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')),('provider token',re.compile(rb'(?:sk-ant-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})')),('credential URL',re.compile(rb'postgres(?:ql)?(?:\+psycopg)?://[^\s/:]+:[^\s@]{5,}@'))]
files=subprocess.check_output(['git','ls-files','-z']).split(b'\0');bad=[]
for raw in files:
 if not raw:continue
 p=raw.decode()
 if p.endswith(('.png','.jpg','.woff2')) or p.endswith('scan-secrets.py'):continue
 try:data=open(p,'rb').read()
 except FileNotFoundError:continue
 for label,rx in patterns:
  if rx.search(data):bad.append((p,label))
for p,label in bad:print(p+': '+label)
print(f'Tracked-file scan: {len(bad)} candidate(s); this is not a credential-rotation guarantee.')
sys.exit(bool(bad))
