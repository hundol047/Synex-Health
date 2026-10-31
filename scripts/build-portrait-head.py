"""Build a CC0 adult portrait-head delta on the shipped hm08 topology.
Usage: python scripts/build-portrait-head.py TARGET_DIRECTORY BASE_OBJ
Uses graphical target data only; does not import MakeHuman program code.
"""
from pathlib import Path
import json,sys,hashlib,math
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);verts=[];used=set();group=''
for line in Path(sys.argv[2]).read_text().splitlines():
 a=line.split()
 if not a:continue
 if a[0]=='v':verts.append(list(map(float,a[1:4])))
 elif a[0]=='g':group=a[1]
 elif a[0]=='f' and group=='body':used.update(int(p.split('/')[0])-1 for p in a[1:])
used=sorted(used);mesh=json.loads((root/'frontend/src/health/components/body3d/assets/human-mesh.json').read_text());assert len(used)*3==len(mesh['profiles']['female'])
names=['african-female-young.target','asian-female-young.target','caucasian-female-young.target','universal-female-young-averagemuscle-averageweight.target'];targets={}
for name in names:
 d={}
 for line in (source/name).read_text().splitlines():
  a=line.split()
  if a and not a[0].startswith('#'):d[int(a[0])]=list(map(float,a[1:4]))
 targets[name]=d
points=[p[:] for p in verts]
for i,p in enumerate(points):
 for k in range(3):p[k]+=sum(targets[n].get(i,[0,0,0])[k]/3 for n in names[:3])+targets[names[3]].get(i,[0,0,0])[k]
floor=min(points[i][1] for i in used);scale=1.78/(max(points[i][1] for i in used)-floor)
portrait=[[p[k]+targets[names[1]].get(i,[0,0,0])[k]+targets[names[3]].get(i,[0,0,0])[k] for k in range(3)] for i,p in enumerate(verts)]
portrait_floor=min(portrait[i][1] for i in used);portrait_scale=1.78/(max(portrait[i][1] for i in used)-portrait_floor)
def smooth(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
# Separate authored feature sculpts avoid a single generic face-wide squash.
sculpt_weights={'nose-width3-decr':.6,'nose-point-width-decr':.35,'nose-nostrils-width-decr':.4,'nose-flaring-decr':.2,'mouth-lowerlip-volume-decr':.55,'mouth-upperlip-volume-decr':.5,'mouth-scale-horiz-decr':.5,'mouth-laugh-lines-in':.35,'chin-width-decr':.45,'chin-prominent-decr':.18,'head-oval':.55,'l-cheek-bones-decr':.35,'r-cheek-bones-decr':.35,'l-eye-bag-decr':.8,'r-eye-bag-decr':.8,'l-eye-eyefold-up':.15,'r-eye-eyefold-up':.15}
sculpts={};sculpt_hashes={}
for name,amount in sculpt_weights.items():
 path=source/'sculpt'/(name+'.target');sculpt_hashes[name]=hashlib.sha256(path.read_bytes()).hexdigest()
 for line in path.read_text().splitlines():
  a=line.split()
  if a and not a[0].startswith('#'):
   index=int(a[0]);sculpts.setdefault(index,[0,0,0])
   for k in range(3):sculpts[index][k]+=float(a[k+1])*amount

expression_weights={'mouthSmileLeft':.08,'mouthSmileRight':.08}
expression={};expression_hashes={}
for name,amount in expression_weights.items():
 path=source/'expression'/(name+'.target');expression_hashes[name]=hashlib.sha256(path.read_bytes()).hexdigest()
 for line in path.read_text().splitlines():
  a=line.split()
  if a and not a[0].startswith('#'):
   index=int(a[0]);assert index<len(verts);expression.setdefault(index,[0,0,0])
   for k in range(3):expression[index][k]+=float(a[k+1])*amount

deltas=[]
for j,i in enumerate(used):
 x,y,z=[n*mesh['scale'] for n in mesh['profiles']['female'][j*3:j*3+3]]
 weight=smooth(1.55,1.60,y)*smooth(.035,.095,z)
 d=[((portrait[i][k]-(portrait_floor if k==1 else 0))*portrait_scale-(points[i][k]-(floor if k==1 else 0))*scale)*weight for k in range(3)]
 # Preserve the eye socket centers used by all cosmetics/animation. The
 # surrounding cheek, nose, lips and jaw receive the authored surface change.
 eye=math.exp(-((abs(x)-.034)/.017)**4-((y-1.663)/.018)**4)
 d=[v*(1-eye*.90) for v in d]
 mouth=math.exp(-(x/.045)**4-((y-1.609)/.018)**4)
 d[1]*=.25*(1-mouth*.85)
 d=[v+(sculpts.get(i,[0,0,0])[k]+expression.get(i,[0,0,0])[k])*scale*weight for k,v in enumerate(d)]
 if max(abs(v) for v in d)>.000005:deltas.append([j,*[round(v,6) for v in d]])
out=root/'frontend/src/health/components/character/assets/portrait-head.json'
out.write_text(json.dumps({'sourceRevision':mesh['revision'],'deltas':deltas,'expressionRevision':'7eaba3453134385bb5ea9811ef0b33b85b4b556d','expressionWeights':expression_weights,'expressionHashes':expression_hashes,'sculptWeights':sculpt_weights,'sculptHashes':sculpt_hashes,'sourceHashes':{n:hashlib.sha256((source/n).read_bytes()).hexdigest() for n in names}},separators=(',',':'))+'\n')
print({'vertices':len(deltas),'maxDelta':max(abs(v) for row in deltas for v in row[1:])})
