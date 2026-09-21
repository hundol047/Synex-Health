"""Convert CC0 MakeHuman hm08 assets into our compact, static adult surface mesh.
Usage: python scripts/build-human-mesh.py /path/to/makehuman
No MakeHuman application code is imported. Only CC0 mesh/morph asset data is used.
"""
from pathlib import Path
import sys,json,subprocess
root=Path(sys.argv[1]);source=root/'makehuman/data'; vertices=[];groups={};group=''
for line in (source/'3dobjs/base.obj').read_text().splitlines():
    a=line.split()
    if not a:continue
    if a[0]=='v':vertices.append(list(map(float,a[1:4])))
    elif a[0]=='g':group=a[1]
    elif a[0]=='f':groups.setdefault(group,[]).append([int(s.split('/')[0])-1 for s in a[1:]])
faces=groups['body'];used=sorted({i for face in faces for i in face});remap={idx:i for i,idx in enumerate(used)}
indices=[]
for face in faces:
    for j in range(1,len(face)-1):indices.extend(remap[i] for i in (face[0],face[j],face[j+1]))
profiles={}
for gender in ('female','male'):
    points=[p[:] for p in vertices]
    names=[(f'{ethnicity}-{gender}-young.target',1/3) for ethnicity in ('african','asian','caucasian')]
    names.append((f'universal-{gender}-young-averagemuscle-averageweight.target',1))
    for name,weight in names:
        for line in (source/'targets/macrodetails'/name).read_text().splitlines():
            if not line or line.startswith('#'):continue
            a=line.split();i=int(a[0])
            for k in range(3):points[i][k]+=float(a[k+1])*weight
    floor=min(points[i][1] for i in used);height=max(points[i][1] for i in used)-floor;scale=1.78/height
    profiles[gender]=[round((points[i][k]-(floor if k==1 else 0))*scale*10000) for i in used for k in range(3)]
# Shared topology; anatomical sides match the model's own left/right (positive x = left).
base=[vertices[i] for i in used];regions=[]
for x,y,z in base:
    if y>5.8:region=0 # head/neck
    elif abs(x)>1.5 and y>0.4:region=2 if x>0 else 3
    elif y<0.0:region=4 if x>0 else 5
    else:region=1
    regions.append(region)
asset={'scale':.0001,'profiles':profiles,'indices':indices,'regions':regions,'source':'MakeHuman hm08 CC0','revision':subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD']).decode().strip()}
out=Path('frontend/src/health/components/body3d/assets');out.mkdir(exist_ok=True,parents=True)
(out/'human-mesh.json').write_text(json.dumps(asset,separators=(',',':'))+'\n')
(out/'LICENSE.CC0.md').write_text((root/'LICENSE.ASSETS.md').read_text())
print({'vertices':len(used),'triangles':len(indices)//3,'bytes':(out/'human-mesh.json').stat().st_size})
