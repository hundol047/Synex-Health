import * as THREE from 'three';
// Authored secondary motion follows the exercise phase. No independent clock:
// paused/reduced-motion demonstrations keep the same hair pose.
export function hairWave(progress){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0,a=p*Math.PI*2;
 return [Math.sin(a)*.72+Math.sin(2*a)*.18,(1-Math.cos(a))*.18];
}
export function attachHairFlex(geometry,strength){
 const count=geometry.attributes.position.count,values=new Float32Array(count);
 // taperedStrand uses six vertices per ring (five sides plus seam).
 const rings=count/6-1;
 for(let i=0;i<count;i++)values[i]=Math.pow(Math.floor(i/6)/rings,2)*strength;
 geometry.setAttribute('hairFlex',new THREE.BufferAttribute(values,1));return geometry;
}
export function swayingHairMaterial(character,scale){
 const material=character.style==='toon'?new THREE.MeshToonMaterial({color:character.hair,vertexColors:true}):new THREE.MeshStandardMaterial({color:character.hair,vertexColors:true,roughness:.64,metalness:0,envMapIntensity:.3});
 const wave={value:new THREE.Vector2()},size={value:scale};
 material.onBeforeCompile=shader=>{
  shader.uniforms.hairWave=wave;shader.uniforms.hairScale=size;
  shader.vertexShader='attribute float hairFlex; uniform vec2 hairWave; uniform float hairScale;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   transformed.x+=hairWave.x*hairFlex*hairScale;
   transformed.z-=hairWave.y*hairFlex*hairScale;
  `);
 };
 material.customProgramCacheKey=()=>`synex-hair-sway-v1-${character.style}`;
 return {material,setProgress(progress){wave.value.set(...hairWave(progress));},dispose(){material.dispose();}};
}
