import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {taperedStrand} from './livingFace.js';
// A curved, feathered root layer follows the scalp rather than a horizontal
// forehead cutoff. The medium parting needs coverage below its split cards.
export function rootHairline(x,z,style){
 const side=THREE.MathUtils.smoothstep(Math.abs(x),.012,.045);
 const front=style==='sleek'?1.752+.013*side:1.736;
 return THREE.MathUtils.lerp(1.695,front,THREE.MathUtils.smoothstep(z,.045,.095));
}
export function buildHairRoots(base,scale,anchor,indices,style){
 const geometry=new THREE.BufferGeometry();
 if(!indices.length){geometry.setAttribute('position',new THREE.Float32BufferAttribute([],3));return geometry;}
 const head=new THREE.BufferGeometry();head.setAttribute('position',new THREE.BufferAttribute(base,3));
 const headFaces=[];for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3);if(tri.every(v=>base[v*3+1]>1.635*scale))headFaces.push(...tri);}
 head.setIndex(headFaces);const headTree=new MeshBVH(head),headRay=new THREE.Ray(),center=new THREE.Vector3(0,1.695*scale,.045*scale);
 const sample=(angle,polar)=>{
  const direction=new THREE.Vector3(.078*Math.sin(polar)*Math.sin(angle),.09*Math.cos(polar),.105*Math.sin(polar)*Math.cos(angle)).normalize();
  // Avoid tracing exactly along the body's duplicated sagittal triangle seam.
  const origin=center.clone();if(Math.abs(direction.x)<1e-9)origin.x+=.000001*scale;
  headRay.set(origin,direction);
  // The head has internal surfaces; its first hit from inside can be behind
  // the visible scalp. Fit against the outermost intersection instead.
  const hit=headTree.raycast(headRay,THREE.DoubleSide).reduce((outer,h)=>!outer||h.distance>outer.distance?h:outer,null);
  const p=hit?hit.point.clone():center.clone().addScaledVector(direction,.085*scale);
  return p.addScaledVector(direction,.0008*scale);
 };
 const positions=[],colors=[],faces=[],columns=96,rows=48;
 // Solve the boundary against the actual fitted scalp. Cropping coarse body
 // triangles by vertex height creates a jagged hole or a straight forehead band.
 for(let col=0;col<=columns;col++){
  const angle=col/columns*Math.PI*2;let low=0,high=1.95;
  for(let n=0;n<14;n++){
   const middle=(low+high)/2,p=sample(angle,middle);
   if(p.y/scale>rootHairline(p.x/scale,p.z/scale,style))low=middle;else high=middle;
  }
  const limit=(low+high)/2;
  for(let row=0;row<=rows;row++){
   const t=row/rows,world=sample(angle,Math.max(.0001,t*limit));
   const fade=THREE.MathUtils.smoothstep(world.y/scale-rootHairline(world.x/scale,world.z/scale,style),0,.0015);
   positions.push(...world.sub(anchor).toArray());colors.push(1,1,1,fade);
   if(col<columns&&row<rows){const i=col*(rows+1)+row;faces.push(i,i+1,i+rows+1,i+1,i+rows+2,i+rows+1);}
  }
 }
 head.dispose();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geometry.setIndex(faces);geometry.computeVertexNormals();
 if(style!=='sleek'||!faces.length)return geometry;
 // Fine roots bridge the split cards. Sample the fitted cap, so these are
 // attached fibers rather than a flat dark patch across the parting.
 const tree=new MeshBVH(geometry),ray=new THREE.Ray(),fibers=[];
 for(const side of [-1,1])for(let row=0;row<20;row++){
  const path=[];
  for(let step=0;step<=6;step++){
   const t=step/6,x=side*(.0006+.017*t+.00025*Math.sin(row*2.4)),y=1.7545+row*.0005+.0035*Math.sin(t*Math.PI/2);
   ray.set(new THREE.Vector3(x*scale,y*scale,.4*scale).sub(anchor),new THREE.Vector3(0,0,-1));
   const hit=tree.raycastFirst(ray,THREE.DoubleSide);if(!hit||hit.point.z+anchor.z<.08*scale)break;
   path.push(hit.point.clone().add(new THREE.Vector3(0,0,(.00025+.0005*Math.sin(t*Math.PI))*scale)));
  }
  if(path.length!==7)continue;
  const fiber=taperedStrand(new THREE.CatmullRomCurve3(path),.000065*scale,8),shade=fiber.attributes.color;
  const rgba=[];for(let i=0;i<shade.count;i++)rgba.push(shade.getX(i),shade.getY(i),shade.getZ(i),1);
  fiber.setAttribute('color',new THREE.Float32BufferAttribute(rgba,4));fiber.deleteAttribute('uv');fibers.push(fiber);
 }
 if(!fibers.length)return geometry;
 const combined=mergeGeometries([geometry,...fibers]);geometry.dispose();fibers.forEach(g=>g.dispose());return combined;
}
