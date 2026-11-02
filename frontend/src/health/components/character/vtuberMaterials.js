import * as THREE from 'three';
import {normalizeVtuberOptions,VTUBER_DEFAULTS} from './vtuberOptions.js';
import {finishVtuberSurface} from './vtuberSurface.js';

// One coordinated toon treatment for the authored anime face/body. The eyes
// retain their painted iris/highlights, without the realistic skin specular lobe.
const ramp=new THREE.DataTexture(Uint8Array.from({length:32},(_,i)=>195+60*Math.pow(i/31,.7)),32,1,THREE.RedFormat);
ramp.minFilter=THREE.LinearFilter;ramp.magFilter=THREE.LinearFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
// Recolor only the dedicated hair/iris/fabric material. Painted luminance and
// iris pupil/highlight masks stay intact; the eye whites are a separate mesh.
function tintMaterial(material,color,mode){
 material.userData.vtuberTint=color;
 material.onBeforeCompile=shader=>{
  shader.uniforms.vtuberTint={value:new THREE.Color(color)};
  shader.fragmentShader='uniform vec3 vtuberTint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   #ifdef USE_MAP
    float pigment=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    float shade=${mode==='fabric'?'.38+.62*sqrt(pigment)':'.28+.72*sqrt(clamp(pigment/.32,0.0,1.6))'};
    float tintMask=${mode==='iris'?'smoothstep(.008,.06,pigment)*(1.0-smoothstep(.65,.90,pigment))':'1.0'};
    diffuseColor.rgb=mix(diffuseColor.rgb,vtuberTint*shade,tintMask);
   #endif
  `);
 };
 material.customProgramCacheKey=()=> 'synex-vtuber-tint-'+mode+'-v1';return material;
}
export function createVtuberMaterial(surface,maps,character){
 const c=normalizeVtuberOptions(character);
 const options={map:maps.map,color:'#ffffff',side:surface.doubleSided?THREE.DoubleSide:THREE.FrontSide,
  alphaTest:surface.alphaMode==='OPAQUE'?0:.35,transparent:false};
 // The source's face/hair shading is painted into the atlas. Relighting it
 // with portrait softboxes double-shaded the face grey and exposed triangles.
 if(surface.kind!=='Clothes'){
  const m=new THREE.MeshBasicMaterial({...options,toneMapped:false});
  if((surface.kind==='Hair'||surface.name==='FaceBrow_00_FACE')&&c.vtuberHair!==VTUBER_DEFAULTS.vtuberHair)tintMaterial(m,c.vtuberHair,'hair');
  if(surface.name==='EyeIris_00_EYE'&&c.vtuberEyes!==VTUBER_DEFAULTS.vtuberEyes)tintMaterial(m,c.vtuberEyes,'iris');
  return finishVtuberSurface(m,surface,c);
 }
 const role=surface.tintRole||(surface.name==='Tops_01_CLOTH'?'top':surface.name==='Bottoms_01_CLOTH'?'bottom':null);
 const color=role==='top'?c.vtuberTop:role==='bottom'?c.vtuberBottom:'#ffffff';
 const m=new THREE.MeshToonMaterial({...options,color:role==='bottom'&&maps.map?'#ffffff':color,gradientMap:ramp,emissive:color,emissiveMap:maps.map,emissiveIntensity:.18});
 if(role==='bottom'&&maps.map)tintMaterial(m,color,'fabric');
 return finishVtuberSurface(m,surface,c);
}

export function createVtuberOutline(material,surface){
 // Layered hair cards have authored edges; an inverted hull prints dots over
 // neighboring strands when viewed from behind. Keep outlines on solid skin/fabric.
 if(!['Skin','Clothes'].includes(surface.kind))return new THREE.MeshBasicMaterial({visible:false});
 const color=surface.kind==='Skin'?new THREE.Color('#906c61'):surface.kind==='Hair'?new THREE.Color(material.userData.vtuberTint||'#704b3c').multiplyScalar(.32):material.color.clone().multiplyScalar(.35);
 const width=surface.kind==='Skin'?.0004:surface.kind==='Hair'?.00045:.00055;
 const line=new THREE.MeshBasicMaterial({color,map:material.map,side:THREE.BackSide,alphaTest:material.alphaTest,toneMapped:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 line.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed += normal * ${width};`);};
 line.customProgramCacheKey=()=> 'synex-vtuber-outline-v2-'+width;return line;
}
