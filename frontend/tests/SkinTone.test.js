import {expect,it} from 'vitest';
import {SKIN_TONES,skinDetailColors} from '../src/health/components/character/skinTone.js';
import {normalizeCharacter} from '../src/health/components/character/character.js';
const luminance=c=>.2126*c.r+.7152*c.g+.0722*c.b;
it('preserves every preset and custom skin color through saved preferences',()=>{
 for(const skin of [...SKIN_TONES.map(t=>t.color),'#98765a'])expect(normalizeCharacter({skin}).skin).toBe(skin);
});
it('keeps lips and eyelids related to the selected complexion without bleaching dark tones',()=>{
 let last=Infinity;
 for(const {color} of SKIN_TONES){
  const tones=skinDetailColors(color),light=luminance(tones.skin);
  expect(light).toBeLessThan(last);last=light;
  for(const key of ['lip','upperLid','lowerLid']){
   const value=luminance(tones[key]);expect(value).toBeLessThan(light);expect(value).toBeGreaterThan(light*.5);
  }
  for(const c of Object.values(tones))for(const channel of [c.r,c.g,c.b]){expect(channel).toBeGreaterThanOrEqual(0);expect(channel).toBeLessThanOrEqual(1);}
 }
});
