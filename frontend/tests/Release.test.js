import {it,expect} from 'vitest';
import {validateRelease} from '../scripts/release-config.mjs';
import {personalizedVertices,sportswear} from '../src/health/components/body3d/avatar.js';
import {MovementCoach,POSE_EXERCISES} from '../src/health/components/exercise/poseCoach.js';
import data from '../src/health/components/body3d/assets/human-mesh.json';
it('rejects unconfigured release and allows ordinary development',()=>{expect(validateRelease({VITE_RELEASE_BUILD:'true'}).length).toBeGreaterThan(5);expect(validateRelease({})).toEqual([]);});
it('creates distinct finite user meshes and a complete non-overlapping clothing face partition',()=>{
 const meshes=['male','female','unspecified'].map(gender=>personalizedVertices({height:178,weight:70},{gender}));expect(meshes[0]).not.toEqual(meshes[1]);expect(meshes[2]).not.toEqual(meshes[1]);
 for(const base of meshes){const wear=sportswear(base);expect(wear.positions.every(Number.isFinite)).toBe(true);expect(Object.values(wear.indices).reduce((n,indices)=>n+indices.length,0)).toBe(data.indices.length);for(const indices of Object.values(wear.indices))expect(indices.length).toBeGreaterThan(0);}
 const invalid=personalizedVertices({height:Infinity,weight:NaN,segments:[{segment:'LEFT_ARM',lean_mass_kg:NaN,fat_mass_kg:Infinity}]},{});expect(invalid.every(Number.isFinite)).toBe(true);
});
it('all eight coaches reject lost tracking and use independent supported configurations',()=>{
 expect(Object.keys(POSE_EXERCISES)).toHaveLength(8);
 for(const [id,c] of Object.entries(POSE_EXERCISES)){
 const coach=new MovementCoach(id);expect(coach.update([],1000).phase).toBe('unknown');
 const pose=bent=>{const p=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:1}));for(let side=0;side<2;side++){const [a,b,d]=c.joints.slice(side*3,side*3+3);p[a]={x:side,y:c.overhead?1:0,z:0,visibility:1};p[b]={x:side,y:.5,z:0,visibility:1};p[d]={x:side+(bent?.5:0),y:bent?.5:c.overhead?0:1,z:0,visibility:1};}return p;};
 coach.update(pose(false),1000);coach.update(pose(true),1600);const out=coach.update(pose(false),2200);
 if(!c.hold&&c.down>90)expect(out.reps).toBe(1);
 expect(coach.update([],2500).phase).toBe('unknown');
 }
});
