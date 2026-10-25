import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {REST,BONES,poseJoints,deformSurface,bindSurface} from '../src/health/components/exercise/rig.js';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {avatarGeometry} from '../src/health/components/body3d/appearance.js';
for(const gender of ['male','female',undefined])it(`raising the arms does not drag the waist or shirt hem for ${gender||'mixed'} anatomy`,()=>{
 const base=personalizedVertices({height:178,weight:70,body_fat_percentage:20,skeletal_muscle_mass:32},{gender});
 const wear=sportswear(base,1,gender),weights=bindSurface(base),raised=poseJoints('recovery_lat_reach',.5),pose=REST.map(p=>p.slice());
 for(const joint of [3,4,5,6,7,8,17,18])pose[joint]=raised[joint].slice();
 const before=deformSurface(wear.positions,weights,REST,new Float32Array(base.length),REST,false);
 const after=deformSurface(wear.positions,weights,pose,new Float32Array(base.length),REST,false);
 let waistVertices=0,armVertices=0,handMotion=0;
 const distanceToArm=(point,joints,side)=>Math.min(...(side>0?[[3,4],[4,5]]:[[6,7],[7,8]]).map(([a,b])=>{
  const start=new Vector3(...joints[a]),axis=new Vector3(...joints[b]).sub(start),offset=point.clone().sub(start);
  return point.distanceTo(start.addScaledVector(axis,Math.max(0,Math.min(1,offset.dot(axis)/axis.lengthSq()))));
 }));
 for(let i=0;i<base.length;i+=3){
  const displacement=new Vector3(...after.slice(i,i+3)).distanceTo(new Vector3(...before.slice(i,i+3)));
  if(Math.abs(base[i])<.26&&base[i+1]>.92&&base[i+1]<1.2){waistVertices++;expect(displacement,`waist vertex ${i/3}`).toBeLessThan(.00001);}
  if(Math.abs(base[i])>.27&&Math.abs(base[i])<.4&&base[i+1]>1.21&&base[i+1]<1.32){
   armVertices++;
   const original=distanceToArm(new Vector3(...before.slice(i,i+3)),REST,base[i]);
   expect(distanceToArm(new Vector3(...after.slice(i,i+3)),pose,base[i]),`upper-arm surface ${i/3}`).toBeLessThan(original+.03);
  }
  if(Math.abs(base[i])>.4)handMotion=Math.max(handMotion,displacement);
 }
 expect(waistVertices).toBeGreaterThan(50);expect(armVertices).toBeGreaterThan(20);expect(handMotion).toBeGreaterThan(.5);
});
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
