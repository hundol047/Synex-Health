import * as THREE from 'three';
// Original procedural colors; no downloaded textures or identity reconstruction.
export const GARMENTS=['skin','top','bottom','shoes'];
export function avatarGeometry(wear,stature=1){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(wear.positions.slice(),3));
 const index=[];for(const [materialIndex,name] of GARMENTS.entries()){const start=index.length;if(name!=='shoes')index.push(...wear.indices[name]);g.addGroup(start,index.length-start,materialIndex);}g.setIndex(index);
 const colors=new Float32Array(wear.positions.length),base={skin:new THREE.Color('#c99173'),top:new THREE.Color('#29536a'),bottom:new THREE.Color('#24323d'),shoes:new THREE.Color('#c8c7be')};
 const hair=new THREE.Color('#30251f'),lip=new THREE.Color('#9b5d54'),brow=new THREE.Color('#47312a');
 const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
 for(let i=0;i<wear.labels.length;i++){
  const x=wear.positions[i*3],y=wear.positions[i*3+1]/stature,z=wear.positions[i*3+2],label=wear.labels[i],c=base[label].clone();
  if(label==='skin'){
   const warmth=.025*Math.sin(y*11)+.015*Math.sin(x*55);c.offsetHSL(0,0,warmth);
   if(y>1.52){
    const hairline=z>.095?1.728- .013*Math.cos(x*35):1.638;
    const h=THREE.MathUtils.smoothstep(y,hairline,hairline+.015);c.lerp(hair,h*.97);
    if(z>.11){
     c.lerp(lip,.65*gaussian(x,y,0,1.609,.027,.008));
     const eyebrows=gaussian(Math.abs(x),y,.034,1.694,.020,.004);
     c.lerp(brow,.85*eyebrows);
     // Small eye-socket definition complements the existing modeled eyelids.
     c.lerp(brow,.5*gaussian(Math.abs(x),y,.034,1.677,.013,.004));
    }
   }
  }else{
   const knit=.012*Math.sin(x*620)*Math.sin(y*620);c.offsetHSL(0,0,knit);
   if(label==='top'&&(Math.abs(x)>.19||y>1.435))c.multiplyScalar(.86);
   if(label==='bottom'&&y>.90)c.multiplyScalar(.8);
   if(label==='shoes'&&y<.045)c.lerp(new THREE.Color('#f2eee4'),.65);
  }
  c.toArray(colors,i*3);
 }
 g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export const MATERIALS=[{roughness:.62},{roughness:.96},{roughness:.94},{roughness:.82}];
