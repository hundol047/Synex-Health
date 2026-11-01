"""Build adult exercise trainers from MPFB 2.0.18 and licensed graphic assets.
Only the exported graphical data is bundled; MPFB's GPL tool code is not copied.
See assets/trainer/README.md for provenance, inputs, and reproduction steps.
"""
import sys,bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)!=4:raise SystemExit('Usage: blender -b --python scripts/build-trainer-character.py -- MPFB_SOURCE ASSET_ROOT OUTPUT_DIRECTORY female|male')
MPFB=Path(args[0]).resolve();ASSETS=Path(args[1]).resolve();OUT=Path(args[2]).resolve();OUT.mkdir(parents=True,exist_ok=True)
ROOT=OUT/'build-cache';ROOT.mkdir(exist_ok=True)
sys.path.insert(0,str(MPFB/'src'))
bpy.utils.extension_path_user=lambda *a,**kw:str(ROOT/'user')
import mpfb
bpy.context.preferences.addons.new().module='mpfb'
original_preference=mpfb.get_preference
mpfb.get_preference=lambda name:str(ROOT/'user') if name=='mpfb_user_data' else original_preference(name)
mpfb.register()
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService
from mpfb.services.locationservice import LocationService
from mpfb.services.assetservice import AssetService

REST=[(0,.94,.035),(0,1.42,.025),(0,1.66,.025),(.185,1.42,.02),(.325,1.25,.04),(.445,1.105,.13),(-.185,1.42,.02),(-.325,1.25,.04),(-.445,1.105,.13),(.1,.90,.035),(.14,.52,.05),(.19,.1,.035),(-.1,.90,.035),(-.14,.52,.05),(-.19,.1,.035),(.19,.04,.20),(-.19,.04,.20),(.565,.965,.25),(-.565,.965,.25)]
BONES=[(0,1),(1,2),(3,4),(4,5),(6,7),(7,8),(9,10),(10,11),(12,13),(13,14),(11,15),(14,16),(5,17),(8,18)]
T=[Vector(v) for v in REST]
body=args[3]
if body not in ['female','male']:raise SystemExit('Invalid body profile')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
macro=TargetService.get_default_macro_info_dict();macro.update(gender=0 if body=='female' else 1,age=.5,muscle=.5 if body=='female' else .6,weight=.4,cupsize=.4,firmness=.7);macro['race']={'asian':.8,'caucasian':.2,'african':0}
base=HumanService.create_human(macro_detail_dict=macro)
faceTargets=[('head/head-oval',.22),('head/head-age-decr',.18),('nose/nose-scale-horiz-decr',.10),
 ('chin/chin-width-decr',.12 if body=='female' else .04),('chin/chin-prominent-decr',.12),
 ('mouth/mouth-scale-depth-decr',.18),('mouth/mouth-scale-vert-decr',.16),
 ('expression/units/asian/mouth-compression',.75),('mouth/mouth-upperlip-middle-down',.12),
 ('mouth/mouth-angles-up',.14),('mouth/mouth-lowerlip-volume-decr',.12)]
for side in ['l','r']:
 faceTargets.extend([(f'cheek/{side}-cheek-bones-decr',.08),(f'cheek/{side}-cheek-volume-incr',.08)])
for name,value in faceTargets:
 TargetService.load_target(base,str(Path(LocationService.get_mpfb_data('targets'))/(name+'.target.gz')),weight=value)
