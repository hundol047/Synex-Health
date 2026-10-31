import {it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
import {poseJoints,REST} from '../src/health/components/exercise/rig.js';

const v=p=>new Vector3(...p),DEG=180/Math.PI;
// Signed elbow flexion in the hanging upper arm's own frame: positive folds the
// forearm forward, negative bends it behind the elbow (hyperextension).
function elbowFlexion(p,[shoulder,elbow,wrist]){
 const trunk=v(p[1]).sub(v(p[0])).normalize();
 const toTrunk=new Quaternion().setFromUnitVectors(trunk,new Vector3(0,1,0));
 const upper=v(p[elbow]).sub(v(p[shoulder])).normalize().applyQuaternion(toTrunk);
 if(trunk.y<.7||upper.y>-.75)return null; // only an upright trunk with a hanging arm has an unambiguous hinge plane
 const restUpper=v(REST[elbow]).sub(v(REST[shoulder])).normalize();
 const forearm=v(p[wrist]).sub(v(p[elbow])).normalize().applyQuaternion(toTrunk).applyQuaternion(new Quaternion().setFromUnitVectors(upper,restUpper));
 const along=forearm.dot(restUpper);
 if(along<Math.cos(120/DEG))return null; // deeply folded elbows are checked by their contacts, not this plane
 return Math.atan2(forearm.z-restUpper.z*along,along)*DEG;
}

it('never bends a hanging or swinging elbow backwards',()=>{
 for(const {motion_id:id} of [...catalog,...STRETCHES]){
  for(let f=0;f<=60;f++){
   const t=f/60,p=poseJoints(id,t);
   for(const arm of [[3,4,5],[6,7,8]]){
    const flexion=elbowFlexion(p,arm);
    if(flexion!==null)expect(flexion,`${id} elbow ${arm[1]} at ${t.toFixed(3)}`).toBeGreaterThan(-25);
   }
  }
 }
});

it('blends stretch forearms in the upper-arm frame through the raise',()=>{
 // Mid-transition the forearm must stay close to its interpolated elbow angle,
 // rather than sweeping through the elbow as independent world slerps did.
 const angle=(p,[s,e,w])=>v(p[e]).sub(v(p[s])).angleTo(v(p[w]).sub(v(p[e])))*DEG;
 for(const id of ['recovery_triceps','recovery_shoulder_cross','recovery_chest_open']){
  const start=angle(poseJoints(id,0),[3,4,5]),end=angle(poseJoints(id,.5),[3,4,5]);
  for(let f=1;f<12;f++){
   const value=angle(poseJoints(id,f/100),[3,4,5]);
   expect(value,`${id} at ${f}%`).toBeGreaterThan(Math.min(start,end)-5);
   expect(value,`${id} at ${f}%`).toBeLessThan(Math.max(start,end)+5);
  }
 }
});
