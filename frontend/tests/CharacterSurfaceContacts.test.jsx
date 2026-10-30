import {it,expect} from 'vitest';
import {Vector3} from 'three';
import {prepareAthlete,getGripSurface} from '../src/health/components/exercise/athleteModel.js';
import {DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import {buildHeadDetails} from '../src/health/components/character/HeadDetail.jsx';
import {poseJoints,rigRotation,deformSurface} from '../src/health/components/exercise/rig.js';
import {exerciseHandShape} from '../src/health/components/exercise/handPoses.js';

it('keeps the newly tailored body and fitted hair on the safe side of support walls',()=>{
 for(const body of ['male','female'])for(const hairStyle of ['parted','wavy','layered','bob','pixie']){
  const c={...DEFAULT_CHARACTER,body,hairStyle,hairVolume:1};
  const model=prepareAthlete(undefined,{gender:body},c),head=buildHeadDetails(model.headBase,model.scale,model.rest,c);
  try{
   for(const motion of ['wall_push','wall_sit','wall_hinge'])for(const progress of [0,.25,.5,.75,1]){
    const pose=poseJoints(motion,progress,model.rest),rear=motion!=='wall_push',plane=pose.equipment.wallZ;
    if(pose.handRoll&&!pose.boneRotations?.[12])pose.handRoll=model.palmRoll;
    const skin=getGripSurface(model,exerciseHandShape(motion,pose));
    const output=deformSurface(skin,model.weights,pose,new Float32Array(skin.length),model.rest,false);
    let bodyGap=Infinity,hairGap=Infinity;
    for(let i=2;i<output.length;i+=3)bodyGap=Math.min(bodyGap,rear?output[i]-plane:plane-output[i]);
    const rotation=rigRotation(pose,1,model.rest),anchor=new Vector3(...pose[1]);
    for(const g of [head.cap,...head.curves])for(let i=0;i<g.attributes.position.count;i++){
     const p=new Vector3().fromBufferAttribute(g.attributes.position,i).applyQuaternion(rotation).add(anchor);
     hairGap=Math.min(hairGap,rear?p.z-plane:plane-p.z);
    }
    expect(bodyGap,`${body}/${motion}/${progress} clothing`).toBeGreaterThan(0);
    expect(hairGap,`${body}/${hairStyle}/${motion}/${progress} hair`).toBeGreaterThan(0);
   }
  }finally{head.dispose();}
 }
},60000);
