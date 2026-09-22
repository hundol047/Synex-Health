import * as THREE from 'three';
import { samplePose, MOTIONS } from './motions.js';
// Rest joints in the CC0 mesh coordinate system. Segment transforms are blended at joints.
export const REST=[[0,.94,.035],[0,1.42,.025],[0,1.66,.025],[.185,1.42,.02],[.325,1.25,.04],[.445,1.105,.13],[-.185,1.42,.02],[-.325,1.25,.04],[-.445,1.105,.13],[.1,.90,.035],[.14,.52,.05],[.19,.1,.035],[-.1,.90,.035],[-.14,.52,.05],[-.19,.1,.035]];
export const BONES=[[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[9,10],[10,11],[12,13],[13,14]];
export function poseJoints(id,t){
 const p=samplePose(id,t);if(!p)return REST;
 const front=MOTIONS[id].view.includes('정면');
 const point=(i,side=0)=>front?[(170-p[i][0])*.007,(306-p[i][1])*.007,side*.05]:[side,(306-p[i][1])*.007,(p[i][0]-170)*.007];
 const hip=point(2),shoulder=point(1),head=point(0);
 const raw=[hip,shoulder,head,...[1,-1].flatMap((side,j)=>{const s=shoulder.slice();s[0]+=side*.22;return [s,point(j?5:3,side*.28),point(j?6:4,side*.28)];}),...[1,-1].flatMap((side,j)=>{const h=hip.slice();h[0]+=side*.1;return [h,point(j?9:7,side*.1),point(j?10:8,side*.1)];})];
 // Retarget directions to fixed human bone lengths; SVG proportions must not stretch anatomy.
 const joints=REST.map(p=>p.slice());joints[0]=raw[0].slice();
 const direction=(a,b)=>vec(raw[b]).sub(vec(raw[a])).normalize();
 const place=(a,b)=>{joints[b]=vec(joints[a]).addScaledVector(direction(a,b),vec(REST[b]).distanceTo(vec(REST[a]))).toArray();};
 place(0,1);place(1,2);
 const torsoRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction(0,1));
 for(const [root,parent] of [[3,1],[6,1],[9,0],[12,0]])joints[root]=vec(REST[root]).sub(vec(REST[parent])).applyQuaternion(torsoRotation).add(vec(joints[parent])).toArray();
 for(const [a,b] of BONES.slice(2))place(a,b);
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
  const armIndex=x>=0?2:4,legIndex=x>=0?6:8;
  weights.push([[0,trunk],[1,head],[armIndex,arm*elbow],[armIndex+1,arm*(1-elbow)],[legIndex,leg*knee],[legIndex+1,leg*(1-knee)]].filter(([,w])=>w>0));
 }
 return weights;
}
export function deformSurface(base,weights,joints,target){
 const transforms=BONES.map(([a,b])=>{const from=vec(REST[b]).sub(vec(REST[a])),to=vec(joints[b]).sub(vec(joints[a]));return {origin:vec(REST[a]),destination:vec(joints[a]),rotation:new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize())};});
 const v=new THREE.Vector3(),out=new THREE.Vector3();
 for(let i=0;i<weights.length;i++){out.set(0,0,0);for(const [bone,w] of weights[i]){const tr=transforms[bone];v.fromArray(base,i*3).sub(tr.origin).applyQuaternion(tr.rotation).add(tr.destination);out.addScaledVector(v,w);}out.toArray(target,i*3);}
 let floor=Infinity;for(let i=1;i<target.length;i+=3)floor=Math.min(floor,target[i]);for(let i=1;i<target.length;i+=3)target[i]+=.015-floor;
 return target;
}
