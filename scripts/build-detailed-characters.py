"""Convert pinned MIT Rocketbox graphics to Synex's exercise rig.
Preserves authored UV seams, facial blendshapes, finger-joint weights and materials.
Source assets are fetched separately; this build never transmits user information.
"""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
ROOT=Path(__file__).resolve().parents[1]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=1: raise SystemExit('Usage: blender -b --python scripts/build-detailed-characters.py -- SOURCE_DIRECTORY')
SOURCE=Path(args[0])
OUT=ROOT/'frontend/src/health/components/character/assets/detailed';OUT.mkdir(parents=True,exist_ok=True)
REST=[(0,.94,.035),(0,1.42,.025),(0,1.66,.025),(.185,1.42,.02),(.325,1.25,.04),(.445,1.105,.13),(-.185,1.42,.02),(-.325,1.25,.04),(-.445,1.105,.13),(.1,.90,.035),(.14,.52,.05),(.19,.1,.035),(-.1,.90,.035),(-.14,.52,.05),(-.19,.1,.035),(.19,.04,.20),(-.19,.04,.20),(.565,.965,.25),(-.565,.965,.25)]
BONES=[(0,1),(1,2),(3,4),(4,5),(6,7),(7,8),(9,10),(10,11),(12,13),(13,14),(11,15),(14,16),(5,17),(8,18)]
T=[Vector(v) for v in REST]

def combine_surfaces(body,portrait):
 # Keep the body's proven deformation budget; spend extra vertices on the face
 # and eye curves. Original alpha cards stay intact. Preserve the neck seam.
 out={k:portrait[k] for k in ['sourceRevision','sourceModel','materials','eyes']}
 out.update(subdivisionLevels={'face':1,'body':0,'hair':0},positions=[],uv=[],weights=[],sourceVertices=[],groups=[[] for _ in body['groups']])
 origins=[];lookup={};canonical={};seamNormals={}
 bodySeam={body['sourceVertices'][i] for i in body['groups'][0]} & {body['sourceVertices'][i] for i in body['groups'][1]}
 for group in range(len(out['groups'])):
  refined=group in [1,len(out['groups'])-1];data=portrait if refined else body
  for old in data['groups'][group]:
   key=(refined,old)
   if key not in lookup:
    idx=len(origins);lookup[key]=idx;origins.append(key)
    xyz=data['positions'][old*3:old*3+3];poskey=tuple(round(v,5) for v in xyz)
    out['positions'].extend(xyz);out['uv'].extend(data['uv'][old*2:old*2+2]);out['weights'].append(data['weights'][old])
    source=data['sourceVertices'][old];normalKey=(refined,source)
    if normalKey not in canonical:
     canonical[normalKey]=seamNormals[poskey] if refined and group==1 and poskey in seamNormals else len(canonical)
    normal=canonical[normalKey]
    if not refined and source in bodySeam:seamNormals[poskey]=normal
    # Coincident front/back hair cards must keep opposite normals. Weld only
    # the actual shared head/body boundary, not every coincident coordinate.
    out['sourceVertices'].append(normal)
   out['groups'][group].append(lookup[key])
 def rows(field):
  result=[]
  for refined,data in [(False,body),(True,portrait)]:
   for old,*delta in field(data):
    idx=lookup.get((refined,old))
    if idx is not None:result.append([idx,*delta])
  return result
 out['morphs']={name:rows(lambda d:d['morphs'][name]) for name in portrait['morphs']}
 out['grips']={state:[rows(lambda d:d['grips'][state][side]) for side in range(2)] for state in body['grips']}
 return out

