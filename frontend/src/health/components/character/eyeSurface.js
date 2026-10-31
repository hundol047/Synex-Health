import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {taperedStrand} from './livingFace.js';
// Deterministic radial iris fibers and a dark limbal ring; original local data.
export function irisTexture(color,size=128){
 const bytes=new Uint8Array(size*size*4),base=new THREE.Color(color),c=new THREE.Color();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2),r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  const fibers=.10*Math.sin(a*79+7*r)+.055*Math.sin(a*137-18*r)+.035*Math.sin(a*231+r*30);
  const ring=1-.65*THREE.MathUtils.smoothstep(r,.78,1),inner=1-.55*(1-THREE.MathUtils.smoothstep(r,.23,.42));
  c.copy(base).multiplyScalar(Math.max(.12,(1.12+fibers*1.5)*ring*inner)).convertLinearToSRGB();
  const i=(y*size+x)*4;bytes[i]=Math.round(c.r*255);bytes[i+1]=Math.round(c.g*255);bytes[i+2]=Math.round(c.b*255);bytes[i+3]=255;
 }
 const texture=new THREE.DataTexture(bytes,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;return texture;
}
export function eyeLidGeometry(scale=1,upper=true,radius=upper?.0008:.00055){
 const points=Array.from({length:25},(_,i)=>{const t=i/24,x=(t*2-1)*.0102,y=(upper?.0034:-.0026)*Math.sin(Math.PI*t);return new THREE.Vector3(x,y,eyeSurfaceZ(x,y)+.00015).multiplyScalar(scale);});
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius*scale,6,false);
}

export function eyelashGeometry(scale=1){
 const hairs=[];
 for(let i=0;i<20;i++){
  const t=(i+.5)/20,x=(t*2-1)*.0098,edge=Math.sin(Math.PI*t);
  const y=.0034*edge,root=new THREE.Vector3(x,y,eyeSurfaceZ(x,y)+.0002).multiplyScalar(scale);
  const length=.0016+.0010*Math.sin(Math.PI*t);
  const tip=root.clone().add(new THREE.Vector3(Math.sign(x)*.00065,.0014,length).multiplyScalar(scale));
  const middle=root.clone().lerp(tip,.5);middle.y-=.0002*scale;
  hairs.push(taperedStrand(new THREE.CatmullRomCurve3([root,middle,tip]),.000085*scale,6));
 }
 const geometry=mergeGeometries(hairs);hairs.forEach(g=>g.dispose());return geometry;
}

// A human-sized circular iris is occluded by the lids, not squeezed into a
// tiny circle or stretched oval. UVs retain the original circular fibers.
export function eyeOpening(x,closure=0){
 const edge=Math.sin(Math.PI*(x/.0204+.5)),line=-.0004*edge;
 return [(-.0026*edge)*(1-closure)+line*closure,(.0034*edge)*(1-closure)+line*closure];
}
export const eyeSurfaceZ=(x,y)=>.0026-(x*x+y*y)/.026;
export function scleraGeometry(scale=1,closure=0){
 const positions=[],colors=[],indices=[],columns=40,rows=12;
 const centerColor=new THREE.Color('#ded8d0'),rimColor=new THREE.Color('#af9384'),color=new THREE.Color();
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const x=(col/columns*2-1)*.0102,[bottom,top]=eyeOpening(x,closure),y=THREE.MathUtils.lerp(bottom,top,row/rows);
  positions.push(x*scale,y*scale,eyeSurfaceZ(x,y)*scale);
  // The sclera is shaded by the lids and warms toward the tear-duct corners;
  // a flat white almond looks pasted onto the face, especially at portrait size.
  const corner=THREE.MathUtils.smoothstep(Math.abs(x),.006,.0102);
  const lid=Math.pow(Math.abs(row/rows*2-1),5);
  color.copy(centerColor).lerp(rimColor,Math.min(.8,.65*corner+.28*lid));
  colors.push(color.r,color.g,color.b);
  if(row<rows&&col<columns){const i=row*(columns+1)+col;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function visibleIrisGeometry(scale=1,radius=.0044,closure=0,depth=.00012,gaze=[0,0]){
 // Tessellate the iris on the same curved surface as the sclera. A single
 // fan cuts through the convex white surface and hides the iris at oblique views.
 const positions=[],uv=[],indices=[],columns=48,rows=20;
 const gx=THREE.MathUtils.clamp(gaze[0]||0,-.0008,.0008)*(1-closure),gy=THREE.MathUtils.clamp(gaze[1]||0,-.0003,.0003)*(1-closure);
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const localX=(col/columns*2-1)*radius,x=localX+gx,disc=Math.sqrt(Math.max(0,radius*radius-localX*localX)),[bottom,top]=eyeOpening(x,closure);
  const low=Math.max(gy-disc,bottom),high=Math.min(gy+disc,top),y=low<=high?THREE.MathUtils.lerp(low,high,row/rows):THREE.MathUtils.clamp(gy,bottom,top);
  positions.push(x*scale,y*scale,(eyeSurfaceZ(x,y)+depth)*scale);uv.push(.5+localX/(radius*2),THREE.MathUtils.clamp(.5+(y-gy)/(radius*2),0,1));
  if(row<rows&&col<columns){const i=row*(columns+1)+col;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// A fine lash root sits ahead of the iris plane, avoiding a pale outlined eye.
export function upperLashLineGeometry(scale=1){
 const points=Array.from({length:25},(_,i)=>{const t=i/24,x=(t*2-1)*.0102,y=.0034*Math.sin(Math.PI*t);return new THREE.Vector3(x,y,eyeSurfaceZ(x,y)+.00024).multiplyScalar(scale);});
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.00012*scale,6,false);
}
