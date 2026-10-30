import {it,expect} from 'vitest';
import {DEFAULT_CHARACTER,normalizeCharacter,characterSurface,eyeProportions,saveCharacter,readCharacter} from '../src/health/components/character/character.js';
import {buildHeadDetails} from '../src/health/components/character/HeadDetail.jsx';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';
import {REST} from '../src/health/components/exercise/rig.js';
it('migrates old settings and bounds new proportions without losing saved appearance',()=>{
 expect(normalizeCharacter({skin:'#98765a',chest:.5})).toMatchObject({skin:'#98765a',chest:.5,eyeSize:0,hairVolume:0});
 expect(normalizeCharacter({eyeSize:10,hairVolume:-10})).toMatchObject({eyeSize:1,hairVolume:-1});
 expect(normalizeCharacter({eyeSize:NaN,hairVolume:Infinity})).toMatchObject({eyeSize:0,hairVolume:0});
 saveCharacter({...DEFAULT_CHARACTER,eyeSize:.7,hairVolume:-.5,chest:.9});expect(readCharacter()).toMatchObject({eyeSize:.7,hairVolume:-.5,chest:.9});
});
it('reshapes eye openings locally on both bodies without changing limbs or supports',()=>{
 for(const gender of ['male','female']){
  const base=personalizedVertices({}, {gender}),original=base.slice();
  const small=characterSurface(base,{eyeSize:-1}),large=characterSurface(base,{eyeSize:1});
  expect(large.every(Number.isFinite)).toBe(true);expect(small).not.toEqual(large);expect(base).toEqual(original);
  for(let i=0;i<base.length;i+=3)if(base[i+1]<1.63){expect(large.slice(i,i+3)).toEqual(small.slice(i,i+3));}
  expect(eyeProportions(-1)).toEqual([.85,.75,1]);expect(eyeProportions(1)).toEqual([1.15,1.25,1]);
 }
});
it('changes actual hair geometry with volume for every hairstyle',()=>{
 const base=personalizedVertices({}, {gender:'female'});
 for(const hairStyle of ['short','parted','bun']){
  const small=buildHeadDetails(base,1,REST,{...DEFAULT_CHARACTER,hairStyle,hairVolume:-1}),large=buildHeadDetails(base,1,REST,{...DEFAULT_CHARACTER,hairStyle,hairVolume:1});
  try{expect(small.cap.attributes.position.array).not.toEqual(large.cap.attributes.position.array);expect(large.curves[0].attributes.position.array.every(Number.isFinite)).toBe(true);expect(large.bunScale).toBeGreaterThan(small.bunScale);}finally{small.dispose();large.dispose();}
 }
});
