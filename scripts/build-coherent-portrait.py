"""Build one coherent adult head, aligned at the eye joints, without stacked local sculpts.
Usage: python scripts/build-coherent-portrait.py TARGET_DIRECTORY BASE_OBJ
Only CC0 graphical targets are consumed. The body topology/neck anchors stay unchanged.
"""
from pathlib import Path
from collections import defaultdict
import sys,json,hashlib,numpy as np
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1])
vertices=[];groups=defaultdict(set);group=''
for line in Path(sys.argv[2]).read_text().splitlines():
    a=line.split()
    if not a:continue
    if a[0]=='v':vertices.append(list(map(float,a[1:4])))
    elif a[0]=='g':group=a[1]
    elif a[0]=='f':groups[group].update(int(p.split('/')[0])-1 for p in a[1:])
base=np.array(vertices);used=sorted(groups['body'])
names=['african-female-young.target','asian-female-young.target','caucasian-female-young.target','universal-female-young-averagemuscle-averageweight.target']
targets=[]
for name in names:
    delta=np.zeros_like(base)
    for line in (source/name).read_text().splitlines():
        a=line.split()
        if a and not a[0].startswith('#'):delta[int(a[0])]=list(map(float,a[1:4]))
    targets.append(delta)
old=base+sum(targets[:3])/3+targets[3]
new=base+.85*targets[1]+.15*targets[2]+targets[3]
def normalize(points):
    floor=points[used,1].min();scale=1.78/(points[used,1].max()-floor)
    return (points-np.array([0,floor,0]))*scale
old,new=normalize(old),normalize(new)
eye_ids=sorted(groups['joint-l-eye'])
old_eye=old[eye_ids].mean(axis=0);new_eye=new[eye_ids].mean(axis=0)
factor=old_eye[0]/new_eye[0]
translation=old_eye-new_eye*factor
new=new*factor+translation
mesh=json.loads((root/'frontend/src/health/components/body3d/assets/human-mesh.json').read_text())
assert len(used)*3==len(mesh['profiles']['female'])
reference=np.array(mesh['profiles']['female']).reshape(-1,3)*mesh['scale']
deltas=[]
for j,i in enumerate(used):
    t=np.clip((reference[j,1]-1.54)/.06,0,1);weight=t*t*(3-2*t)
    d=(new[i]-old[i])*weight
    if abs(d).max()>.000005:deltas.append([j,*np.round(d,6).tolist()])
data=dict(sourceRevision=mesh['revision'],recipe='coherent-eye-aligned-v1',deltas=deltas,eyeCenter=old_eye.tolist(),alignmentScale=float(factor),
          profileWeights={names[1]:.85,names[2]:.15,names[3]:1},sourceHashes={n:hashlib.sha256((source/n).read_bytes()).hexdigest() for n in names})
(root/'frontend/src/health/components/character/assets/portrait-head.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(dict(vertices=len(deltas),eyeCenter=old_eye.tolist(),alignmentScale=float(factor),maxDelta=max(abs(v) for row in deltas for v in row[1:])))
