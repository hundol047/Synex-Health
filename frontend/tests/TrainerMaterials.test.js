import {it,expect} from 'vitest';
import {BufferGeometry,Float32BufferAttribute,ShaderLib,Texture} from 'three';
import {createTrainerSurfaceMaterial} from '../src/health/components/character/trainerMaterials.js';
import {applyAthleteHighlights} from '../src/health/components/exercise/instructionMannequin.js';

it('keeps solid scan hair depth-writing while preserving transparent authored strands',()=>{
 const map=new Texture(),solid=createTrainerSurfaceMaterial({kind:'Hair',alphaMode:'OPAQUE'},{map},{scanned:true});
 const strands=createTrainerSurfaceMaterial({kind:'Hair'},{map});
 try{
  expect(solid.transparent).toBe(false);expect(solid.depthWrite).toBe(true);
  expect(strands.transparent).toBe(true);expect(strands.depthWrite).toBe(false);
  expect(solid.map).toBe(map);expect(strands.map).toBe(map);
 }finally{solid.dispose();strands.dispose();map.dispose();}
});

it('composes both skin variants with exercise guidance without replacing source maps',()=>{
 const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([.1,.7,.1],3));
 const map=new Texture({width:2048,height:2048});
 try{for(const scanned of [true,false]){
  const skin=createTrainerSurfaceMaterial({kind:'Skin'},{map},{scanned});
  try{
   const unlitKey=skin.customProgramCacheKey();
   applyAthleteHighlights(geometry,1,'squat',[skin]);
   const shader={uniforms:{},vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader};
   skin.onBeforeCompile(shader);
   expect(skin.map).toBe(map);expect(shader.uniforms.exerciseRed).toBeDefined();
   expect(shader.fragmentShader).toContain('diffuseColor.rgb = mix');
   if(scanned)expect(shader.fragmentShader).toContain('#include <map_fragment>');
   else{expect(shader.uniforms.synexSkinTexel).toBeDefined();expect(shader.fragmentShader).toContain('synexSkinSample');}
   expect(skin.customProgramCacheKey()).not.toBe(unlitKey);
  }finally{skin.dispose();}
 }}finally{geometry.dispose();map.dispose();}
});
