"""Fetch the openly redistributed CC-BY input and verify its pinned hash.

Reads artwork data only. No authentication, viewer extraction or source code
execution. Attribution and source rights notes are in assets/authored/README.md.
"""
import hashlib,sys,urllib.request,tempfile,os
from pathlib import Path

URL='https://raw.githubusercontent.com/eojnus/wolf-of-tarkov/d3ab9d9b1dc636fb625453254809722480dcfc1d/public/assets/models/character/Alina_Ip_Animated.usdz'
SHA256='9ee66be79042aa3fcf3c411a83325dcaeaba1638a47c4bd06ea50fcfdae2deb4'
SIZE=16323875
if len(sys.argv)!=2:raise SystemExit('Usage: python scripts/fetch-authored-trainer.py OUTPUT.usdz')
destination=Path(sys.argv[1]).resolve();destination.parent.mkdir(parents=True,exist_ok=True)
if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest()==SHA256:
 print('Verified existing input:',destination);raise SystemExit(0)
with urllib.request.urlopen(URL,timeout=60) as response:
 data=response.read(SIZE+1)
if len(data)!=SIZE or hashlib.sha256(data).hexdigest()!=SHA256:raise SystemExit('Downloaded input does not match the pinned source; no file written.')
name=None
try:
 with tempfile.NamedTemporaryFile(dir=destination.parent,prefix='.authored-',delete=False) as f:
  name=f.name;f.write(data)
 os.replace(name,destination);name=None
finally:
 if name:os.unlink(name)
print('Verified downloaded input:',destination)
