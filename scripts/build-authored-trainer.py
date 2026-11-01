"""Convert the pinned Alina Ip USDZ to the exercise rig without reshaping its face.

Dependencies: usd-core 26.11, numpy, scipy, Pillow (texture packing separately).
The publisher lists the artwork as CC BY 4.0; see the accompanying provenance.
No source scripts or programs are executed. The USDZ stays an external input.
"""
import hashlib,json,sys,zipfile
from pathlib import Path
import numpy as np
from scipy.spatial import ConvexHull
from scipy.spatial.transform import Rotation
from pxr import Usd,UsdGeom,UsdSkel

if len(sys.argv)!=3:raise SystemExit('Usage: build-authored-trainer.py INPUT.usdz OUTPUT_DIRECTORY')
source=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
digest=hashlib.sha256(source.read_bytes()).hexdigest()
assert digest=='9ee66be79042aa3fcf3c411a83325dcaeaba1638a47c4bd06ea50fcfdae2deb4','Unexpected source archive'
textures=out/'textures';textures.mkdir(exist_ok=True)
with zipfile.ZipFile(source) as archive:
 for name in archive.namelist():
  if name.startswith('0/') and len(Path(name).parts)==2:(textures/Path(name).name).write_bytes(archive.read(name))
stage=Usd.Stage.Open(str(source))
sk=UsdSkel.Skeleton(next(p for p in stage.Traverse() if p.GetTypeName()=='Skeleton'))
native=np.array([list(m.ExtractTranslation()) for m in sk.GetBindTransformsAttr().Get()])
meshes=[p for p in stage.Traverse() if p.GetTypeName()=='Mesh']
allpoints=np.concatenate([np.array(UsdGeom.Mesh(p).GetPointsAttr().Get()) for p in meshes])
low=allpoints[:,1].min();scale=1.78/(allpoints[:,1].max()-low)
def norm(p):return (np.asarray(p)-np.array([0,low,0]))*scale
joints=norm(native)
REST=np.array([[0,.94,.035],[0,1.42,.025],[0,1.66,.025],[.185,1.42,.02],[.325,1.25,.04],[.445,1.105,.13],[-.185,1.42,.02],[-.325,1.25,.04],[-.445,1.105,.13],[.1,.90,.035],[.14,.52,.05],[.19,.1,.035],[-.1,.90,.035],[-.14,.52,.05],[-.19,.1,.035],[.19,.04,.20],[-.19,.04,.20],[.565,.965,.25],[-.565,.965,.25]])
BONES=[(0,1),(1,2),(3,4),(4,5),(6,7),(7,8),(9,10),(10,11),(12,13),(13,14),(11,15),(14,16),(5,17),(8,18)]
eye=joints[[46,45]].mean(axis=0)
S=np.array([joints[2],joints[[71,99]].mean(axis=0),eye-[0,0,.07],joints[71],joints[52],joints[55],joints[99],joints[80],joints[83],joints[16],joints[13],joints[5],joints[31],joints[20],joints[21],joints[10],joints[27],joints[64]+(joints[64]-joints[63])*.65,joints[89]+(joints[89]-joints[88])*.65])
mapping={i:0 for i in range(len(joints))}
for indices,b in [([36,37,38,39,40,41,42,43,44,45,46,47,48],1),([71,72,50],2),([52,53,54,51],3),([99,100,78],4),([80,81,82,79],5),([16,17,3],6),([13,14,15,4],7),([31,32,18],8),([20,29,30,19],9),(range(5,13),10),([21,22,23,24,25,26,27,28],11),(range(55,71),12),(range(83,99),13)]:
 for index in indices:mapping[index]=b
transforms=[]
for k,(a,b) in enumerate(BONES):
 sv=S[b]-S[a];tv=REST[b]-REST[a];axis=sv/np.linalg.norm(sv);to=tv/np.linalg.norm(tv)
 cross=np.cross(axis,to);q=Rotation.from_quat([*cross,1+np.dot(axis,to)])
 # The native identity and expression are not sculpted or stretched.
 if k==1:a=2;q=Rotation.identity();factor=1
 else:factor=np.linalg.norm(tv)/np.linalg.norm(sv)
 transforms.append((a,q,axis,factor))
def deform(p,weights,delta=False):
 result=np.zeros(3)
 for bone,w in weights:
  a,q,axis,factor=transforms[bone];v=p.copy() if delta else p-S[a]
  v+=axis*np.dot(v,axis)*(factor-1);v=q.apply(v)
  result+=(v if delta else v+REST[a])*w
 return result
