import {it,expect} from 'vitest';
import data from '../src/health/components/body3d/assets/human-mesh.json';
import {morphPositions,morphParameters,measurementDeltas} from '../src/health/components/body3d/morph.js';
import {bindSurface,deformSurface,poseJoints} from '../src/health/components/exercise/rig.js';
import {MOTIONS} from '../src/health/components/exercise/motions.js';
import {SquatCoach,jointAngle} from '../src/health/components/exercise/poseCoach.js';
import {calendarStats} from '../src/health/components/WorkoutCalendar.jsx';
const base=Float32Array.from(data.profiles.male,n=>n*data.scale);
it('morphs height, fat, muscle and independent sides with finite bounded positions',()=>{
 const p={gender:'male'},m={height:178,weight:70,skeletal_muscle_mass:32,body_fat_percentage:20};
 const a=morphPositions(base,m,p),b=morphPositions(base,{...m,weight:100,body_fat_percentage:35},p);
 expect(a).not.toEqual(b);expect(b.every(Number.isFinite)).toBe(true);
 const params=morphParameters({...m,segments:[{segment:'LEFT_ARM',lean_mass_kg:5},{segment:'RIGHT_ARM',lean_mass_kg:2}]},p);
 expect(params.parts.LEFT_ARM).toBeGreaterThan(params.parts.RIGHT_ARM);
 const tall=morphPositions(base,{...m,height:200},p);expect(Math.max(...tall)).toBeGreaterThan(Math.max(...a));
});
it('missing measurement deltas remain unknown, percent uses difference',()=>{const d=measurementDeltas({weight:60},{weight:58});expect(d[0].value).toBe(-2);expect(d[1].value).toBeNull();});
it('deforms a human surface for every catalog motion',()=>{
 const weights=bindSurface(base);for(const id of Object.keys(MOTIONS)){const a=deformSurface(base,weights,poseJoints(id,0),new Float32Array(base.length));const b=deformSurface(base,weights,poseJoints(id,.31),new Float32Array(base.length));expect(b.every(Number.isFinite)).toBe(true);expect(a).not.toEqual(b);}
});
it('pose math and confidence guard do not count unobserved repetitions',()=>{
 expect(jointAngle({x:0,y:1},{x:0,y:0},{x:1,y:0})).toBeCloseTo(90);
 const coach=new SquatCoach();expect(coach.update([],1000).reps).toBe(0);expect(coach.update([],2000).phase).toBe('unknown');
});
it('calendar counts exercise slots and active days separately',()=>{
 const r=calendarStats([{date:'2026-09-21',completed:true,actual_minutes:10},{date:'2026-09-21',completed:true,actual_minutes:5},{date:'2026-09-20',completed:true}],new Date('2026-09-21T12:00:00'));
 expect(r.sessions).toBe(2);expect(r.exercises).toBe(3);expect(r.minutes).toBe(15);expect(r.streak).toBe(2);
});
it('counts a complete squat and rejects a repetition interrupted by lost tracking',()=>{
 const pose=bent=>Array.from({length:33},(_,i)=>({x:i%2*.2,y:[11,12].includes(i)?0:[23,24].includes(i)?.4:[25,26].includes(i)?.7:bent?.7:1,z:bent&&[27,28].includes(i)?.4:0,visibility:1}));
 const coach=new SquatCoach();coach.update(pose(false),1000);coach.update(pose(true),1500);
 expect(coach.update(pose(false),2000).reps).toBe(1);
 coach.update(pose(true),2500);coach.update([],2700);expect(coach.update(pose(false),4000).reps).toBe(1);
});
it('total muscle and fat affect a model with complete segment measurements',()=>{
 const segments=['TRUNK','LEFT_ARM','RIGHT_ARM','LEFT_LEG','RIGHT_LEG'].map(segment=>({segment,lean_mass_kg:3,fat_mass_kg:1}));
 const m={height:178,weight:70,skeletal_muscle_mass:25,body_fat_percentage:18,segments};
 expect(morphPositions(base,m,{})).not.toEqual(morphPositions(base,{...m,skeletal_muscle_mass:40},{}));
 expect(morphPositions(base,m,{})).not.toEqual(morphPositions(base,{...m,body_fat_percentage:35},{}));
});
