import {it,expect} from 'vitest';
import {Color} from 'three';
import {DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import {visibleIrisGeometry} from '../src/health/components/character/eyeSurface.js';
import {buildHeadDetails} from '../src/health/components/character/HeadDetail.jsx';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {exerciseAvatarGeometry,fitExerciseClothing} from '../src/health/components/exercise/exerciseAppearance.js';
import {REST} from '../src/health/components/exercise/rig.js';

it('keeps ears skin-colored on both bodies and light/dark complexions',()=>{
 for(const gender of ['male','female'])for(const skin of ['#e8bfa3','#543529']){
  const wear=sportswear(personalizedVertices({}, {gender}),1,gender);
  const geometry=exerciseAvatarGeometry(wear,1,{...DEFAULT_CHARACTER,skin});
  const tone=new Color(skin);let ears=0;
  try{
   expect(geometry.groups[4].count).toBe(0); // Hair belongs to the fitted cap.
   for(let i=0;i<wear.labels.length;i++){
    const [x,y]=wear.positions.slice(i*3,i*3+2);
    if(Math.abs(x)>.078&&y>1.63&&y<1.67){
     ears++;
     const actual=new Color().fromArray(geometry.attributes.color.array,i*3);
     expect(Math.abs(actual.r-tone.r)).toBeLessThan(.02);
     expect(Math.abs(actual.g-tone.g)).toBeLessThan(.02);
    }
   }
   expect(ears).toBeGreaterThan(5);
  }finally{geometry.dispose();}
 }
});

it('clips a full-width iris to the eyelid opening while retaining circular UVs',()=>{
 const g=visibleIrisGeometry();
 try{
  g.computeBoundingBox();expect(g.boundingBox.max.x-g.boundingBox.min.x).toBeCloseTo(.0088);
  expect(g.boundingBox.max.y).toBeLessThanOrEqual(.003101);
  expect(g.boundingBox.min.y).toBeGreaterThanOrEqual(-.002501);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
   expect(uv.getX(i)).toBeCloseTo(.5+p.getX(i)/.0088);
   expect(uv.getY(i)).toBeCloseTo(.5+p.getY(i)/.0088);
  }
 }finally{g.dispose();}
});

it('keeps detailed hair within mobile geometry limits and tailoring off the support joints',()=>{
 const base=personalizedVertices({}, {gender:'male'}),head=buildHeadDetails(base,1,REST,DEFAULT_CHARACTER);
 try{
  expect(head.cap.attributes.position.count).toBeLessThan(3000);
  expect(head.curves.reduce((sum,g)=>sum+g.attributes.position.count,0)).toBeLessThan(50000);
  for(const g of [head.cap,...head.curves])expect(g.attributes.position.array.every(Number.isFinite)).toBe(true);
 }finally{head.dispose();}
 const wear=sportswear(base,1,'male'),fitted=fitExerciseClothing(wear,1,{...DEFAULT_CHARACTER,pants:'leggings'});
 for(let i=0;i<wear.positions.length;i+=3){
  const [x,y]=wear.positions.slice(i,i+2);
  if(y<.985||y>1.475||Math.abs(x)>.21)expect(fitted.positions.slice(i,i+3)).toEqual(wear.positions.slice(i,i+3));
 }
});
