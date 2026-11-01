import * as THREE from 'three';
import {createTrainerSkinMaterial} from './trainerSkin.js';

// Treat photographed skin, a wet eye surface, strands and woven clothing as
// different materials. The scan's solid hair shell must still write depth;
// only the MakeHuman strand/lash cards need alpha blending.
export function createTrainerSurfaceMaterial(surface, maps, {scanned=false, body='male',natural=false}={}) {
 const {kind}=surface;
 const options={...maps,metalness:0,roughness:.86,specularIntensity:.2,
  envMapIntensity:.65,ior:1.45,normalScale:new THREE.Vector2(.22,.22),bumpScale:.0004,
 };
 if(surface.color)options.color=surface.color;
 if(scanned)options.side=THREE.DoubleSide;
 if(kind==='Skin')return createTrainerSkinMaterial(options,{nativeTexture:scanned});
 if(kind==='Eyes')Object.assign(options,{
  color:'#ffffff',roughness:.17,specularIntensity:.5,envMapIntensity:.9,
  ior:1.376,clearcoat:.6,clearcoatRoughness:.12,
 });
 if(kind==='Hair')Object.assign(options,{
  color:natural?(scanned?'#8291a3':'#655c55'):surface.color||(scanned?'#ffffff':'#74665c'),
  // The scan's atlas is not strand-aligned. An anisotropic lobe exaggerates
  // tangent changes into polygon-shaped highlights around its hair crown.
  roughness:scanned?.62:.55,specularIntensity:scanned?.3:.35,ior:1.46,
 });
 if(kind==='Clothes')Object.assign(options,{sheen:.18,sheenRoughness:.9});
 if(['Hair','Eyebrows','Eyelashes'].includes(kind)&&surface.alphaMode!=='OPAQUE'){
  Object.assign(options,{transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.10});
 }
 if(kind==='Eyelashes')Object.assign(options,{opacity:body==='female'?.85:.55,specularIntensity:0,roughness:1});
 return new THREE.MeshPhysicalMaterial(options);
}
