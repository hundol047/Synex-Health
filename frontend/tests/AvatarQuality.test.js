import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {REST,BONES,poseJoints,deformSurface,bindSurface} from '../src/health/components/exercise/rig.js';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {avatarGeometry} from '../src/health/components/body3d/appearance.js';
it('keeps a blended cross-section rigid rather than shrinking between opposite rotations',()=>{
 const rest=REST.map(p=>p.slice());rest[0]=[0,0,0];rest[1]=[0,1,0];rest[2]=[0,2,0];
 const posed=rest.map(p=>p.slice()),angle=80*Math.PI/180;posed[1]=[-Math.sin(angle),Math.cos(angle),0];posed[2]=[0,2*Math.cos(angle),0];
 const base=new Float32Array([.1,.9,0,-.1,.9,0]),weights=[[[0,.5],[1,.5]],[[0,.5],[1,.5]]];
 const out=deformSurface(base,weights,posed,new Float32Array(6),rest,false);
 expect(new Vector3(...out.slice(0,3)).distanceTo(new Vector3(...out.slice(3)))).toBeCloseTo(.2,5);
});
it('rest pose preserves geometry and clothing faces form a complete partition with finite colors',()=>{
 const base=personalizedVertices({},{}),wear=sportswear(base),g=avatarGeometry(wear);
 const out=deformSurface(base,bindSurface(base),REST,new Float32Array(base.length),REST,false);
 for(let i=0;i<base.length;i++)expect(out[i]).toBeCloseTo(base[i],5);
 expect(g.groups).toHaveLength(4);expect(g.index.count).toBe(Object.values(wear.indices).reduce((n,x)=>n+x.length,0));expect(g.groups.reduce((n,x)=>n+x.count,0)).toBe(g.index.count);
 expect(g.attributes.color.array.every(Number.isFinite)).toBe(true);expect(new Set(wear.labels).size).toBe(4);g.dispose();
});

it('keeps squat feet planted while preserving every bone length',()=>{
 for(const phase of [0,.25,.5,.75,1]){
  const joints=poseJoints('squat',phase);
  for(const [a,b] of BONES)expect(new Vector3(...joints[a]).distanceTo(new Vector3(...joints[b]))).toBeCloseTo(new Vector3(...REST[a]).distanceTo(new Vector3(...REST[b])),6);
  for(const [ankle,toe] of [[11,15],[14,16]])expect(new Vector3(...joints[toe]).sub(new Vector3(...joints[ankle])).distanceTo(new Vector3(...REST[toe]).sub(new Vector3(...REST[ankle])))).toBeLessThan(1e-6);
 }
});
