import * as THREE from 'three';
import { samplePose, MOTIONS } from './motions.js';
import {bodyweightPoseJoints} from './bodyweightRig.js';
// Rest joints in the CC0 mesh coordinate system. Segment transforms are blended at joints.
export const REST=[[0,.94,.035],[0,1.42,.025],[0,1.66,.025],[.185,1.42,.02],[.325,1.25,.04],[.445,1.105,.13],[-.185,1.42,.02],[-.325,1.25,.04],[-.445,1.105,.13],[.1,.90,.035],[.14,.52,.05],[.19,.1,.035],[-.1,.90,.035],[-.14,.52,.05],[-.19,.1,.035],[.19,.04,.20],[-.19,.04,.20],[.565,.965,.25],[-.565,.965,.25]];
export const BONES=[[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[9,10],[10,11],[12,13],[13,14],[11,15],[14,16],[5,17],[8,18]];
export function poseJoints(id,t,rest=REST){
 const bodyweight=bodyweightPoseJoints(id,t,rest);if(bodyweight)return bodyweight;
 const p=samplePose(id,t);if(!p)return rest;
 const front=MOTIONS[id].view.includes('정면');
 const point=(i,side=0)=>front?[(170-p[i][0])*.007,(306-p[i][1])*.007,side*.05]:[side,(306-p[i][1])*.007,(p[i][0]-170)*.007];
 const hip=point(2),shoulder=point(1),head=point(0);
 const raw=[hip,shoulder,head,...[1,-1].flatMap((side,j)=>{const s=shoulder.slice();s[0]+=side*.22;return [s,point(j?5:3,side*.28),point(j?6:4,side*.28)];}),...[1,-1].flatMap((side,j)=>{const h=hip.slice();h[0]+=side*.1;return [h,point(j?9:7,side*.1),point(j?10:8,side*.1)];})];
 // Retarget directions to fixed human bone lengths; SVG proportions must not stretch anatomy.
 const joints=rest.map(p=>p.slice());joints[0]=raw[0].slice();
 const direction=(a,b)=>vec(raw[b]).sub(vec(raw[a])).normalize();
 const place=(a,b)=>{joints[b]=vec(joints[a]).addScaledVector(direction(a,b),vec(rest[b]).distanceTo(vec(rest[a]))).toArray();};
 place(0,1);place(1,2);
 const torsoRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction(0,1));
 for(const [root,parent] of [[3,1],[6,1],[9,0],[12,0]])joints[root]=vec(rest[root]).sub(vec(rest[parent])).applyQuaternion(torsoRotation).add(vec(joints[parent])).toArray();
 for(const [a,b] of BONES.slice(2,10))place(a,b);
 // Feet articulate separately from the calf. Upright exercises retain planted soles.
 for(const [knee,ankle,toe] of [[10,11,15],[13,14,16]]){
  const delta=vec(rest[toe]).sub(vec(rest[ankle]));
  const leg=vec(joints[knee]).sub(vec(joints[ankle])).normalize();
  if(Math.abs(leg.y)<.5)delta.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(vec(rest[ankle]).sub(vec(rest[knee])).normalize(),vec(joints[ankle]).sub(vec(joints[knee])).normalize()));
  joints[toe]=vec(joints[ankle]).add(delta).toArray();
 }
 for(const [elbow,wrist,finger] of [[4,5,17],[7,8,18]]){
  const rotation=new THREE.Quaternion().setFromUnitVectors(vec(rest[wrist]).sub(vec(rest[elbow])).normalize(),vec(joints[wrist]).sub(vec(joints[elbow])).normalize());
  joints[finger]=vec(joints[wrist]).add(vec(rest[finger]).sub(vec(rest[wrist])).applyQuaternion(rotation)).toArray();
 }
 const lift=.08-Math.min(joints[11][1],joints[14][1]);
 for(const p of joints)p[1]+=lift;
 return joints;
}
const vec=p=>new THREE.Vector3(...p);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function bindSurface(base){
 const weights=[];
 for(let i=0;i<base.length;i+=3){
  const x=base[i],y=base[i+1];
  const head=smooth(1.47,1.56,y),arm=smooth(.16,.27,Math.abs(x))*smooth(.84,.91,y)*(1-head),leg=(1-smooth(.85,1.02,y))*(1-arm);
  const trunk=Math.max(0,1-head-arm-leg),elbow=smooth(1.20,1.29,y),knee=smooth(.47,.57,y);
  const armIndex=x>=0?2:4,legIndex=x>=0?6:8,footIndex=x>=0?10:11,foot=1-smooth(.12,.21,y);
  const handIndex=x>=0?12:13,hand=smooth(.40,.46,Math.abs(x))*(1-smooth(1.04,1.14,y));
  weights.push([[0,trunk],[1,head],[armIndex,arm*elbow],[armIndex+1,arm*(1-elbow)*(1-hand)],[handIndex,arm*(1-elbow)*hand],[legIndex,leg*knee],[legIndex+1,leg*(1-knee)*(1-foot)],[footIndex,leg*(1-knee)*foot]].filter(([,w])=>w>0));
 }
 return weights;
}
// Fit palm pronation once to each avatar's actual hand surface. Stature changes
// the authored joint direction and male/female hands have different thickness.
export function calibratePalmRoll(base,weights,rest=REST){
 const target=.04*rest[0][1]/.94;
 return [[5,17,12,1],[8,18,13,-1]].map(([wrist,finger,bone,side])=>{
  const rotation=new THREE.Quaternion().setFromUnitVectors(vec(rest[finger]).sub(vec(rest[wrist])).normalize(),new THREE.Vector3(0,0,1));
  const points=[];
  for(let i=0;i<weights.length;i++)if(weights[i].some(([index,weight])=>index===bone&&weight>.8))points.push(new THREE.Vector3().fromArray(base,i*3).sub(vec(rest[wrist])).applyQuaternion(rotation));
  if(!points.length)return side*.9;
  let low=.35,high=1.25;
  for(let iteration=0;iteration<14;iteration++){
   const angle=(low+high)/2,cos=Math.cos(angle),sin=Math.sin(angle)*side;
   const minimum=Math.min(...points.map(point=>point.y*cos+point.x*sin));
   if(minimum < -target)high=angle;else low=angle;
  }
  return side*(low+high)/2;
 });
}
// Normalized dual-quaternion blending preserves rigid volume around bent joints.
// Original implementation of the published algorithm (Kavan et al., 2008).
export function deformSurface(base,weights,joints,target,rest=REST,ground=true){
 const transforms=BONES.map(([a,b],index)=>{
  const rotation=new THREE.Quaternion().setFromUnitVectors(vec(rest[b]).sub(vec(rest[a])).normalize(),vec(joints[b]).sub(vec(joints[a])).normalize());
  if(index>=12&&joints.handRoll?.[index-12])rotation.premultiply(new THREE.Quaternion().setFromAxisAngle(vec(joints[b]).sub(vec(joints[a])).normalize(),joints.handRoll[index-12]));
  const t=vec(joints[a]).sub(vec(rest[a]).applyQuaternion(rotation));
  const dual=new THREE.Quaternion(t.x,t.y,t.z,0).multiply(rotation);
  return {real:rotation.toArray(),dual:dual.toArray().map(v=>v*.5)};
 });
 const v=new THREE.Vector3(),q=new THREE.Quaternion(),d=new THREE.Quaternion(),translation=new THREE.Quaternion();
 for(let i=0;i<weights.length;i++){
  const real=[0,0,0,0],dual=[0,0,0,0],anchor=transforms[weights[i][0]?.[0]||0].real;
  for(const [bone,w] of weights[i]){
   const tr=transforms[bone],sign=tr.real.reduce((n,x,k)=>n+x*anchor[k],0)<0?-1:1;
   for(let k=0;k<4;k++){real[k]+=tr.real[k]*w*sign;dual[k]+=tr.dual[k]*w*sign;}
  }
  const length=Math.hypot(...real);
  if(length<1e-8){for(let k=0;k<3;k++)target[i*3+k]=base[i*3+k];continue;}
  q.fromArray(real.map(x=>x/length));d.fromArray(dual.map(x=>x/length));
  translation.copy(d).multiply(q.clone().conjugate());
  v.fromArray(base,i*3).applyQuaternion(q);v.x+=2*translation.x;v.y+=2*translation.y;v.z+=2*translation.z;v.toArray(target,i*3);
 }
 if(ground){let floor=Infinity;for(let i=1;i<target.length;i+=3)floor=Math.min(floor,target[i]);for(let i=1;i<target.length;i+=3)target[i]+=.015-floor;}
 return target;
}
