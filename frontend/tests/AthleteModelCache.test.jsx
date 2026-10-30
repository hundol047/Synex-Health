import {it,expect} from 'vitest';
import {prepareAthlete,getGripSurface} from '../src/health/components/exercise/athleteModel.js';
import {DEFAULT_CHARACTER} from '../src/health/components/character/character.js';
import {acquireHeadDetails} from '../src/health/components/character/HeadDetail.jsx';
import {poseJoints,deformSurface} from '../src/health/components/exercise/rig.js';
it('reuses body and grip calculations across color/motion changes but invalidates shape changes',()=>{
 const a=prepareAthlete(undefined,{gender:'male'},DEFAULT_CHARACTER);
 const b=prepareAthlete(undefined,{gender:'male'},{...DEFAULT_CHARACTER,skin:'#704735',hairStyle:'ponytail',top:'#abcdef'});
 expect(b).toBe(a);expect(getGripSurface(a,'relaxed')).toBe(getGripSurface(b,'relaxed'));
 expect(prepareAthlete(undefined,{gender:'male'},{...DEFAULT_CHARACTER,chest:1})).not.toBe(a);
 expect(prepareAthlete({height:190},{gender:'male'},DEFAULT_CHARACTER)).not.toBe(a);
 expect(prepareAthlete(undefined,{gender:'female'},{...DEFAULT_CHARACTER,body:'female'})).not.toBe(a);
 const original=a.base.slice(),rest=JSON.stringify(a.rest),target=new Float32Array(a.base.length);
 deformSurface(getGripSurface(a,'relaxed'),a.weights,poseJoints('squat',.5,a.rest),target,a.rest,false);
 expect(a.base).toEqual(original);expect(JSON.stringify(a.rest)).toBe(rest);
});
it('hands each viewer independent head geometry while preserving cached detail',()=>{
 const m=prepareAthlete(undefined,{gender:'male'},DEFAULT_CHARACTER);
 const a=acquireHeadDetails(m.headBase,m.scale,m.rest,DEFAULT_CHARACTER),b=acquireHeadDetails(m.headBase,m.scale,m.rest,DEFAULT_CHARACTER);
 try{expect(a.cap).not.toBe(b.cap);expect(a.cap.attributes.position.count).toBeLessThan(3000);expect(a.cap.attributes.position.array).toEqual(b.cap.attributes.position.array);a.cap.attributes.position.array.fill(0);expect(b.cap.attributes.position.array.some(x=>x!==0)).toBe(true);}finally{a.dispose();b.dispose();}
});
