"""Derive a fitted studio exercise outfit from the bundled CC BY 4.0 trainer.

No downloads. The original face, native tank, shoes, skin topology and rig are
kept together. Leggings are a shell of the source leg/pelvis surface, so clothes
cannot separate from the hips as independently retargeted garments did.
Run with Python and NumPy. Attribution stays in assets/authored/README.md.
"""
from pathlib import Path
import json,copy
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'frontend/src/health/components/character/assets'
d=json.loads((ASSETS/'authored/female.json').read_text())
original=np.array(d['positions']).reshape(-1,3)
rest=np.array([[0,.94,.035],[0,1.42,.025],[0,1.66,.025],[.185,1.42,.02],[.325,1.25,.04],[.445,1.105,.13],[-.185,1.42,.02],[-.325,1.25,.04],[-.445,1.105,.13],[.1,.90,.035],[.14,.52,.05],[.19,.1,.035],[-.1,.90,.035],[-.14,.52,.05],[-.19,.1,.035],[.19,.04,.20],[-.19,.04,.20],[.565,.965,.25],[-.565,.965,.25]])
bones=[(0,1),(1,2),(3,4),(4,5),(6,7),(7,8),(9,10),(10,11),(12,13),(13,14),(11,15),(14,16),(5,17),(8,18)]
def silhouette(point,weights):
 result=point.copy()
 for bone,weight in weights:
  if bone not in range(2,10):continue
  a,b=rest[list(bones[bone])];axis=b-a;length=np.linalg.norm(axis);axis/=length
  t=np.dot(point-a,axis)/length
  taper=np.sin(np.pi*np.clip(t,0,1))**2
  radial=point-a-axis*np.dot(point-a,axis)
  amount=.10 if bone in [2,4] else .06 if bone in [3,5,7,9] else .08
  result-=radial*amount*taper*weight
 # Keep the same chest contour in skin and the fitted native tank. The source
 # model's very projected chest exaggerated contact and the side silhouette.
 trunk=next((w for b,w in weights if b==0),0)
 result[2]-=max(0,point[2]-.10)*.25*np.exp(-((point[1]-1.30)/.12)**2)*trunk
 return result
positions=np.array([silhouette(p,w) for p,w in zip(original,d['weights'])])
# Shorter, softer lash wings; eyelid and eyeball surfaces are unchanged.
for i in set(d['groups'][6]):
 eye=np.array(d['eyes'][0 if positions[i,0]>0 else 1])
 positions[i,0]=eye[0]+(positions[i,0]-eye[0])*.9
 positions[i,1]=eye[1]+(positions[i,1]-eye[1])*.9
for shapes in [d['morphs'],{k+str(i):rows for k,sides in d['grips'].items() for i,rows in enumerate(sides)}]:
 for rows in shapes.values():
  for entry in rows:
   i=entry[0];entry[1:]=(silhouette(original[i]+entry[1:],d['weights'][i])-positions[i]).round(7).tolist()
# Continuous source skin becomes opaque fabric from the waistband to the shoes.
# It retains the exact original weights and welded UV seams at the hip/knee.
body=np.array(d['groups'][2]).reshape(-1,3)
low=[int(i) for tri in body if positions[tri,1].min()<1.065 for i in tri]
shirt=[int(i) for tri in body if positions[tri,1].min()>=1.065 and positions[tri,1].min()<1.43 for i in tri]
d['groups'][2]=[int(i) for tri in body if positions[tri,1].min()>=1.43 for i in tri]
# Remove covered toe/foot skin so it cannot show through the native sneakers.
legs=np.array(d['groups'][4]).reshape(-1,3)
leggings=[int(i) for tri in legs if positions[tri,1].max()>.115 for i in tri]+low
d['groups'][4]=[];d['groups'][8]=[]
# Average duplicated UV-seam normals before giving fabric its small thickness.
faces=np.array(leggings).reshape(-1,3);normals=np.zeros_like(positions)
for tri in faces:
 a,b,c=positions[tri];n=np.cross(b-a,c-a)
 for i in tri:normals[i]+=n
shared={}
for i in set(leggings):
 key=d['sourceVertices'][i];shared.setdefault(key,np.zeros(3));shared[key]+=normals[i]
for i in set(leggings):
 n=shared[d['sourceVertices'][i]];n=n/max(np.linalg.norm(n),1e-12)
 positions[i]+=n*.0015
material={'kind':'Clothes','name':'StudioLeggings','color':'#253d5b','muscleGuide':True,'assetFolder':'authored'}
d['surfaceMaterials'].append(material);d['materials'].append('Clothes');d['groups'].append(leggings);d['rigidHead']['groups'].append([])
material={'kind':'Clothes','name':'StudioTankPanel','color':'#82b4dc','muscleGuide':True,'assetFolder':'authored'}
d['surfaceMaterials'].append(material);d['materials'].append('Clothes');d['groups'].append(shirt);d['rigidHead']['groups'].append([])
for s in d['surfaceMaterials']:s['assetFolder']='authored'
d['surfaceMaterials'][7].update(name='StudioTrainingTank',color='#82b4dc',neutralFabric=True)
d['surfaceMaterials'][9].update(name='StudioSneakers',color='#eff3f8',neutralFabric=True)
# The dense main side-part and scalp remain. Remove only the separate sparse
# fringe cards that crossed the middle of the forehead and eyelids.
d['rigidHead']['groups'][16]=[]
d['positions']=positions.round(7).flatten().tolist()
used=sorted(set(i for group in d['groups'] for i in group));remap={old:new for new,old in enumerate(used)}
for key,width in [('positions',3),('uv',2)]:
 arr=np.array(d[key]).reshape(-1,width);d[key]=arr[used].flatten().tolist()
for key in ['weights','sourceVertices']:d[key]=[d[key][i] for i in used]
d['groups']=[[remap[i] for i in group] for group in d['groups']]
for key,rows in d['morphs'].items():d['morphs'][key]=[[remap[i],*delta] for i,*delta in rows if i in remap]
for key,sides in d['grips'].items():d['grips'][key]=[[[remap[i],*delta] for i,*delta in rows if i in remap] for rows in sides]
# Compact removed hair cards too; bounds are rebuilt by studioTrainerData.
hair=d['rigidHead'];used=sorted(set(i for group in hair['groups'] for i in group));remap={old:new for new,old in enumerate(used)}
for key,width in [('positions',3),('normals',3),('uv',2)]:hair[key]=np.array(hair[key]).reshape(-1,width)[used].flatten().tolist()
hair['groups']=[[remap[i] for i in group] for group in hair['groups']]
d['studioRevision']='fitted-training-outfit-and-limb-fit-v2'
d['additionalSources']={'outfit':'Derived from the same Alina Ip mesh, Jungle Jim, CC BY 4.0','source':'../authored/README.md'}
out=ASSETS/'studio';out.mkdir(exist_ok=True)
(out/'female.json').write_text(json.dumps(d,separators=(',',':'))+'\n')
print('Studio athlete:',len(d['weights']),'deformed vertices;',sum(len(g)//3 for g in d['groups']),'body/clothes triangles')
