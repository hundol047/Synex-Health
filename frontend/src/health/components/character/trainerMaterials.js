import * as THREE from 'three';
import {createTrainerSkinMaterial} from './trainerSkin.js';
import {createVtuberMaterial} from './vtuberMaterials.js';

// Treat photographed skin, a wet eye surface, strands and woven clothing as
// different materials. The scan's solid hair shell must still write depth;
// only the MakeHuman strand/lash cards need alpha blending.
export function createTrainerSurfaceMaterial(surface, maps, {scanned=false,authored=false,body='male',natural=false,studio=false,character}={}) {
 if(surface.toon)return createVtuberMaterial(surface,maps,character);
 const {kind}=surface;
 const options={...maps,metalness:0,roughness:.86,specularIntensity:.2,
  envMapIntensity:.65,ior:1.45,normalScale:new THREE.Vector2(.22,.22),bumpScale:.0004,
 };
 if(surface.color)options.color=surface.color;
 if(scanned)options.side=THREE.DoubleSide;
 if(kind==='Skin'){
  if(authored)Object.assign(options,{normalScale:new THREE.Vector2(.35,.35),color:'#fff5ee'});
  return createTrainerSkinMaterial(options,{nativeTexture:scanned||authored});
 }
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
 if(kind==='Hair'&&authored)Object.assign(options,{
  color:surface.name==='Hair_Transparency'?'#676e7d':'#9198a4',
  roughness:.44,specularIntensity:.4,anisotropy:.45,anisotropyRotation:Math.PI/2,
 });
 if(kind==='Clothes')Object.assign(options,{sheen:.18,sheenRoughness:.9});
 if(['Hair','Eyebrows','Eyelashes'].includes(kind)&&surface.alphaMode!=='OPAQUE'){
  Object.assign(options,{transparent:true,depthWrite:false,side:THREE.DoubleSide,alphaTest:.10});
 }
 if(kind==='Eyelashes')Object.assign(options,{opacity:studio?.55:body==='female'?.85:.55,specularIntensity:0,roughness:1});
 const material=new THREE.MeshPhysicalMaterial(options);
 if(surface.neutralFabric){
  // Retain textile/stitch detail while making the chosen navy/ivory color
  // independent of the old blue shoes and almost-black sportsuit albedo.
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    vec4 fabric=texture2D(map,vMapUv);
    float weave=dot(fabric.rgb,vec3(.2126,.7152,.0722));
    diffuseColor*=vec4(vec3(.38+.62*sqrt(weave)),fabric.a);
   #endif
  `);};
  material.customProgramCacheKey=()=> 'synex-neutral-sports-fabric-v1';
 }
 return material;
}
