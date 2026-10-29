import * as THREE from 'three';
// Deterministic radial iris fibers and a dark limbal ring; original local data.
export function irisTexture(color,size=128){
 const bytes=new Uint8Array(size*size*4),base=new THREE.Color(color),c=new THREE.Color();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2),r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  const fibers=.10*Math.sin(a*79+7*r)+.055*Math.sin(a*137-18*r)+.035*Math.sin(a*231+r*30);
  const ring=1-.65*THREE.MathUtils.smoothstep(r,.78,1),inner=1-.55*(1-THREE.MathUtils.smoothstep(r,.23,.42));
  c.copy(base).multiplyScalar(Math.max(.12,(.94+fibers)*ring*inner)).convertLinearToSRGB();
  const i=(y*size+x)*4;bytes[i]=Math.round(c.r*255);bytes[i+1]=Math.round(c.g*255);bytes[i+2]=Math.round(c.b*255);bytes[i+3]=255;
 }
 const texture=new THREE.DataTexture(bytes,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;return texture;
}
export function eyeLidGeometry(scale=1,upper=true){
 const points=Array.from({length:25},(_,i)=>{const t=i/24,x=(t*2-1)*.0102*scale;return new THREE.Vector3(x,(upper?.0034:-.0026)*Math.sin(Math.PI*t)*scale,.0018*Math.sin(Math.PI*t)*scale);});
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,(upper?.0008:.00055)*scale,6,false);
}
