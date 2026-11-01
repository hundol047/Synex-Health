"""Download the four public CC-BY source files and verify size and SHA-256."""
import sys,json,hashlib,urllib.request,os,tempfile
from pathlib import Path
if len(sys.argv)!=2:raise SystemExit('Usage: fetch-scanned-trainer.py OUTPUT_DIRECTORY')
manifest=json.loads((Path(__file__).parent/'assets/scanned-character-sources.json').read_text())
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
for entry in manifest['files']:
 target=out/entry['path'];target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']:
  print('Verified existing',entry['path']);continue
 with urllib.request.urlopen(manifest['baseUrl']+entry['path'],timeout=60) as response:data=response.read(entry['bytes']+1)
 if len(data)!=entry['bytes'] or hashlib.sha256(data).hexdigest()!=entry['sha256']:raise SystemExit('Source mismatch: '+entry['path'])
 name=None
 try:
  with tempfile.NamedTemporaryFile(dir=target.parent,prefix='.scan-',delete=False) as f:name=f.name;f.write(data)
  os.replace(name,target);name=None
 finally:
  if name:os.unlink(name)
 print('Downloaded and verified',entry['path'])
