import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {taperedStrand} from './livingFace.js';
import {attachHairFlex} from './hairMotion.js';

// Original fitted hair, sampled against triangles rather than snapped to the
// nearest vertex. The cap stops above the ears; skin never becomes painted hair.
// All distances below are in the neutral 1.78 m demonstration body's space.
export function buildScalpHair(base,scale,anchor,character,bodyIndices){
 const volume=THREE.MathUtils.clamp(character.hairVolume||0,-1,1);
 const source=new THREE.BufferGeometry();
 source.setAttribute('position',new THREE.BufferAttribute(base,3));
 const faces=[];
 for(let i=0;i<bodyIndices.length;i+=3){
  const tri=bodyIndices.slice(i,i+3);
  if(tri.every(v=>base[v*3+1]>1.635*scale))faces.push(...tri);
 }
 source.setIndex(faces);source.computeBoundingSphere();
 const tree=new MeshBVH(source,{maxLeafTris:12});
 const center=new THREE.Vector3(0,1.695*scale,.052*scale);
 const ray=new THREE.Ray(),direction=new THREE.Vector3();
 const part=character.hairStyle==='parted',short=character.hairStyle==='short';
 const boundary=angle=>1.679+.040*Math.max(0,Math.cos(angle))-.021*Math.max(0,-Math.cos(angle))+(part?.006*Math.sin(angle*2):0);
 const limit=angle=>Math.acos(THREE.MathUtils.clamp((boundary(angle)-1.695)/.09,-1,1));
 const sample=(angle,polar,lift=0)=>{
  direction.set(.078*Math.sin(polar)*Math.sin(angle),.09*Math.cos(polar),.105*Math.sin(polar)*Math.cos(angle)).normalize();
  ray.set(center,direction);const hit=tree.raycastFirst(ray,THREE.DoubleSide);
  const point=hit?hit.point.clone():center.clone().addScaledVector(direction,.085*scale);
  return point.addScaledVector(direction,(.0025+.0015*(volume+1)+lift)*scale).sub(anchor);
 };
 const positions=[],indices=[],uSegments=64,vSegments=20;
 for(let row=0;row<=vSegments;row++)for(let col=0;col<=uSegments;col++){
  const a=col/uSegments*Math.PI*2,t=row/vSegments;
  positions.push(...sample(a,Math.max(.001,t*limit(a)),.0015*Math.sin(t*Math.PI)).toArray());
  if(row<vSegments&&col<uSegments){const i=row*(uSegments+1)+col;indices.push(i,i+uSegments+1,i+1,i+1,i+uSegments+1,i+uSegments+2);}
 }
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cap.setIndex(indices);cap.computeVertexNormals();
 const strands=[];
 // Locks have a common growth direction and soft raised arcs. Fine adjacent
 // fibers break up their silhouette without hundreds of individual draw calls.
 for(let lock=0;lock<96;lock++)for(let fiber=0;fiber<3;fiber++){
  const angle=(lock+(fiber-1)*.24)/96*Math.PI*2;
  const points=[];
  for(let step=0;step<=7;step++){
   const t=step/7,start=.14+.13*(.5+.5*Math.sin(lock*2.39));
   const front=Math.cos(angle)>.05;
   const a=part&&front?(.65*(1-t)+Math.atan2(Math.sin(angle),Math.cos(angle))*t):angle+.13*(1-t);
   const tip=limit(a)+(part&&front?.12*(.5+.5*Math.sin(lock*2.39)):0);
   const polar=start+(tip-start)*t;
   const lift=(short?.003:part&&front?.028:.006)*(1+.35*volume)*Math.sin(Math.PI*t)+.0006*(fiber%2);
   points.push(sample(a,polar,lift));
  }
  strands.push(attachHairFlex(taperedStrand(new THREE.CatmullRomCurve3(points),(fiber===1?.0021:.00065)*scale,16),short?.0006:.0025));
 }
 if(part)for(let i=0;i<56;i++){
  const angle=-1.05+i/55*2.1,points=[];
  for(let step=0;step<=6;step++){
   const t=step/6,a=.65*(1-t)+angle*t;
   points.push(sample(a,.42+(limit(a)+.08+.035*Math.sin(i*2.4)-.42)*t,(.026+.004*Math.sin(i*1.7))*Math.sin(Math.PI*t)));
  }
  strands.push(attachHairFlex(taperedStrand(new THREE.CatmullRomCurve3(points),.00085*scale,18),.004));
 }
 if(character.hairStyle==='ponytail')for(let i=0;i<96;i++){
  const a=i/96*Math.PI*2,r=.004+.013*(i%11)/10,dx=Math.sin(a)*r,dz=Math.cos(a)*r;
  const p=(x,y,z)=>new THREE.Vector3(x*scale,y*scale,z*scale).sub(anchor);
  const curve=new THREE.CatmullRomCurve3([p(dx*.5,1.73,-.052+dz*.5),p(dx,1.70,-.098+dz),p(dx*.9,1.645,-.123+dz),p(dx*.45,1.585,-.109+dz*.5)]);
  strands.push(attachHairFlex(taperedStrand(curve,.0015*scale,24),.018));
 }
 const locks=mergeGeometries(strands);strands.forEach(g=>g.dispose());
 source.dispose();
 return {cap,locks,tie:sample(Math.PI,Math.acos(.036/.09))};
}
