"""Reproduce the licensed scan conversion. Requires numpy, scipy and Pillow.
Original source code is not executed. Inputs must match the pinned manifest.
"""
from pathlib import Path
import sys
import json,numpy as np,hashlib
from scipy.spatial.transform import Rotation
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from PIL import Image
if len(sys.argv)!=3:raise SystemExit('Usage: build-scanned-trainer.py SOURCE_DIRECTORY OUTPUT_DIRECTORY')
src=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((Path(__file__).parent/'assets/scanned-character-sources.json').read_text())
for entry in manifest['files']:
 rawInput=(src/entry['path']).read_bytes()
 if len(rawInput)!=entry['bytes'] or hashlib.sha256(rawInput).hexdigest()!=entry['sha256']:raise SystemExit('Source hash mismatch: '+entry['path'])
d=json.loads((src/'scene.gltf').read_text());raw=(src/'scene.bin').read_bytes()
def accessor(i):
 a=d['accessors'][i];b=d['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];t={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
 return np.ndarray((a['count'],n),dtype=t,buffer=raw,offset=b.get('byteOffset',0)+a.get('byteOffset',0),strides=(b.get('byteStride',np.dtype(t).itemsize*n),np.dtype(t).itemsize)).copy()
primitive=d['meshes'][0]['primitives'][0];attrs=primitive['attributes']
pos=accessor(attrs['POSITION']);uv=accessor(attrs['TEXCOORD_0']);faces=accessor(primitive['indices']).reshape(-1,3);indices=accessor(attrs['JOINTS_0']);values=accessor(attrs['WEIGHTS_0'])
bind=np.linalg.inv(accessor(d['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1));native=bind[:,:3,3]
low=pos[:,1].min();scale=1.78/(pos[:,1].max()-low)
def norm(p):return (np.asarray(p)-np.array([native[2,0],low,0]))*scale
joints=norm(native);points=norm(pos)
REST=np.array([[0,.94,.035],[0,1.42,.025],[0,1.66,.025],[.185,1.42,.02],[.325,1.25,.04],[.445,1.105,.13],[-.185,1.42,.02],[-.325,1.25,.04],[-.445,1.105,.13],[.1,.90,.035],[.14,.52,.05],[.19,.1,.035],[-.1,.90,.035],[-.14,.52,.05],[-.19,.1,.035],[.19,.04,.20],[-.19,.04,.20],[.565,.965,.25],[-.565,.965,.25]])
BONES=[(0,1),(1,2),(3,4),(4,5),(6,7),(7,8),(9,10),(10,11),(12,13),(13,14),(11,15),(14,16),(5,17),(8,18)]
eye=joints[[11,13]].mean(0)
S=np.array([joints[2],joints[[24,50]].mean(0),eye-[0,0,.07],joints[24],joints[25],joints[26],joints[50],joints[51],joints[52],joints[75],joints[76],joints[77],joints[82],joints[83],joints[84],joints[78],joints[85],joints[37]+(joints[37]-joints[36])*.7,joints[63]+(joints[63]-joints[62])*.7])
mapping={i:0 for i in range(len(joints))}
for ids,k in [(range(7,23),1),([24,48],2),([25,47],3),([50,74],4),([51,73],5),([75,81],6),([76,80],7),([82,88],8),([83,87],9),([77,78,79],10),([84,85,86],11),(range(26,47),12),(range(52,73),13)]:
 for i in ids:mapping[i]=k
transforms=[]
for k,(a,b) in enumerate(BONES):
 v=S[b]-S[a];t=REST[b]-REST[a];axis=v/np.linalg.norm(v);to=t/np.linalg.norm(t);q=Rotation.from_quat([*np.cross(axis,to),1+np.dot(axis,to)])
 if k==1:a=2;q=Rotation.identity();factor=1
 else:factor=np.linalg.norm(t)/np.linalg.norm(v)
 transforms.append((a,q,axis,factor))
def deform(p,weights,delta=False):
 result=np.zeros(3)
 for k,w in weights:
  a,q,axis,factor=transforms[k];v=p.copy() if delta else p-S[a];v+=axis*np.dot(v,axis)*(factor-1);v=q.apply(v);result+=(v if delta else v+REST[a])*w
 return result
blinkDeltas=[]
for bone in [17,19]:
 node=d['skins'][0]['joints'][bone];parent=next(i for i,n in enumerate(d['nodes']) if node in n.get('children',[]));bp=d['skins'][0]['joints'].index(parent)
 local=np.linalg.inv(bind[bp])@bind[bone];baseRotation=Rotation.from_matrix(local[:3,:3])
 rotations=[]
 for animation in d['animations']:
  for channel in animation['channels']:
   if channel['target']=={'node':node,'path':'rotation'}:rotations.extend(accessor(animation['samplers'][channel['sampler']]['output']))
 candidates=Rotation.from_quat(np.array(rotations));closed=candidates[np.argmax((candidates*baseRotation.inv()).magnitude())]
 local[:3,:3]=closed.as_matrix();deltaMatrix=bind[bp]@local@np.linalg.inv(bind[bone]);v=np.c_[pos,np.ones(len(pos))];delta=(v@deltaMatrix.T)[:,:3]-pos
 influence=np.sum(np.where(indices==bone,values,0),axis=1);blinkDeltas.append(delta*influence[:,None]*scale)
 # A small fraction of the source's own eyelid motion relaxes the open pose.
points+=.18*(blinkDeltas[0]+blinkDeltas[1])
weights=[];nativeRows=[];posed=[]
for p,ii,ww in zip(points,indices,values):
 rows=[(int(i),float(w)) for i,w in zip(ii,ww) if w>1e-6];merged={}
 for i,w in rows:merged[mapping[i]]=merged.get(mapping[i],0)+w
 total=sum(merged.values());row=sorted((b,w/total) for b,w in merged.items());weights.append(row);nativeRows.append(rows);posed.append(deform(p,row))
posed=np.array(posed)
# Preserve a native-resolution head UV island; crop only the texture rectangle,
# remapping that island's UVs without changing any face/skin pixels.
g=coo_matrix((np.ones(faces.size),(faces.flatten(),np.roll(faces,1,axis=1).flatten())),shape=(len(pos),len(pos)))
_,components=connected_components(g,directed=False)
img=Image.open(src/'textures/rp_sophia_animated_003_mat_baseColor.jpeg');size=np.array(img.size)
patches={}
for c in [4,12,15,19,20]:
 ids=np.where(components==c)[0];lo=np.maximum(0,np.floor(uv[ids].min(0)*size-8).astype(int));hi=np.minimum(size,np.ceil(uv[ids].max(0)*size+8).astype(int));file=out/('island-'+str(c)+'.png');img.crop((*lo,*hi)).save(file);patches[c]=(file,lo,hi)
bodyfile=out/'body.png';bodyimg=img.copy();bodyimg.thumbnail((2048,2048));bodyimg.save(bodyfile)
# Keep the original separate eye surfaces, hair and garment texture islands.
kind=lambda c:'Skin' if c in [7,10,12,18,21] else 'Eyes' if c in [4,15,19,20] else 'Mouth' if c in [0,1,2,3,9,22,23] else 'Clothes'
groups=[];materials=[]
for c in range(int(components.max())+1):
 group=faces[components[faces[:,0]]==c].flatten().tolist();groups.append(group)
 materials.append(dict(kind=kind(c),name='ScanIsland_'+str(c),map=str(patches[c][0] if c in patches else bodyfile),muscleGuide=c in [6,7,8,10,11,12,13,16,18,21]))
uvout=uv.copy()
for c,(_,lo,hi) in patches.items():
 ids=np.where(components==c)[0];uvout[ids]=(uv[ids]*size-lo)/(hi-lo)
uvout[:,1]=1-uvout[:,1]
# Shared anatomical vertices stay smooth across UV seams.
sourceIds={};sourceVertices=[]
for p in points:
 key=tuple(np.round(p,6));sourceIds.setdefault(key,len(sourceIds));sourceVertices.append(sourceIds[key])
result=dict(sourceModel='Sophia Animated 003 — Renderpeople',sourceFamily='scanned-gltf',sourceRevision='390e4671632cd0e01460521e4927ed67f8061be3',body='female',positions=posed.round(6).flatten().tolist(),uv=uvout.round(7).flatten().tolist(),weights=[[[b,round(w,6)] for b,w in row] for row in weights],sourceVertices=sourceVertices,materials=[s['kind'] for s in materials],surfaceMaterials=materials,groups=groups,morphs={'AK_09_EyeBlinkLeft':[],'AK_10_EyeBlinkRight':[]},grips={s:[[],[]] for s in ['relaxed','clasp','closed']},eyes=[deform(joints[i],[[1,1]]).tolist() for i in [11,13]])
for label,deltas in zip(result['morphs'],blinkDeltas):
 for i,delta in enumerate(deltas):
  if np.linalg.norm(delta)>1e-7:result['morphs'][label].append([i,*deform(delta*.82,weights[i],True).round(6).tolist()])
chains=[[[27,28,29],[31,32,33],[35,36,37],[39,40,41],[43,44,45]],[[53,54,55],[57,58,59],[61,62,63],[65,66,67],[69,70,71]]]
for state,amount in [('relaxed',.14),('clasp',.58),('closed',.95)]:
 for side,digits in enumerate(chains):
  k=12+side;wrist=REST[5 if side==0 else 8];point=lambda i:deform(joints[i],[[k,1]])
  along=point(digits[2][0])-wrist;along/=np.linalg.norm(along);across=point(digits[1][0])-point(digits[4][0]);across/=np.linalg.norm(across);back=np.cross(along,across);back/=np.linalg.norm(back)
  if np.dot(back,[.68 if side==0 else -.68,.71,.18])<0:back=-back
  matrices={}
  for digit,chain in enumerate(digits):
   current=np.eye(4)
   for segment,index in enumerate(chain):
    p=point(index);direction=point(chain[min(segment+1,2)])-point(chain[max(segment-1,0)]);direction/=np.linalg.norm(direction);axis=np.cross(direction,-back);axis/=np.linalg.norm(axis)
    angle=[.75,1.05,.65][segment]*amount*(.65 if digit==0 else 1);r=Rotation.from_rotvec(axis*angle).as_matrix();m=np.eye(4);m[:3,:3]=r;m[:3,3]=p-r@p;current=current@m;matrices[index]=current.copy()
  for idx,(p,rows) in enumerate(zip(posed,nativeRows)):
   delta=np.zeros(3)
   for index,w in rows:
    if index in matrices:delta+=(matrices[index][:3,:3]@p+matrices[index][:3,3]-p)*w
   if np.linalg.norm(delta)>1e-6:result['grips'][state][side].append([idx,*delta.round(6).tolist()])
result['sourceLicense']={'author':'Renderpeople','title':'Sophia Animated 003 - Animated 3D Woman','url':'https://sketchfab.com/3d-models/dc448c3be0e74f96a55fb475a13433cf','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','redistributionRevision':'390e4671632cd0e01460521e4927ed67f8061be3'}
(out/'female.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print('Export',len(posed),'vertices',len(faces),'triangles','native-resolution face/eye patches',len(patches),'body map',bodyimg.size)

"""Subdivide the scan once; round only the hair crown, preserving the face."""
from pathlib import Path
import json,numpy as np
p=out/'female.json';d=json.loads(p.read_text());positions=np.array(d['positions']).reshape(-1,3);uv=np.array(d['uv']).reshape(-1,2);sources=d['sourceVertices'];n=max(sources)+1
first={};members={}
for i,s in enumerate(sources):first.setdefault(s,i);members.setdefault(s,[]).append(i)
base=np.array([positions[first[i]] for i in range(n)]);neighbours=[set() for _ in range(n)];edges={}
for group in d['groups']:
 for i in range(0,len(group),3):
  a,b,c=[sources[v] for v in group[i:i+3]]
  for x,y,z in [(a,b,c),(b,c,a),(c,a,b)]:
   if x==y:continue
   neighbours[x].add(y);neighbours[y].add(x);edges.setdefault(tuple(sorted([x,y])),[]).append(z)
hair=set(sources[i] for i in d['groups'][17]);rows=[]
for i in range(n):
 t=float(np.clip((base[i,1]-1.48)/.08,0,1)) if i in hair else 0;adj=neighbours[i];boundary=[j for j in adj if len(edges[tuple(sorted([i,j]))])==1]
 if not t or len(adj)<3:row={i:1.}
 elif len(boundary)==2:row={i:1-.25*t,**{j:.125*t for j in boundary}}
 elif boundary:row={i:1.}
 else:
  beta=(.625-(.375+.25*np.cos(2*np.pi/len(adj)))**2)/len(adj);row={i:1-len(adj)*beta*t,**{j:beta*t for j in adj}}
 rows.append(row)
edge_ids={}
for (a,b),opp in edges.items():
 edge_ids[(a,b)]=len(rows);t=float(np.clip(((base[a,1]+base[b,1])*.5-1.48)/.08,0,1)) if a in hair and b in hair else 0
 row={a:.5,b:.5}
 if len(opp)==2:
  row={a:.5-.125*t,b:.5-.125*t}
  for c in opp:row[c]=row.get(c,0)+.125*t
 rows.append(row)
newbase=np.array([sum((base[i]*w for i,w in row.items()),np.zeros(3)) for row in rows]);newweights=[]
for row in rows:
 weights={}
 for s,w in row.items():
  for b,bw in d['weights'][first[s]]:weights[b]=weights.get(b,0)+w*bw
 newweights.append([[b,round(w,7)] for b,w in sorted(weights.items()) if w>1e-8])
new_uv=list(uv);new_sources=list(sources);edge_vertices={};groups=[]
for group in d['groups']:
 out=[]
 for i in range(0,len(group),3):
  a,b,c=group[i:i+3];mid=[]
  for x,y in [(a,b),(b,c),(c,a)]:
   key=tuple(sorted([x,y]));geo=tuple(sorted([sources[x],sources[y]]))
   if key not in edge_vertices:edge_vertices[key]=len(new_sources);new_sources.append(edge_ids[geo]);new_uv.append((uv[x]+uv[y])*.5)
   mid.append(edge_vertices[key])
  ab,bc,ca=mid;out.extend([a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])
 groups.append(out)
old_morphs=d['morphs'];old_grips=d['grips']
def interpolate_deltas(entries):
 lookup={sources[i]:np.array([x,y,z]) for i,x,y,z in entries};interpolated={}
 for s,row in enumerate(rows):
  value=sum((lookup.get(i,np.zeros(3))*w for i,w in row.items()),np.zeros(3))
  if np.linalg.norm(value)>1e-7:interpolated[s]=value.round(6).tolist()
 return [[i,*interpolated[s]] for i,s in enumerate(new_sources) if s in interpolated]
d['positions']=newbase[new_sources].round(6).flatten().tolist();d['uv']=np.array(new_uv).round(7).flatten().tolist();d['sourceVertices']=new_sources;d['groups']=groups;d['weights']=[newweights[s] for s in new_sources]
d['morphs']={k:interpolate_deltas(v) for k,v in old_morphs.items()};d['grips']={k:[interpolate_deltas(v) for v in sides] for k,sides in old_grips.items()}
d['refinement']={'passes':1,'method':'shared-edge subdivision; Loop smoothing on hair crown only','faceResculpted':False}
p.write_text(json.dumps(d,separators=(',',':'))+'\n');print('Refined',len(new_sources),'vertices',sum(len(g)//3 for g in groups),'triangles')
