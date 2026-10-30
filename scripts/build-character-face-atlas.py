"""Build face-only CC0 texture atlases and UVs for the existing hm08 topology.
Usage: python scripts/build-character-face-atlas.py SOURCE_DIRECTORY
SOURCE_DIRECTORY contains pinned base.obj, male.png, female.png (see asset README).
Requires Pillow; does not download assets or change body/joint topology.
"""
from pathlib import Path
from collections import defaultdict
import hashlib, json, sys
from PIL import Image, ImageFilter, ImageChops
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]); output=root/'frontend/src/health/components/character/assets'
mesh=json.loads((root/'frontend/src/health/components/body3d/assets/human-mesh.json').read_text())
uv=[]; faces=[]; group=''
for line in (source/'base.obj').read_text().splitlines():
    row=line.split()
    if not row: continue
    if row[0]=='vt': uv.append(tuple(map(float,row[1:3])))
    elif row[0]=='g': group=row[1]
    elif row[0]=='f' and group=='body': faces.append([tuple(int(v)-1 for v in p.split('/')[:2]) for p in row[1:]])
used=sorted({v for face in faces for v,t in face}); remap={v:i for i,v in enumerate(used)}
indices=[]; refs=defaultdict(list)
for face in faces:
    for v,t in face:
        if t not in refs[v]: refs[v].append(t)
    for i in range(1,len(face)-1): indices.extend(remap[v] for v,t in (face[0],face[i],face[i+1]))
assert indices==mesh['indices'], 'Source OBJ topology does not match the shipped body'
assert len(used)*3==len(mesh['profiles']['male'])
# The head island occupies the atlas right side. Discard torso/leg pixels.
# Internal mouth/eye islands outside this crop retain the existing base shading.
left=1228; size=2048; us=left/size
coords=[]; selected=[]
for i,v in enumerate(used):
    head=any(mesh['profiles'][g][i*3+1]*mesh['scale']>1.54 for g in ['male','female'])
    candidates=[uv[t] for t in refs[v] if uv[t][0]>=us]
    u,w=candidates[0] if head and candidates else (us+.2,.5)
    valid=bool(head and candidates);selected.append((u,w,valid))
    coords.extend([round((u-us)/(1-us),6),round(w,6),int(valid)])
output.mkdir(parents=True,exist_ok=True); references={}; hashes={}
for gender in ['male','female']:
    path=source/(gender+'.png'); hashes[gender]=hashlib.sha256(path.read_bytes()).hexdigest()
    image=Image.open(path).convert('RGB'); assert image.size==(size,size)
    samples=[]
    for i,(u,v,valid) in enumerate(selected):
        x,y,z=[n*mesh['scale'] for n in mesh['profiles'][gender][i*3:i*3+3]]
        if valid and .04<abs(x)<.057 and 1.62<y<1.645 and z>.11:
            samples.append(image.getpixel((min(size-1,int(u*size)),min(size-1,int((1-v)*size)))))
    assert len(samples)>10
    rgb=[round(sum(p[k] for p in samples)/len(samples)) for k in range(3)]
    references[gender]='#'+''.join(f'{v:02x}' for v in rgb)
    crop=image.crop((left,0,size,size))
    gray=crop.convert('L'); low=gray.filter(ImageFilter.GaussianBlur(2))
    # Pack restrained high-frequency relief in alpha; the shader never uses it
    # as opacity. This needs no second texture fetch or additional sampler.
    relief=ImageChops.subtract(gray,low,scale=1,offset=128).point(lambda value: min(255,round(value/8)*8))
    crop.putalpha(relief)
    crop.save(output/(gender+'-face.webp'),format='WEBP',quality=92,method=6)
(output/'face-uv.json').write_text(json.dumps({'sourceRevision':mesh['revision'],'coordinates':coords,'reference':references,'sourceHashes':hashes},separators=(',',':'))+'\n')
print({'vertices':len(used),'reference':references,'hashes':hashes})
