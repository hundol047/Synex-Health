"""Convert the pinned pixiv VRM sample to the shared exercise rig.

Python + numpy/scipy/Pillow. Reads only GLB data; no third-party code executes.
Retains the coordinated native face, eyes, expression shapes, clothes and hair.
The VRM Public License 1.0 and embedded permissions are retained in the output.
"""
import hashlib,json,struct,sys,io
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from PIL import Image
if len(sys.argv)!=3:raise SystemExit('build-vtuber-trainer.py INPUT.vrm OUTPUT_DIRECTORY')
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
blob=source.read_bytes();digest=hashlib.sha256(blob).hexdigest()
assert digest=='12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2','Unexpected VRM source'
size=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+size]);raw=blob[28+size:]
vrm=g['extensions']['VRMC_vrm'];meta=vrm['meta']
assert meta['allowRedistribution'] and meta['modification']=='allowModificationRedistribution' and meta['commercialUsage']=='corporation'
types={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
def view(index,count,width,kind,offset=0):
 v=g['bufferViews'][index];t=np.dtype(types[kind]);return np.ndarray((count,width),dtype=t,buffer=raw,offset=v.get('byteOffset',0)+offset,strides=(v.get('byteStride',t.itemsize*width),t.itemsize)).copy()
def accessor(index):
 a=g['accessors'][index];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 r=view(a['bufferView'],a['count'],width,a['componentType'],a.get('byteOffset',0)) if 'bufferView'in a else np.zeros((a['count'],width))
 if 'sparse'in a:
  s=a['sparse'];ix=s['indices'];va=s['values'];ids=view(ix['bufferView'],s['count'],1,ix['componentType'],ix.get('byteOffset',0)).flatten();r[ids]=view(va['bufferView'],s['count'],width,a['componentType'],va.get('byteOffset',0))
 if a.get('normalized') and a['componentType']!=5126:r=r/np.iinfo(types[a['componentType']]).max
 return r
native={}
for skin in g['skins']:
 matrices=np.linalg.inv(accessor(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1))
 for index,m in zip(skin['joints'],matrices):native[index]=m[:3,3]
allpoints=np.concatenate([accessor(p['attributes']['POSITION']) for m in g['meshes'] for p in m['primitives']])
low=allpoints[:,1].min();scale=1.78/(allpoints[:,1].max()-low)
def norm(p):return (np.asarray(p)-np.array([0,low,0]))*scale
native={k:norm(v) for k,v in native.items()}
human={k:v['node'] for k,v in vrm['humanoid']['humanBones'].items()}
point=lambda name:native[human[name]]
REST=np.array([[0,.94,.035],[0,1.42,.025],[0,1.66,.025],[.185,1.42,.02],[.325,1.25,.04],[.445,1.105,.13],[-.185,1.42,.02],[-.325,1.25,.04],[-.445,1.105,.13],[.1,.90,.035],[.14,.52,.05],[.19,.1,.035],[-.1,.90,.035],[-.14,.52,.05],[-.19,.1,.035],[.19,.04,.20],[-.19,.04,.20],[.565,.965,.25],[-.565,.965,.25]])
BONES=[(0,1),(1,2),(3,4),(4,5),(6,7),(7,8),(9,10),(10,11),(12,13),(13,14),(11,15),(14,16),(5,17),(8,18)]
eye=(point('leftEye')+point('rightEye'))/2
finger=lambda side:point(side+'MiddleDistal')+(point(side+'MiddleDistal')-point(side+'MiddleIntermediate'))*.7
S=np.array([point('hips'),(point('leftUpperArm')+point('rightUpperArm'))/2,eye-[0,0,.07],point('leftUpperArm'),point('leftLowerArm'),point('leftHand'),point('rightUpperArm'),point('rightLowerArm'),point('rightHand'),point('leftUpperLeg'),point('leftLowerLeg'),point('leftFoot'),point('rightUpperLeg'),point('rightLowerLeg'),point('rightFoot'),point('leftToes'),point('rightToes'),finger('left'),finger('right')])
# Keep the source hand length instead of stretching its small native fingers.
for a,b in [(5,17),(8,18)]:REST[b]=REST[a]+(REST[b]-REST[a])/np.linalg.norm(REST[b]-REST[a])*np.linalg.norm(S[b]-S[a])
transforms=[]
for k,(a,b) in enumerate(BONES):
 v=S[b]-S[a];t=REST[b]-REST[a];axis=v/np.linalg.norm(v);to=t/np.linalg.norm(t);q=Rotation.from_quat([*np.cross(axis,to),1+np.dot(axis,to)])
 if k==1:a=2;q=Rotation.identity();factor=1
 else:factor=np.linalg.norm(t)/np.linalg.norm(v)
 transforms.append((a,q,axis,factor))
def deform(p,weights,delta=False):
 r=np.zeros(3)
 for k,w in weights:
  a,q,axis,factor=transforms[k];v=p.copy() if delta else p-S[a];v+=axis*np.dot(v,axis)*(factor-1);v=q.apply(v);r+=(v if delta else v+REST[a])*w
 return r
parents={child:i for i,node in enumerate(g['nodes'])for child in node.get('children',[])}
byname={node:name for name,node in human.items()}
labels={'hips':0,'spine':0,'chest':0,'upperChest':0,'neck':1,'head':1,'leftEye':1,'rightEye':1,'leftUpperArm':2,'leftLowerArm':3,'rightUpperArm':4,'rightLowerArm':5,'leftUpperLeg':6,'leftLowerLeg':7,'rightUpperLeg':8,'rightLowerLeg':9,'leftFoot':10,'leftToes':10,'rightFoot':11,'rightToes':11,'leftHand':12,'rightHand':13}
for name in human:
 if any(d in name for d in ['Thumb','Index','Middle','Ring','Little']):labels[name]=12 if name.startswith('left') else 13
mapping={}
for i,node in enumerate(g['nodes']):
 p=i
 while p not in byname and p in parents:p=parents[p]
 k=labels.get(byname.get(p),0);name=node.get('name','')
 # Native helper/twist bones name the limb they deform, even when parented to
 # hips or shoulder for constraints. Do not bind a trouser leg to the torso.
 side=0 if '_L_'in name else 1
 if 'UpperLeg'in name:k=6+side*2
 elif 'LowerLeg'in name:k=7+side*2
 elif 'UpperArm'in name:k=2+side*2
 elif 'LowerArm'in name or 'Elbow'in name:k=3+side*2
 elif 'Hand'in name:k=12+side
 mapping[i]=k
maps={}
for material in g['materials']:
 tex=material.get('pbrMetallicRoughness',{}).get('baseColorTexture')
 if not tex:continue
 index=g['textures'][tex['index']]['source']
 if index in maps:continue
 im=g['images'][index];v=g['bufferViews'][im['bufferView']];b=raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 image=Image.open(io.BytesIO(b));image.thumbnail((2048,2048));name=f'map-{index}.webp';image.save(out/name,quality=94,method=6);maps[index]=name
materials=[]
for material in g['materials']:
 name=material['name'];kind='Hair' if 'HAIR'in name else 'Eyes' if 'EYE'in name else 'Skin' if 'SKIN'in name else 'Clothes' if 'CLOTH'in name else 'Face'
 tex=material['pbrMetallicRoughness'].get('baseColorTexture');s={'name':name,'kind':kind,'assetFolder':'vtuber','alphaMode':material.get('alphaMode','OPAQUE'),'doubleSided':material.get('doubleSided',False),'toon':True,'muscleGuide':kind in ['Skin','Clothes'] and 'Shoes'not in name}
 if tex:s['map']=maps[g['textures'][tex['index']]['source']]
 s['mtoon']=material['extensions']['VRMC_materials_mtoon'];materials.append(s)
data=dict(sourceModel='VRM1 Constraint Twist Sample — pixiv Inc.',sourceFamily='vrm-toon',sourceRevision='5a3242b66124386c32b085c6693d9059040e72e5',sourceSha256=digest,body='female',rest=REST.tolist(),positions=[],uv=[],weights=[],sourceVertices=[],materials=[m['kind']for m in materials],surfaceMaterials=materials,groups=[[]for _ in materials],morphs={'AK_09_EyeBlinkLeft':[],'AK_10_EyeBlinkRight':[],'vtuberRelaxed':[],'vtuberHairSway':[]},grips={k:[[],[]]for k in ['relaxed','clasp','closed']},eyes=[deform(point(side+'Eye'),[[1,1]]).tolist()for side in ['left','right']],sourceLicense=meta)
ids={};nativeRows=[]
expressions=vrm['expressions']['preset']
for ni,node in enumerate(g['nodes']):
 if 'mesh'not in node:continue
 skin=g['skins'][node['skin']]
 for p in g['meshes'][node['mesh']]['primitives']:
  attrs=p['attributes'];points=norm(accessor(attrs['POSITION']));uv=accessor(attrs['TEXCOORD_0']);uv[:,1]=1-uv[:,1];normals=accessor(attrs['NORMAL']);joints=accessor(attrs['JOINTS_0']);values=accessor(attrs['WEIGHTS_0']);gi=p['material'];kind=materials[gi]['kind'];offset=len(data['weights'])
  data['groups'][gi].extend((accessor(p['indices']).flatten()+offset).astype(int).tolist())
  for vi,(pnt,jj,ww)in enumerate(zip(points,joints,values)):
   nativeW=[(skin['joints'][int(j)],float(w))for j,w in zip(jj,ww)if w>1e-6];merged={}
   for j,w in nativeW:merged[mapping[j]]=merged.get(mapping[j],0)+w
   if kind in ['Hair','Eyes','Face']:merged={1:1}
   total=sum(merged.values());weights=sorted((k,w/total)for k,w in merged.items());posed=deform(pnt,weights)
   data['positions'].extend(posed.round(6).tolist());data['uv'].extend(uv[vi].round(7).tolist());data['weights'].append([[k,round(w,7)]for k,w in weights]);nativeRows.append((posed,nativeW))
   key=(kind,*np.round(pnt,6),*np.round(normals[vi],3));ids.setdefault(key,len(ids));data['sourceVertices'].append(ids[key])
   if kind=='Hair':
    # A small deterministic tip sway; roots stay anchored. Not hair simulation.
    amount=max(0,min(1,(1.70-posed[1])/.45))**2
    if amount>0:data['morphs']['vtuberHairSway'].append([offset+vi,round(.008*amount,6),0,0])
  for label,expression in [('AK_09_EyeBlinkLeft','blinkLeft'),('AK_10_EyeBlinkRight','blinkRight'),('vtuberRelaxed','relaxed')]:
   for bind in expressions[expression].get('morphTargetBinds',[]):
    if bind['node']!=ni:continue
    target=p.get('targets',[])[bind['index']]
    if 'POSITION'not in target:continue
    delta=accessor(target['POSITION'])*scale*bind['weight']
    for vi,v in enumerate(delta):
     if np.linalg.norm(v)>1e-7:data['morphs'][label].append([offset+vi,*deform(v,data['weights'][offset+vi],True).round(6).tolist()])
# Use the source finger joints/weights for relaxed, clasped and closed grips.
for state,amount in [('relaxed',.14),('clasp',.58),('closed',.95)]:
 for side,prefix in enumerate(['left','right']):
  chains=[[human[prefix+'Thumb'+part]for part in ['Metacarpal','Proximal','Distal']]]+[[human[prefix+digit+part]for part in ['Proximal','Intermediate','Distal']]for digit in ['Index','Middle','Ring','Little']]
  k=12+side;wrist=REST[5 if side==0 else 8];pt=lambda i:deform(native[i],[[k,1]])
  along=pt(chains[2][0])-wrist;along/=np.linalg.norm(along);across=pt(chains[1][0])-pt(chains[4][0]);across/=np.linalg.norm(across);back=np.cross(along,across);back/=np.linalg.norm(back)
  if np.dot(back,[.68 if side==0 else -.68,.71,.18])<0:back=-back
  matrices={}
  for digit,chain in enumerate(chains):
   current=np.eye(4)
   for segment,index in enumerate(chain):
    pivot=pt(index);direction=pt(chain[min(segment+1,2)])-pt(chain[max(segment-1,0)]);direction/=np.linalg.norm(direction);axis=np.cross(direction,-back);axis/=np.linalg.norm(axis)
    rot=Rotation.from_rotvec(axis*[.75,1.05,.65][segment]*amount*(.65 if digit==0 else 1)).as_matrix();m=np.eye(4);m[:3,:3]=rot;m[:3,3]=pivot-rot@pivot;current=current@m;matrices[index]=current.copy()
  for idx,(pnt,rows)in enumerate(nativeRows):
   delta=np.zeros(3)
   for index,w in rows:
    if index in matrices:delta+=(matrices[index][:3,:3]@pnt+matrices[index][:3,3]-pnt)*w
   if np.linalg.norm(delta)>1e-6:data['grips'][state][side].append([idx,*delta.round(6).tolist()])
(out/'female.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
(out/'license-settings.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Converted',len(data['weights']),'vertices,',sum(len(g)//3 for g in data['groups']),'triangles; textures',len(maps));print('morphs',{k:len(v)for k,v in data['morphs'].items()})