rig=HumanService.add_builtin_rig(base,'default')
graph=bpy.context.evaluated_depsgraph_get();graph.update()
ev=base.evaluated_get(graph);mesh=ev.to_mesh();bounds=[base.matrix_world@v.co for v in mesh.vertices];lo=min(p.z for p in bounds);scale=1.78/(max(p.z for p in bounds)-lo);ev.to_mesh_clear()
print('SCALE',scale,lo,flush=True)
# Each authored MHCLO is fitted by MPFB before the exercise-rig conversion.
brow='eyebrow005' if body=='female' else 'eyebrow001'
files=[('eyes/high-poly/high-poly.mhclo','Eyes'),(f'eyebrows/{brow}/{brow}.mhclo','Eyebrows'),('eyelashes/eyelashes01/eyelashes01.mhclo','Eyelashes'),('hair/bob02/bob02.mhclo','Hair'),('clothes/female_sportsuit01/female_sportsuit01.mhclo','Clothes'),('clothes/shoes06/shoes06.mhclo','Clothes')]
files.append(('clothes/toigo_basic_tucked_t-shirt/toigo_basic_tucked_t-shirt.mhclo','Clothes'))
if body=='male':files=[('hair/short02/short02.mhclo',k) if k=='Hair' else (p,k) for p,k in files]
skin='skins/bobby_03_young_female_hairless/bobby_03_young_female_hairless.mhmat' if body=='female' else 'skins/young_asian_male/young_asian_male.mhmat'
meshes=[(base,'Skin',ASSETS/skin)]
for rel,kind in files:
 path=ASSETS/rel
 obj=HumanService.add_mhclo_asset(str(path),base,asset_type=kind,subdiv_levels=0,material_type='GAMEENGINE')
 text=path.read_text();mat=next(line.split(None,1)[1].strip() for line in text.splitlines() if line.startswith('material '))
 meshes.append((obj,kind,path.parent/mat))
# Keep masks that remove helpers and clothed skin. A single head refinement can
# be evaluated later; the prototype retains native topology and authored UVs.
for obj,kind,_ in meshes:
 for m in obj.modifiers:
  if m.type=='SUBSURF':m.levels=0;m.render_levels=0
# A relaxed upper lid covers part of the iris instead of holding a surprised
# wide-open expression. Skin and lashes use the same native facial pivots.
lidRest={'orbicularis03':.075 if body=='female' else .045,'orbicularis04':-.018 if body=='female' else -.008}
def set_lid(label,closed=False):
 for n,angle in ({'orbicularis03':.43,'orbicularis04':-.18} if closed else lidRest).items():
  bone=rig.pose.bones[n+'.'+label];bone.rotation_mode='QUATERNION';basis=bone.bone.matrix_local.to_3x3();bone.rotation_quaternion=Quaternion(basis.inverted()@Vector((1,0,0)),angle)
for label in ['L','R']:set_lid(label)
# Uniform scale to a standard exercise height, no facial-axis stretch.
graph=bpy.context.evaluated_depsgraph_get();graph.update()

def norm(v):return Vector((v.x,v.z-lo,-v.y))*scale
def joint(name,tail=False):
 b=rig.data.bones[name];return norm(rig.matrix_world@(b.tail_local if tail else b.head_local))
S=[joint('root',True),(joint('upperarm01.L')+joint('upperarm01.R'))/2,Vector()]
eye=(joint('eye.L')+joint('eye.R'))/2;S[2]=Vector((0,eye.y,eye.z-.07))
for side in ['L','R']:S.extend(joint(n+'.'+side) for n in ['upperarm01','lowerarm01','wrist'])
for side in ['L','R']:S.extend(joint(n+'.'+side) for n in ['upperleg01','lowerleg01','foot'])
S.extend(joint('toe3-1.'+side) for side in ['L','R'])
S.extend(joint('finger3-3.'+side,True) for side in ['L','R'])
transforms=[]
for k,(a,b) in enumerate(BONES):
 sv=S[b]-S[a];tv=T[b]-T[a];transforms.append((a,sv.rotation_difference(tv),sv.normalized(),tv.length/sv.length))
def mapped(name):
 side=0 if name.endswith('.L') else 1
 if name.startswith(('finger','wrist','metacarpal')):return 12+side
 if name.startswith('upperarm'):return 2+2*side
 if name.startswith('lowerarm'):return 3+2*side
 if name.startswith('upperleg'):return 6+2*side
 if name.startswith('lowerleg'):return 7+2*side
 if name.startswith(('foot','toe')):return 10+side
 if name.startswith(('root','spine','pelvis','breast','shoulder')):return 0
 return 1

def deform(p,ws,delta=False):
 out=Vector()
 for k,w in ws:
  a,q,axis,factor=transforms[k]
  # Eyes, mouth and cranium retain their original aspect ratio. Retargeting a
  # spine segment must never lengthen a face along with the neck.
  if k==1:a=2;factor=1
  v=p if delta else p-S[a];v=v+axis*(v.dot(axis)*(factor-1));v=q@v
  out+=(v if delta else v+T[a])*w
 return out
