import * as THREE from 'three';

// One coordinated toon treatment for the authored anime face/body. The eyes
// retain their painted iris/highlights, without the realistic skin specular lobe.
const ramp=new THREE.DataTexture(new Uint8Array([205,222,240,255]),4,1,THREE.RedFormat);
ramp.minFilter=THREE.NearestFilter;ramp.magFilter=THREE.NearestFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
export function createVtuberMaterial(surface,maps){
 const options={map:maps.map,color:'#ffffff',side:surface.doubleSided?THREE.DoubleSide:THREE.FrontSide,
  alphaTest:surface.alphaMode==='OPAQUE'?0:.35,transparent:false};
 // The source's face/hair shading is painted into the atlas. Relighting it
 // with portrait softboxes double-shaded the face grey and exposed triangles.
 if(surface.kind!=='Clothes')return new THREE.MeshBasicMaterial({...options,toneMapped:false});
 const top=surface.name==='Tops_01_CLOTH',color=top?'#a6ccef':'#ffffff';
 return new THREE.MeshToonMaterial({...options,color,gradientMap:ramp,emissive:color,emissiveMap:maps.map,emissiveIntensity:.18});
}

export function createVtuberOutline(material,surface){
 if(!['Skin','Hair','Clothes'].includes(surface.kind))return new THREE.MeshBasicMaterial({visible:false});
 const line=new THREE.MeshBasicMaterial({color:'#352d42',map:material.map,side:THREE.BackSide,alphaTest:material.alphaTest,toneMapped:false});
 line.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normal * 0.00085;');};
 line.customProgramCacheKey=()=> 'synex-vtuber-outline-v1';return line;
}
