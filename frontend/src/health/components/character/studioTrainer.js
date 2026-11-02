import {Vector3} from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';
import {REST} from '../exercise/rig.js';

// Cosmetic demonstration proportions. Measurements and exercise calories never
// read these values. Skin, clothing, eyes, hands and the rig share one mapping.
const smooth=(a,b,y)=>{const t=Math.max(0,Math.min(1,(y-a)/(b-a)));return t*t*(3-2*t);};
const heights=[[0,0],[.10,.10],[.52,.555],[.94,1.005],[1.42,1.475],[1.54,1.572],[1.66,1.680],[1.90,1.896]];
const height=y=>{
 let i=1;while(i<heights.length-1&&y>heights[i][0])i++;
 const [a,b]=heights[i-1],[c,d]=heights[i];return b+(y-a)*(d-b)/(c-a);
};
const proportions=y=>{
 const head=smooth(1.49,1.56,y),body=smooth(.25,.9,y);
 return [1-.025*body-.075*head,height(y),1-.015*body-.085*head];
};
export function studioPoint([x,y,z]){
 const [sx,yy,sz]=proportions(y);return [x*sx,yy,.025+(z-.025)*sz];
}
function mapPoints(points){const out=[];for(let i=0;i<points.length;i+=3)out.push(...studioPoint(points.slice(i,i+3)));return out;}
const cache=new WeakMap();
export function studioTrainerData(source){
 if(cache.has(source))return cache.get(source);
 const positions=mapPoints(source.positions);
 const deltas=rows=>rows.map(([i,...delta])=>[i,...studioPoint(delta.map((v,k)=>source.positions[i*3+k]+v)).map((v,k)=>v-positions[i*3+k])]);
 const data={...source,positions,guidePositions:source.guidePositions||source.positions,rest:REST.map(studioPoint),
  eyes:source.eyes.map(studioPoint),
  morphs:Object.fromEntries(Object.entries(source.morphs).map(([k,rows])=>[k,deltas(rows)])),
  grips:Object.fromEntries(Object.entries(source.grips).map(([k,sides])=>[k,sides.map(deltas)])),
  refinement:{...source.refinement,portraitStyle:'studio',proportions:'longer-legs-smaller-head-v1'},
 };
 if(source.rigidHead){
  const hair=source.rigidHead,normal=new Vector3(),normals=[];
  for(let i=0;i<hair.positions.length;i+=3){
   const [x,y,z]=hair.positions.slice(i,i+3),[sx,,sz]=proportions(y),lo=proportions(y-.0001),hi=proportions(y+.0001);
   const dx=(hi[0]-lo[0])/.0002,dy=(hi[1]-lo[1])/.0002,dz=(hi[2]-lo[2])/.0002;
   const nx=hair.normals[i]/sx,nz=hair.normals[i+2]/sz;
   normal.set(nx,(hair.normals[i+1]-x*dx*nx-(z-.025)*dz*nz)/dy,nz).normalize();normals.push(...normal.toArray());
  }
  const mapped=mapPoints(hair.positions),points=[];
  for(let i=0;i<mapped.length;i+=3)points.push(new Vector3().fromArray(mapped,i));
  const hull=new ConvexHull().setFromPoints(points),corners=new Set();
  for(const face of hull.faces){let edge=face.edge;do{corners.add(edge.head().point);edge=edge.next;}while(edge!==face.edge);}
  data.rigidHead={...hair,positions:mapped,normals,boundsHull:[...corners].flatMap(p=>p.toArray())};
 }
 cache.set(source,data);return data;
}