out=dict(sourceModel='MPFB adult trainer',sourceRevision='d0a32e57a7f915cb2f2b95410e2117648c7bbb7e',positions=[],uv=[],weights=[],sourceVertices=[],groups=[],materials=[],surfaceMaterials=[],morphs={'AK_09_EyeBlinkLeft':[],'AK_10_EyeBlinkRight':[]},grips={k:[[],[]] for k in ['relaxed','clasp','closed']},eyes=[list(deform(joint('eye.'+s),[[1,1]])) for s in ['L','R']],profile=macro,faceTargets=dict(faceTargets),lidRest=lidRest)
sourceOffset=0
for obj,kind,material in meshes:
 graph.update();ev=obj.evaluated_get(graph);mesh=ev.to_mesh(preserve_all_data_layers=True,depsgraph=graph);mesh.calc_loop_triangles()
 raw=[norm(obj.matrix_world@v.co) for v in mesh.vertices]
 # Keep the trousers from the sportsuit; the authored full tee replaces its
 # cropped top. Connected components avoid cutting triangles at the waist.
 excluded=set()
 if 'female_sportsuit01' in str(material):
  neighbors=[[] for _ in raw]
  for edge in mesh.edges:
   a,b=edge.vertices;neighbors[a].append(b);neighbors[b].append(a)
  remaining=set(range(len(raw)))
  while remaining:
   seed=remaining.pop();component={seed};pending=[seed]
   while pending:
    for vi in neighbors[pending.pop()]:
     if vi in remaining:remaining.remove(vi);component.add(vi);pending.append(vi)
   if min(raw[vi].y for vi in component)>.5:excluded.update(component)
 originalWeights=[];weights=[]
 for v in mesh.vertices:
  original={obj.vertex_groups[g.group].name:g.weight for g in v.groups if obj.vertex_groups[g.group].name in rig.data.bones and g.weight>1e-6};originalWeights.append(original)
  w={}
  for name,value in original.items():k=mapped(name);w[k]=w.get(k,0)+value
  if kind in ['Eyes','Eyebrows','Eyelashes','Hair']:w={1:1}
  total=sum(w.values());weights.append([[k,v/total] for k,v in w.items()] if total else [[1 if raw[v.index].y>1.48 else 0,1]])
 posed=[deform(p,w) for p,w in zip(raw,weights)]
 if kind=='Hair' and body=='female':
  # Lift the stock bob's heavy front fringe above both eyes. The smooth
  # falloff keeps the crown, side locks and rear silhouette intact.
  smooth=lambda t:(lambda v:v*v*(3-2*v))(max(0,min(1,t)))
  for p in posed:
   front=smooth((p.z-.075)/.045)
   p.y+=.060*front*math.exp(-((p.y-1.67)/.075)**2-(p.x/.085)**6)
 # The exercise rig slightly changes the abdomen/pelvis blend. Preserve a
 # 4 mm fitting allowance at the waistband so it does not expose skin flecks.
 if 'female_sportsuit01' in str(material):
  for p in posed:
   amount=.004*max(0,min(1,(p.y-.90)/.08))
   radial=Vector((p.x,0,p.z-.035))
   if radial.length>1e-6:p+=radial.normalized()*amount
 uv=mesh.uv_layers.active.data;lookup={};orig=[];indices=[]
 for tri in mesh.loop_triangles:
  if any(vi in excluded for vi in tri.vertices):continue
  # Cornea's separate UV island is an optical shell, not opaque sclera.
  # Runtime uses a clearcoat lobe on the underlying globe.
  if kind=='Eyes' and all(uv[li].uv.x>.85 and uv[li].uv.y<.15 for li in tri.loops):continue
  if (posed[tri.vertices[1]]-posed[tri.vertices[0]]).cross(posed[tri.vertices[2]]-posed[tri.vertices[0]]).length<1e-10:continue
  for vi,li in zip(tri.vertices,tri.loops):
   u=tuple(round(x,6) for x in uv[li].uv);key=(vi,u)
   if key not in lookup:
    idx=len(out['weights']);lookup[key]=idx;orig.append((idx,vi));out['positions'].extend(round(v,6) for v in posed[vi]);out['uv'].extend(u);out['weights'].append([[b,round(w,6)] for b,w in weights[vi]]);out['sourceVertices'].append(sourceOffset+vi)
   indices.append(lookup[key])
 out['groups'].append(indices);out['materials'].append(kind)
 mh={}
 for line in material.read_text().splitlines():
  if line.strip() and not line.lstrip().startswith('#'):
   pair=line.split(None,1)
   if len(pair)==2:mh[pair[0]]=pair[1]
 surface={'kind':kind,'map':str(material.parent/mh['diffuseTexture']),'muscleGuide':kind=='Skin' or (kind=='Clothes' and 'shoes06' not in str(material))}
 if kind=='Hair' and body=='female':surface['color']='#40362f'
 if 't_shirt_basic_tucked' in str(material):surface['color']='#a4c8ef'
 if 'normalmapTexture' in mh:surface['normalMap']=str(material.parent/mh['normalmapTexture'])
 bump=mh.get('bumpmapTexture',mh.get('bumpTexture'))
 if bump:surface['bumpMap']=str(material.parent/bump)
 surface['source']=str(material.relative_to(ASSETS));out['surfaceMaterials'].append(surface)
 # Finger curls use the source's real articulated weights, in exercise rest space.
 if kind=='Skin':
  for state,amount in [('relaxed',.16),('clasp',.58),('closed',.95)]:
   for side,label in enumerate(['L','R']):
    k=12+side;wrist=T[5 if side==0 else 8]
    pts=lambda n,tail=False:deform(joint(n+'.'+label,tail),[[k,1]])
    along=(pts('finger3-1')-wrist).normalized();across=(pts('finger2-1')-pts('finger5-1')).normalized();back=along.cross(across).normalized()
    guide=Vector(((1 if side==0 else -1)*.68,.71,.18))
    if back.dot(guide)<0:back=-back
    matrices={}
    for digit in range(1,6):
     current=Matrix.Identity(4)
     for segment in range(1,4):
      name=f'finger{digit}-{segment}';p=pts(name);direction=(pts(name,True)-p).normalized();axis=direction.cross(-back).normalized();angle=[.75,1.05,.65][segment-1]*amount*(.65 if digit==1 else 1)
      current=current@Matrix.Translation(p)@Quaternion(axis,angle).to_matrix().to_4x4()@Matrix.Translation(-p);matrices[name+'.'+label]=current.copy()
    for idx,vi in orig:
     delta=Vector()
     for n,w in originalWeights[vi].items():
      if n in matrices:delta+=(matrices[n]@posed[vi]-posed[vi])*w
     if delta.length>1e-6:out['grips'][state][side].append([idx,*[round(v,6) for v in delta]])
 # Native eyelid pivots deform skin and eyelashes together. Eye globes stay fixed.
 ev.to_mesh_clear()
 if kind in ['Skin','Eyelashes']:
  for side,label in enumerate(['L','R']):
   set_lid(label,True)
   graph.update();blinkmesh=obj.evaluated_get(graph).to_mesh()
   assert len(blinkmesh.vertices)==len(raw)
   for idx,vi in orig:
    p=norm(obj.matrix_world@blinkmesh.vertices[vi].co);delta=deform(p-raw[vi],weights[vi],True)
    if delta.length>1e-6:out['morphs']['AK_09_EyeBlinkLeft' if side==0 else 'AK_10_EyeBlinkRight'].append([idx,*[round(v,6) for v in delta]])
   obj.evaluated_get(graph).to_mesh_clear()
   set_lid(label)
   graph.update()
 sourceOffset+=len(raw)
 print('PART',kind,len(orig),len(indices)//3,flush=True)
sourceFiles={}
for rel,_ in files:
 path=ASSETS/rel;sourceFiles[rel]=hashlib.sha256(path.read_bytes()).hexdigest()
 for line in path.read_text().splitlines():
  if line.startswith(('obj_file ','material ')):
   asset=(path.parent/line.split(None,1)[1].strip()).resolve();sourceFiles[str(asset.relative_to(ASSETS))]=hashlib.sha256(asset.read_bytes()).hexdigest()
sourceFiles[skin]=hashlib.sha256((ASSETS/skin).read_bytes()).hexdigest()
out['sourceFiles']=sourceFiles
out['body']=body
(OUT/(body+'.json')).write_text(json.dumps(out,separators=(',',':'))+'\n')

print('EXPORTED',body,len(out['weights']),flush=True)