data=dict(sourceModel='Alina Ip — Jungle Jim',sourceRevision=digest,sourceFamily='authored-usd',body='female',positions=[],uv=[],weights=[],sourceVertices=[],materials=[],surfaceMaterials=[],groups=[],morphs={'AK_09_EyeBlinkLeft':[],'AK_10_EyeBlinkRight':[]},grips={k:[[],[]] for k in ['relaxed','clasp','closed']},eyes=[deform(joints[i],[[1,1]]).tolist() for i in [46,45]],rigidHead=dict(positions=[],uv=[],normals=[],groups=[]))
normalIds={};nativeRows=[]
for prim in meshes:
 materialPath=prim.GetRelationship('material:binding').GetTargets()[0];name=str(materialPath).split('/')[-1]
 # The USDZ contains two almost coincident textured eye shells. Retain the
 # outer authored surface once, with a physical clearcoat in the renderer.
 if name.startswith('Std_Eye_'):continue
 kind='Hair' if 'Hair' in name or 'Skullcap' in name else 'Eyelashes' if 'Eyelash' in name else 'Eyes' if 'Cornea' in name else 'Skin' if name.startswith('Std_Skin') or name=='Std_Nails' else 'Mouth' if name.startswith('Std_') else 'Clothes'
 shader=stage.GetPrimAtPath(str(materialPath)+'/tex_base');file=shader.GetAttribute('inputs:file').Get().path
 surface=dict(kind=kind,name=name,map=str(textures/Path(file).name),source=str(materialPath),muscleGuide=kind=='Skin' or (kind=='Clothes' and name!='Canvas_shoes'))
 normal=stage.GetPrimAtPath(str(materialPath)+'/tex_normal')
 if normal:surface['normalMap']=str(textures/Path(normal.GetAttribute('inputs:file').Get().path).name)
 if kind=='Clothes' and name=='Camisole':surface['color']='#c8e0f3'
 if name=='Hair_Transparency':surface['color']='#82786f'
 data['materials'].append(kind);data['surfaceMaterials'].append(surface);data['groups'].append([]);data['rigidHead']['groups'].append([])
 mesh=UsdGeom.Mesh(prim);raw=norm(np.array(mesh.GetPointsAttr().Get()));normals=np.array(mesh.GetNormalsAttr().Get())
 api=UsdGeom.PrimvarsAPI(prim);uv=np.array(api.GetPrimvar('st0').Get());pv=api.GetPrimvar('skel:jointIndices');width=pv.GetElementSize()
 indices=np.array(pv.Get()).reshape(-1,width);values=np.array(api.GetPrimvar('skel:jointWeights').Get()).reshape(-1,width)
 target=data['rigidHead'] if kind=='Hair' else data;start=len(target['positions'])//3
 target['groups'][-1]=[int(i)+start for i in mesh.GetFaceVertexIndicesAttr().Get()]
 assert set(mesh.GetFaceVertexCountsAttr().Get())=={3}
 for vi,(p,ii,ww) in enumerate(zip(raw,indices,values)):
  nativeWeights=[(int(i),float(w)) for i,w in zip(ii,ww) if w>1e-6];merged={}
  for i,w in nativeWeights:merged[mapping[i]]=merged.get(mapping[i],0)+w
  if kind in ['Hair','Eyes','Eyelashes','Mouth']:merged={1:1}
  total=sum(merged.values());weights=sorted((b,w/total) for b,w in merged.items());posed=deform(p,weights)
  target['positions'].extend(np.round(posed,6).tolist());target['uv'].extend(np.round(uv[vi],6).tolist())
  if kind=='Hair':target['normals'].extend(np.round(normals[vi],6).tolist())
  else:
   idx=len(data['weights']);data['weights'].append([[b,round(w,6)] for b,w in weights]);nativeRows.append((idx,posed,nativeWeights))
   # Match real source seams without welding opposite sides of alpha cards.
   key=(kind,*np.round(p,6),*np.round(normals[vi],3))
   if key not in normalIds:normalIds[key]=len(normalIds)
   data['sourceVertices'].append(normalIds[key])
 print('EXPORTED',name,len(raw),kind,flush=True)
# Finger movement uses the source's articulated finger weights and pivots.
digits=[[list(range(68,71)),list(range(65,68)),list(range(62,65)),list(range(59,62)),list(range(56,59))], [list(range(90,93)),list(range(93,96)),list(range(87,90)),list(range(84,87)),list(range(96,99))]]
for state,amount in [('relaxed',.14),('clasp',.58),('closed',.95)]:
 for side,chains in enumerate(digits):
  k=12+side;wrist=REST[5 if side==0 else 8]
  point=lambda i:deform(joints[i],[[k,1]])
  along=point(chains[2][0])-wrist;along/=np.linalg.norm(along)
  across=point(chains[1][0])-point(chains[4][0]);across/=np.linalg.norm(across)
  back=np.cross(along,across);back/=np.linalg.norm(back)
  if np.dot(back,[.68 if side==0 else -.68,.71,.18])<0:back=-back
  matrices={}
  for digit,chain in enumerate(chains):
   current=np.eye(4)
   for segment,index in enumerate(chain):
    p=point(index);direction=point(chain[min(segment+1,2)])-point(chain[max(segment-1,0)]);direction/=np.linalg.norm(direction)
    axis=np.cross(direction,-back);axis/=np.linalg.norm(axis);angle=[.75,1.05,.65][segment]*amount*(.65 if digit==0 else 1)
    rotation=Rotation.from_rotvec(axis*angle).as_matrix();matrix=np.eye(4);matrix[:3,:3]=rotation;matrix[:3,3]=p-rotation@p
    current=current@matrix;matrices[index]=current.copy()
  for idx,p,rows in nativeRows:
   delta=np.zeros(3)
   for index,w in rows:
    if index in matrices:delta+=(matrices[index][:3,:3]@p+matrices[index][:3,3]-p)*w
   if np.linalg.norm(delta)>1e-6:data['grips'][state][side].append([idx,*np.round(delta,6).tolist()])
hair=np.array(data['rigidHead']['positions']).reshape(-1,3)
data['rigidHead']['boundsHull']=hair[ConvexHull(hair).vertices].round(6).flatten().tolist()
data['sourceLicense']={'author':'Jungle Jim','title':'Alina Ip, realistic Asian woman (Animated)','url':'https://sketchfab.com/3d-models/600d4d4aa71c4181b2567a3605ce8c57','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','redistributionRevision':'d3ab9d9b1dc636fb625453254809722480dcfc1d'}
(out/'female.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print('TOTAL',len(data['weights']),'deformed vertices;',len(hair),'rigid hair vertices;',len(data['rigidHead']['boundsHull'])//3,'hull points',flush=True)
