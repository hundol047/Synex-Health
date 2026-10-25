import * as THREE from 'three';

export const BODY_FOCUS_AREAS = [
  {id:'whole',label:'전체 보기',segment:null},
  {id:'chest',label:'가슴',segment:'TRUNK'},
  {id:'abdomen',label:'복부',segment:'TRUNK'},
  {id:'back',label:'등',segment:'TRUNK',view:'back'},
  {id:'hips',label:'엉덩이',segment:'TRUNK',view:'back'},
  {id:'left_arm',label:'왼팔',segment:'LEFT_ARM'},
  {id:'right_arm',label:'오른팔',segment:'RIGHT_ARM'},
  {id:'left_leg',label:'왼다리',segment:'LEFT_LEG'},
  {id:'right_leg',label:'오른다리',segment:'RIGHT_LEG'},
];
const segmentIds={LEFT_ARM:2,RIGHT_ARM:3,LEFT_LEG:4,RIGHT_LEG:5};

// Bounds come from each deformed surface, including both layers when compared.
// Regional camera framing does not invent regional muscle measurements.
export function mannequinFocusBounds(positions,regions,scale){
  const boxes=Object.fromEntries(BODY_FOCUS_AREAS.filter(a=>a.id!=='whole').map(a=>[a.id,new THREE.Box3()]));
  const point=new THREE.Vector3();
  for(let i=0;i<regions.length;i++){
    point.fromArray(positions,i*3);const y=point.y/scale,region=regions[i];
    for(const area of BODY_FOCUS_AREAS){
      const limb=segmentIds[area.segment];
      const included=limb?region===limb:
        area.id==='chest'?region===1&&y>=1.20&&y<=1.51:
        area.id==='abdomen'?region===1&&y>=1.00&&y<=1.25:
        area.id==='back'?region===1&&y>=1.00&&y<=1.51:
        area.id==='hips'?Math.abs(point.x/scale)<.28&&y>=.73&&y<=1.03:false;
      if(included)boxes[area.id].expandByPoint(point);
    }
  }
  return boxes;
}

// Fit all eight corners in the current view, with space around the target.
// This handles tall limbs, wider torsos, and phone portrait aspect ratios.
export function focusCameraFrame(bounds,direction,aspect,fov=38){
  const target=bounds.getCenter(new THREE.Vector3());
  const forward=direction.clone().normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward).normalize();
  const up=new THREE.Vector3().crossVectors(forward,right).normalize();
  const tanY=Math.tan(THREE.MathUtils.degToRad(fov/2)),tanX=tanY*Math.max(.25,aspect);
  let distance=.4;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const corner=new THREE.Vector3(x,y,z).sub(target),depth=corner.dot(forward);
    distance=Math.max(distance,depth+1.22*Math.abs(corner.dot(right))/tanX,depth+1.22*Math.abs(corner.dot(up))/tanY);
  }
  return {target,position:target.clone().addScaledVector(forward,distance),distance};
}
