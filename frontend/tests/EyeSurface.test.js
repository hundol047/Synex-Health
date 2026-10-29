import {it,expect} from 'vitest';
import {irisTexture,eyeLidGeometry} from '../src/health/components/character/eyeSurface.js';
import {exerciseMaterials} from '../src/health/components/exercise/exerciseAppearance.js';
import {DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
it('builds deterministic iris fibers with a darker outer rim and bounded texture memory',()=>{
 const a=irisTexture('#4b6b72'),b=irisTexture('#4b6b72');try{
 expect(a.image.data).toEqual(b.image.data);expect(a.image.data.length).toBe(128*128*4);
 const brightness=x=>[0,1,2].reduce((v,c)=>v+a.image.data[(64*128+x)*4+c],0);expect(brightness(126)).toBeLessThan(brightness(100));
 }finally{a.dispose();b.dispose();}
});
it('keeps the eyelid opening finite and the skin microrelief below a millimeter',()=>{
 for(const upper of [true,false]){const lid=eyeLidGeometry(1,upper);try{expect(lid.attributes.position.array.every(Number.isFinite)).toBe(true);lid.computeBoundingBox();expect(lid.boundingBox.max.x-lid.boundingBox.min.x).toBeLessThan(.025);}finally{lid.dispose();}}
 const surface=exerciseMaterials(DEFAULT_CHARACTER);try{expect(surface.materials[0].bumpScale).toBeLessThan(.0005);const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <roughnessmap_fragment>'};surface.materials[0].onBeforeCompile(shader);expect(shader.fragmentShader).toContain('facialSkin');expect(shader.uniforms.characterLip.value.isColor).toBe(true);}finally{surface.dispose();}
});
