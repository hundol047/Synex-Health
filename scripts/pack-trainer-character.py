"""Pack authored trainer maps as local WebP assets, preserving source hashes.
Pillow required. Normal-map vectors are encoded losslessly; no shader/program
code from the source authoring tool is included in the application.
"""
import json,hashlib,struct,zlib,io,sys
from pathlib import Path
from PIL import Image
if len(sys.argv)!=4:raise SystemExit('Usage: python scripts/pack-trainer-character.py SOURCE_DIRECTORY OUTPUT_DIRECTORY female|male')
src=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
body=sys.argv[3]
if body not in ['female','male']:raise SystemExit('Invalid body profile')
d=json.loads((src/(body+'.json')).read_text())
for i,s in enumerate(d['surfaceMaterials']):
 for key in ['map','normalMap','bumpMap']:
  if key not in s:continue
  file=Path(s[key]);s[key+'SourceHash']=hashlib.sha256(file.read_bytes()).hexdigest()
  raw=file.read_bytes()
  if raw.startswith(b'\x89PNG'):
   clean,offset=raw[:8],8
   while offset<len(raw):
    length=struct.unpack('>I',raw[offset:offset+4])[0];chunk=raw[offset:offset+length+12]
    if chunk[4:8] in [b'IHDR',b'PLTE',b'tRNS',b'IDAT',b'IEND']:
     assert zlib.crc32(chunk[4:-4]) & 0xffffffff == struct.unpack('>I',chunk[-4:])[0]
     clean+=chunk
    offset+=length+12
   raw=clean
  img=Image.open(io.BytesIO(raw));img.load();img=img.convert('RGBA' if 'A' in img.getbands() else 'RGB');img.thumbnail((2048,2048))
  name=f'{key.lower()}-{s[key+"SourceHash"][:16]}-v1.webp'
  temporary=out/(name+'.tmp')
  img.save(temporary,'WEBP',quality=93,method=4,lossless=key=='normalMap')
  temporary.replace(out/name);s[key]=name
(out/(body+'.json')).write_text(json.dumps(d,separators=(',',':'))+'\n')
