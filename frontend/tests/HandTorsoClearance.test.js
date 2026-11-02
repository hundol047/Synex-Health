import {it,expect} from 'vitest';
import {BufferGeometry,BufferAttribute,Vector3,Ray,DoubleSide} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import female from '../src/health/components/character/assets/studio/female.json';
import male from '../src/health/components/character/assets/trainer/male.json';
import {studioTrainerData} from '../src/health/components/character/studioTrainer.js';
import {prepareDetailedModel,poseDetailedModel} from '../src/health/components/character/detailedModel.js';
import {rigRotation} from '../src/health/components/exercise/rig.js';
import {CLASP_MOTIONS} from '../src/health/components/exercise/handPoses.js';

// Independent surface test: ray-cast the rendered shirt/chest triangles, not
// the controller's clearance value or joint positions. The previous controller
// put the fingers 35–63 mm inside this surface in upright clasped poses.
for(const source of [female,male])it(`${source.body}: clasped hands stay in front of the actual chest through each repetition`,()=>{
 for(const scale of [.85,1.15]){
  const model=prepareDetailedModel(studioTrainerData(source),scale),torso=new BufferGeometry();
  try{
   const ids=Array.from(model.geometry.index.array),triangles=[];
   for(let i=0;i<ids.length;i+=3){const face=ids.slice(i,i+3);
    if(face.every(v=>model.weights[v].some(([b,w])=>b===0&&w>.65)&&model.base[v*3+1]>model.rest[0][1]+.12*scale))triangles.push(...face);
   }
   expect(triangles.length).toBeGreaterThan(100);
   const hands=model.weights.flatMap((row,i)=>row.some(([b,w])=>b>=12&&w>.85)?[i]:[]);
   expect(hands.length).toBeGreaterThan(100);
   torso.setIndex(triangles);const ray=new Ray(new Vector3(),new Vector3(0,0,-1)),point=new Vector3();
   for(const motion of CLASP_MOTIONS){let hits=0;
    for(let frame=0;frame<=12;frame++){
     const joints=poseDetailedModel(model,motion,frame/12),q=rigRotation(joints,0,model.rest).invert(),hip=new Vector3(...joints[0]);
     const positions=model.geometry.attributes.position.array.slice();
     for(let i=0;i<positions.length;i+=3)point.fromArray(positions,i).sub(hip).applyQuaternion(q).toArray(positions,i);
     torso.setAttribute('position',new BufferAttribute(positions,3));const bvh=new MeshBVH(torso,{verbose:false});
     let closest=Infinity;
     for(const i of hands){ray.origin.set(positions[i*3],positions[i*3+1],2*scale);const hit=bvh.raycastFirst(ray,DoubleSide);
      if(hit){hits++;closest=Math.min(closest,positions[i*3+2]-hit.point.z);}
     }
     expect(closest,`${source.body}/${scale}/${motion}/${frame}`).toBeGreaterThan(.005*scale);
    }
    expect(hits,`${motion}: the rays must actually cover the torso`).toBeGreaterThan(100);
   }
  }finally{torso.dispose();model.geometry.dispose();model.rigidHeadGeometry?.dispose();}
 }
},90000);