baseExports={}
for gender,name,detail in [(g,n,d) for g,n in [('female','Sports_Female_02'),('male','Sports_Male_04')] for d in [False,True]]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 src=SOURCE/name
 bpy.ops.import_scene.fbx(filepath=str(src/'Export'/f'{name}_facial.fbx'))
 obj=next(o for o in bpy.data.objects if o.type=='MESH' and 'hipoly' in o.name)
 arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 bounds=[obj.matrix_world@v.co for v in obj.data.vertices]
 sourceLo=min(v.z for v in bounds);sourceHeight=max(v.z for v in bounds)-sourceLo
 if detail:
  # Subdivide the authored topology BEFORE exporting UV seams. Evaluate
  # the same modifier on every facial target so lids remain fitted to the eyes.
  targets=['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight','AK_44_MouthSmileLeft','AK_45_MouthSmileRight']
  keys=obj.data.shape_keys.key_blocks
  for block in keys:block.value=0
  for modifier in list(obj.modifiers):obj.modifiers.remove(modifier)
  # Preserve eyelid/lip margins and alpha-card outlines: smoothing those borders
  # would open the closed mouth and shrink the hair away from the scalp.
  fixedGroups={g.index for g in obj.vertex_groups if 'lip' in g.name.lower() or 'eyeblink' in g.name.lower()}
  fixed={v.index for v in obj.data.vertices if sum(g.weight for g in v.groups if g.group in fixedGroups)>.15}
  hairEdges=set()
  if len(obj.data.materials)>2:
   for face in obj.data.polygons:
    if face.material_index==2:hairEdges.update(tuple(sorted(e)) for e in face.edge_keys)
  # Keep the original neck seam where portrait and body resolutions meet.
  edgeMaterials={}
  for face in obj.data.polygons:
   for edge in face.edge_keys:edgeMaterials.setdefault(tuple(sorted(edge)),set()).add(face.material_index)
  crease=obj.data.attributes.get('crease_edge') or obj.data.attributes.new('crease_edge','FLOAT','EDGE')
  corner=obj.data.attributes.get('crease_vert') or obj.data.attributes.new('crease_vert','FLOAT','POINT')
  for edge in obj.data.edges:
   if any(v in fixed for v in edge.vertices) or tuple(sorted(edge.vertices)) in hairEdges or len(edgeMaterials.get(tuple(sorted(edge.vertices)),set()))>1:crease.data[edge.index].value=1
   if len(edgeMaterials.get(tuple(sorted(edge.vertices)),set()))>1:
    for v in edge.vertices:corner.data[v].value=1
  sub=obj.modifiers.new('Portrait surface','SUBSURF');sub.levels=1;sub.render_levels=1
  graph=bpy.context.evaluated_depsgraph_get();graph.update()
  refined=bpy.data.meshes.new_from_object(obj.evaluated_get(graph),preserve_all_data_layers=True,depsgraph=graph)
  shapes={}
  for name0 in targets:
   block=keys.get(name0)
   if block:
    block.value=1;graph.update();evaluated=obj.evaluated_get(graph);mesh=evaluated.to_mesh()
    shapes[name0]=[v.co.copy() for v in mesh.vertices];evaluated.to_mesh_clear();block.value=0;graph.update()
  obj.modifiers.clear();obj.data=refined;obj.shape_key_add(name='Basis')
  for name0,points in shapes.items():
   block=obj.shape_key_add(name=name0)
   for v,p in zip(block.data,points):v.co=p
 def coord(v):return Vector((v.x,v.z,-v.y))
 raw=[coord(obj.matrix_world@v.co) for v in obj.data.vertices]
 lo=sourceLo;height=sourceHeight;scale=1.78/height
 def norm(v):p=coord(v);p.y-=lo;return p*scale
 base=[norm(obj.matrix_world@v.co) for v in obj.data.vertices]
 def joint(name):return norm(arm.matrix_world@arm.data.bones['Bip01 '+name].head_local)
 shoulders=(joint('L UpperArm')+joint('R UpperArm'))/2
 eye=(joint('LEye')+joint('REye'))/2
 head=Vector((0,eye.y,eye.z-.09*scale))
 S=[joint('Pelvis'),shoulders,head]
 for side in ['L','R']:S.extend(joint(side+' '+b) for b in ['UpperArm','Forearm','Hand'])
 for side in ['L','R']:S.extend(joint(side+' '+b) for b in ['Thigh','Calf','Foot'])
 S.extend(joint(side+' Toe0') for side in ['L','R'])
 for side in ['L','R']:
  tip=joint(side+' Finger22');prev=joint(side+' Finger21');S.append(tip+(tip-prev)*.65)
 def mapped(name):
  if name.startswith('Bip01 L '):side=0
  elif name.startswith('Bip01 R '):side=1
  else:return 0 if name in ['Bip01 Pelvis','Bip01 Spine','Bip01 Spine1','Bip01 Spine2'] else 1
  tail=name.split(' ',2)[2]
  if tail.startswith(('Hand','Finger')):return 12+side
  return {'UpperArm':2+side*2,'Forearm':3+side*2,'Thigh':6+side*2,'Calf':7+side*2,'Foot':10+side,'Toe0':10+side}.get(tail,0)
 transforms=[]
 for k,(a,b) in enumerate(BONES):
  sv=S[b]-S[a];tv=T[b]-T[a];q=sv.rotation_difference(tv);factor=tv.length/sv.length
  # Face/hand/foot detail keeps transverse proportions; only the segment axis scales.
  transforms.append((a,q,sv.normalized(),factor))
 def weights(v):
  merged={}
  for g in v.groups:
   b=mapped(obj.vertex_groups[g.group].name);merged[b]=merged.get(b,0)+g.weight
  total=sum(merged.values())
  return [[b,w/total] for b,w in merged.items() if w>.00001] if total else [[0,1]]
 weights0=[weights(v) for v in obj.data.vertices]
 def deform(p,ws,delta=False):
  out=Vector()
  for k,w in ws:
   a,q,axis,factor=transforms[k];v=p if delta else p-S[a];v=v+axis*(v.dot(axis)*(factor-1));v=q@v
   out+=(v if delta else v+T[a])*w
  return out
 posed=[deform(p,w) for p,w in zip(base,weights0)]
 # Mesh and complete facial targets are split only at UV/material seams.
 obj.data.calc_loop_triangles();uv=obj.data.uv_layers.active.data
 vertices=[];coords=[];ws=[];groups=[[] for m in obj.data.materials]+[[]];lookup={};original=[]
 eyeGroups={g.index for g in obj.vertex_groups if g.name in ['Bip01 LEye','Bip01 REye']}
 def eyeball(vi):return sum(g.weight for g in obj.data.vertices[vi].groups if g.group in eyeGroups)>.9
 for tri in obj.data.loop_triangles:
  material=len(groups)-1 if all(eyeball(vi) for vi in tri.vertices) else tri.material_index
  for vi,li in zip(tri.vertices,tri.loops):
   u=tuple(round(v,6) for v in uv[li].uv);key=(vi,u)
   if key not in lookup:
    lookup[key]=len(vertices)//3;original.append(vi);vertices.extend(round(v,6) for v in posed[vi]);coords.extend(u);ws.append([[b,round(w,6)] for b,w in weights0[vi]])
   groups[material].append(lookup[key])
 morphs={}
 for target in ['AK_09_EyeBlinkLeft','AK_10_EyeBlinkRight','AK_44_MouthSmileLeft','AK_45_MouthSmileRight']:
  block=obj.data.shape_keys.key_blocks.get(target);rows=[]
  if block:
   for i,vi in enumerate(original):
    rawDelta=obj.matrix_world.to_3x3()@(block.data[vi].co-obj.data.vertices[vi].co)
    delta=deform(coord(rawDelta)*scale,weights0[vi],True)
    if delta.length>.00001:rows.append([i,*[round(v,6) for v in delta]])
  morphs[target]=rows
 grips={}
 for state,amount in [('relaxed',.18),('clasp',.62),('closed',1.0)]:
  hands=[]
  for side,label in enumerate(['L','R']):
   bone=12+side;wrist=T[5 if side==0 else 8]
   pts=lambda name:deform(joint(label+' '+name),[[bone,1]])
   along=(pts('Finger2')-wrist).normalized();across=(pts('Finger1')-pts('Finger4')).normalized()
   back=along.cross(across).normalized();guide=Vector(((1 if side==0 else -1)*.68,.71,.18))
   if back.dot(guide)<0:back=-back
   matrices={}
   for digit in range(5):
    names=[f'Finger{digit}',f'Finger{digit}1',f'Finger{digit}2'];points=[pts(n) for n in names]
    current=Matrix.Identity(4)
    for j,n in enumerate(names):
     direction=(points[min(j+1,2)]-points[max(0,j-1)]).normalized();axis=direction.cross(-back).normalized()
     angle=[.75,1.05,.65][j]*amount*(.65 if digit==0 else 1)
     q=Quaternion(axis,angle);current=current@Matrix.Translation(points[j])@q.to_matrix().to_4x4()@Matrix.Translation(-points[j])
     matrices['Bip01 '+label+' '+n]=current.copy()
   moved=[]
   for i,vi in enumerate(original):
    delta=Vector()
    for group in obj.data.vertices[vi].groups:
     name0=obj.vertex_groups[group.group].name
     if name0 in matrices:delta+=(matrices[name0]@posed[vi]-posed[vi])*group.weight
    if delta.length>.000001:moved.append([i,*[round(v,6) for v in delta]])
   hands.append(moved)
  grips[state]=hands
 out={'sourceRevision':'0943055db6ec570bcef9f2c8b41c9e5467c808f9','sourceModel':name,'subdivisionLevels':1,'positions':vertices,'sourceVertices':original,'uv':coords,'weights':ws,'materials':[m.name for m in obj.data.materials]+['Cornea'],'groups':groups,'morphs':morphs,'grips':grips,'eyes':[list(deform(joint(n),[[1,1]])) for n in ['LEye','REye']]}
 if not detail:
  baseExports[gender]=out
  continue
 out=combine_surfaces(baseExports.pop(gender),out)
 (OUT/f'{gender}.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
 print('EXPORTED',gender,'vertices',len(out['weights']),'triangles',sum(map(len,out['groups']))//3,'height',height,'range',[min(p[k] for p in posed) for k in range(3)],[max(p[k] for p in posed) for k in range(3)])
