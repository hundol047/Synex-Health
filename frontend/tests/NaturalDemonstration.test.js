import {expect,it} from 'vitest';
import {repetition} from '../src/health/components/exercise/poseMath.js';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {exerciseAvatarGeometry,exerciseMaterials} from '../src/health/components/exercise/exerciseAppearance.js';
import {applyAthleteHighlights} from '../src/health/components/exercise/instructionMannequin.js';
it('moves through the former frozen turnaround while closing the loop smoothly',()=>{
 expect(repetition(0)).toBe(0);expect(repetition(.5)).toBe(1);expect(repetition(1)).toBe(0);
 for(let i=1;i<=500;i++)expect(repetition(i/1000)).toBeGreaterThan(repetition((i-1)/1000));
 for(let i=501;i<=1000;i++)expect(repetition(i/1000)).toBeLessThan(repetition((i-1)/1000));
 for(const t of [0,.5,1])expect(Math.abs(repetition(Math.min(1,t+.0001))-repetition(Math.max(0,t-.0001)))).toBeLessThan(1e-8);
});
it('highlights working regions on clothed athletes without recoloring the face or discarding materials',()=>{
 const geometry=exerciseAvatarGeometry(sportswear(personalizedVertices({}, {gender:'male'}),1,'male'));
 const surface=exerciseMaterials(),groups=JSON.stringify(geometry.groups),colors=geometry.attributes.color.array.slice();
 try{
  applyAthleteHighlights(geometry,1,'squat',surface.materials);
  expect(JSON.stringify(geometry.groups)).toBe(groups);expect(geometry.attributes.color.array).toEqual(colors);
  const weights=geometry.attributes.exerciseHighlight.array,positions=geometry.attributes.position.array;
  expect(Math.max(...weights)).toBeGreaterThan(.7);
  for(let i=0;i<weights.length;i++){expect(weights[i]).toBeGreaterThanOrEqual(0);expect(weights[i]).toBeLessThanOrEqual(.79);if(positions[i*3+1]>1.54)expect(weights[i]).toBe(0);}
 }finally{geometry.dispose();surface.dispose();}
});
