import {it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
import {poseJoints,REST,BONES} from '../src/health/components/exercise/rig.js';
const rotation=(p,bone)=>{
 const axis=new Vector3(...p[BONES[bone][1]]).sub(new Vector3(...p[BONES[bone][0]])).normalize();
 const q=p.boneRotations?.[bone]?new Quaternion().fromArray(p.boneRotations[bone]):new Quaternion().setFromUnitVectors(new Vector3(...REST[BONES[bone][1]]).sub(new Vector3(...REST[BONES[bone][0]])).normalize(),axis);
 if(bone>=12&&p.handRoll?.[bone-12])q.premultiply(new Quaternion().setFromAxisAngle(axis,p.handRoll[bone-12]));
 return q;
};
it('checks all 104 motions for finite, continuous wrist/ankle rotation and fixed bones throughout the cycle',()=>{
 const motions=[...catalog,...STRETCHES];expect(motions).toHaveLength(104);
 for(const {motion_id:id} of motions){
  for(let f=0;f<240;f++){
   const t=f/240,a=poseJoints(id,t),b=poseJoints(id,t+.00001);
   expect(a.flat().every(Number.isFinite),id).toBe(true);
   if(id.startsWith('recovery_'))for(const [elbow,wrist,finger] of [[4,5,17],[7,8,18]]){
    const forearm=new Vector3(...a[wrist]).sub(new Vector3(...a[elbow])),hand=new Vector3(...a[finger]).sub(new Vector3(...a[wrist]));
    expect(forearm.angleTo(hand),`${id} wrist bend at ${t}`).toBeLessThan(Math.PI*.45);
   }
   for(const bone of [10,11,12,13])expect(rotation(a,bone).angleTo(rotation(b,bone)),`${id} bone ${bone} at ${t}`).toBeLessThan(.005);
   for(let j=0;j<a.length;j++)expect(new Vector3(...a[j]).distanceTo(new Vector3(...b[j])),`${id} joint ${j} at ${t}`).toBeLessThan(.001);
  }
  const first=poseJoints(id,0),last=poseJoints(id,1);
  for(const bone of [10,11,12,13])expect(rotation(first,bone).angleTo(rotation(last,bone)),`${id} loop`).toBeLessThan(.00001);
 }
});
