import {it,expect} from 'vitest';
import {STUDIO_PRESETS,normalizeCharacter,characterSurface,saveCharacter,readCharacter} from '../src/health/components/character/character.js';
import {personalizedVertices} from '../src/health/components/body3d/avatar.js';

it.each(['female','male'])('keeps the %s studio head changes local and preserves saved customization',body=>{
 const preset=STUDIO_PRESETS[body],base=personalizedVertices({}, {gender:body}),original=base.slice();
 const result=characterSurface(base,{body,face:'studio'});
 expect(result.every(Number.isFinite)).toBe(true);expect(base).toEqual(original);
 let changed=0;
 for(let i=0;i<base.length;i+=3){
  if(base[i+1]<1.54)expect(result.slice(i,i+3)).toEqual(base.slice(i,i+3));
  else if(result[i]!==base[i])changed++;
  for(let j=0;j<3;j++)expect(Math.abs(result[i+j]-base[i+j])).toBeLessThan(.025);
 }
 expect(changed).toBeGreaterThan(100);expect(normalizeCharacter(preset)).toEqual(preset);
 localStorage.setItem('health-record','unchanged');saveCharacter(preset);expect(readCharacter()).toEqual(preset);
 saveCharacter({...readCharacter(),eyes:'#356ba5',hairVolume:.3});expect(readCharacter()).toMatchObject({...preset,eyes:'#356ba5',hairVolume:.3});
 expect(localStorage.getItem('health-record')).toBe('unchanged');
});
