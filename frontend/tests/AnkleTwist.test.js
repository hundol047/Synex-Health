import {it,expect} from 'vitest';
import {Vector3} from 'three';
import catalog from '../src/shared/lib/localCatalog.json';
import {STRETCHES} from '../src/health/components/exercise/stretchCatalog.js';
import {poseJoints,rigRotation} from '../src/health/components/exercise/rig.js';

// The foot shares the shin's medial-lateral axis; an ankle only flexes about it
// and inverts a little. A foot yawed 180° under a horizontal shin (sole down,
// toes back) twisted the ankle half a turn in prone and kneeling exercises.
it('keeps every foot aligned with its shin instead of twisting the ankle',()=>{
 // Butterfly and figure-four shins have no authored twist (shortest arc), so
 // their lateral axis is not a meaningful reference for the turned-out feet.
 const unauthoredShins=new Set(['recovery_butterfly','recovery_figure_four']);
 for(const {motion_id:id} of [...catalog,...STRETCHES]){
  if(unauthoredShins.has(id))continue;
  for(let f=0;f<=40;f++){
   const t=f/40,p=poseJoints(id,t);
   for(const [shin,foot] of [[7,10],[9,11]]){
    const lateral=new Vector3(1,0,0);
    const alignment=lateral.clone().applyQuaternion(rigRotation(p,shin)).dot(lateral.clone().applyQuaternion(rigRotation(p,foot)));
    expect(alignment,`${id} ankle ${foot} at ${t}`).toBeGreaterThan(.5);
   }
  }
 }
});
