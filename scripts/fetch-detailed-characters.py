"""Download and verify the pinned MIT character source graphics. No API key needed."""
from pathlib import Path
import concurrent.futures, hashlib, json, sys, urllib.request
if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/fetch-detailed-characters.py SOURCE_DIRECTORY')
root=Path(__file__).resolve().parent
manifest=json.loads((root/'assets/detailed-character-sources.json').read_text())
target=Path(sys.argv[1]);target.mkdir(parents=True,exist_ok=True)
base=f"https://raw.githubusercontent.com/{manifest['repository']}/{manifest['revision']}/"
def sha(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def fetch(entry):
    path=entry['path'];relative=path.split('Professions/',1)[-1]
    destination=target/relative;destination.parent.mkdir(parents=True,exist_ok=True)
    if destination.exists() and sha(destination.read_bytes())==entry['sha']: return relative+' verified'
    with urllib.request.urlopen(base+path,timeout=90) as response: data=response.read()
    if len(data)!=entry['size'] or sha(data)!=entry['sha']: raise RuntimeError('Source checksum mismatch: '+relative)
    destination.write_bytes(data)
    return relative+' downloaded and verified'
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for result in executor.map(fetch,manifest['files']): print(result)
