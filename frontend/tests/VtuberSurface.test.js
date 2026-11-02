import {it,expect} from 'vitest';
import {ShaderLib,Texture,LinearFilter,BufferGeometry,Float32BufferAttribute} from 'three';
import source from '../src/health/components/character/assets/vtuber/female.json';
import {createVtuberMaterial,createVtuberOutline} from '../src/health/components/character/vtuberMaterials.js';
import {customizeVtuberData} from '../src/health/components/character/vtuberAppearance.js';
import {prepareDetailedModel,poseDetailedModel} from '../src/health/components/character/detailedModel.js';
import {applyAthleteHighlights} from '../src/health/components/exercise/instructionMannequin.js';

it('keeps tailoring coordinates unchanged through motion and stature scaling',()=>{
 const d=customizeVtuberData(source,{vtuberOutfit:'crop',vtuberChest:1,vtuberHips:1}),m=prepareDetailedModel(d,.9);
 try{
  const rest=m.geometry.getAttribute('vtuberRest'),original=rest.array.slice();
  expect(rest.count).toBe(m.geometry.getAttribute('position').count);
  expect(Array.from(rest.array)).toEqual(Array.from(new Float32Array(d.guidePositions)));
  for(const motion of ['squat','wall_push','full_pushup'])for(const t of [0,.5,1]){poseDetailedModel(m,motion,t);expect(rest.array).toEqual(original);expect(m.geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);}
 }finally{m.geometry.dispose();}
});

it('composes garment finishing before red exercise guidance and retains the selected tint',()=>{
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([.12,.8,.06,.13,.7,.05,.15,.6,.05],3));
 const m=createVtuberMaterial({name:'VtuberFittedBottom',kind:'Clothes',tintRole:'bottom',alphaMode:'OPAQUE'},{},{vtuberOutfit:'bike',vtuberBottom:'#403454'});
 try{
  expect(m.gradientMap.image.width).toBe(32);expect(m.gradientMap.magFilter).toBe(LinearFilter);
  applyAthleteHighlights(geometry,1,'squat',[m]);
  const s={uniforms:{},vertexShader:ShaderLib.toon.vertexShader,fragmentShader:ShaderLib.toon.fragmentShader};m.onBeforeCompile(s);
  expect(s.uniforms.vtuberHem.value).toBe(.67);expect(s.uniforms.vtuberWaist.value).toBe(1.06);
  expect(s.fragmentShader.indexOf('float weave')).toBeLessThan(s.fragmentShader.indexOf('diffuseColor.rgb = mix(diffuseColor.rgb, exerciseRed'));
  expect(s.vertexShader).toContain('vVtuberRest=vtuberRest');expect(s.fragmentShader).toContain('fwidth(phase)');
 }finally{m.dispose();geometry.dispose();}
});

it('keeps native whites/highlights untouched and uses restrained depth-safe outlines',()=>{
 const map=new Texture();
 for(const surface of source.surfaceMaterials){
  const m=createVtuberMaterial(surface,{map},{vtuberHair:'#ece5dc',vtuberEyes:'#3d86c9'}),line=createVtuberOutline(m,surface);
  try{
   if(['EyeWhite_00_EYE','EyeHighlight_00_EYE'].includes(surface.name)){expect(m.userData.vtuberFinish).toBeUndefined();expect(m.toneMapped).toBe(false);}
   if(['Skin','Clothes'].includes(surface.kind)){expect(line.depthWrite).toBe(false);expect(line.polygonOffset).toBe(true);}
   if(surface.name==='EyeIris_00_EYE'){
    const s={uniforms:{},vertexShader:ShaderLib.basic.vertexShader,fragmentShader:ShaderLib.basic.fragmentShader};m.onBeforeCompile(s);
    expect(s.uniforms.vtuberTint).toBeDefined();expect(s.fragmentShader.match(/float pigment=/g)).toHaveLength(1);expect(s.fragmentShader).toContain('irisPigment');
   }
  }finally{m.dispose();line.dispose();}
 }
 map.dispose();
});
