import {it,expect} from 'vitest';
import {buildHeadDetails} from '../src/health/components/character/HeadDetail.jsx';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {REST,rigRotation,poseJoints} from '../src/health/components/exercise/rig.js';
import {exerciseGarmentAt,fitExerciseClothing} from '../src/health/components/exercise/exerciseAppearance.js';
import {DEFAULT_CHARACTER,normalizeCharacter} from '../src/health/components/character/character.js';
import catalog from '../src/shared/lib/localCatalog.json';
it.each(['male','female'].flatMap(body=>['short','parted','wavy','layered','bob','pixie','bun','ponytail'].map(style=>[body,style])))('generates finite fitted head details for %s/%s',(body,hairStyle)=>{
 const c={...DEFAULT_CHARACTER,body,hairStyle},base=personalizedVertices({}, {gender:body}),details=buildHeadDetails(base,1,REST,c);
 try{for(const eye of details.eyes){expect(eye.y+REST[1][1]).toBeGreaterThan(1.658);expect(eye.y+REST[1][1]).toBeLessThan(1.670);}
 if(hairStyle==='pixie')for(const g of details.curves){const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i)+REST[1][0],y=p.getY(i)+REST[1][1],z=p.getZ(i)+REST[1][2];
   if(Math.abs(x)<.05&&z>.135)expect(y).toBeGreaterThan(1.69);
  }
 }
 expect([details.cap,...details.curves].reduce((count,g)=>count+(g.index?.count||0),0)).toBeGreaterThan(100);for(const g of [details.cap,...details.curves,...details.brows]){expect(g.attributes.position.array.every(Number.isFinite)).toBe(true);if(g.attributes.normal)expect(g.attributes.normal.array.every(Number.isFinite)).toBe(true);}
 }finally{details.dispose();}
});
it('keeps the shared head rotation finite throughout the exercise catalog',()=>{
 // Head rotation is shared by every hairstyle; cover the catalog once.
 for(const e of catalog)for(const t of [0,.25,.5,.75,1])expect(rigRotation(poseJoints(e.motion_id,t),1).toArray().every(Number.isFinite)).toBe(true);
});
it('selects actual sleeves and shorts and gives joggers a different silhouette',()=>{
 const c={...DEFAULT_CHARACTER};expect(exerciseGarmentAt(.25,1.35,.03,'top',{...c,outfit:'tank'})).toBe('skin');expect(exerciseGarmentAt(.35,1.20,.03,'skin',{...c,outfit:'long'})).toBe('top');
 expect(exerciseGarmentAt(.15,.45,.03,'bottom',{...c,pants:'shorts'})).toBe('skin');expect(exerciseGarmentAt(.15,.45,.03,'skin',c)).toBe('bottom');
 const wear=sportswear(personalizedVertices({}, {gender:'male'}),1,'male'),original=wear.positions.slice(),fitted=fitExerciseClothing(wear,1,{...c,pants:'joggers'});
 expect(wear.positions).toEqual(original);expect(fitted.positions).not.toEqual(original);for(let i=1;i<original.length;i+=3)expect(fitted.positions[i]).toBe(original[i]);
 expect(normalizeCharacter({hairStyle:'bad',outfit:'bad',eyes:'bad'})).toEqual(DEFAULT_CHARACTER);
});
