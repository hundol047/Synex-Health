import {describe,it,expect} from 'vitest';
import {buildContourTopology,createContourModel,writeContourSegments} from '../src/health/components/body3d/Mannequin.jsx';
import {mannequinBase} from '../src/health/components/body3d/mannequinMath.js';

const cube=Float32Array.from([-1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1,-1,-1,1,1,-1,1,1,1,1,-1,1,1]);
const faces=Uint32Array.from([4,5,6,4,6,7,1,0,3,1,3,2,1,2,6,1,6,5,0,4,7,0,7,3,3,7,6,3,6,2,0,1,5,0,5,4]);
describe('reference contours use the true surface without inflation',()=>{
 it('draws camera-dependent cube boundaries without internal triangle diagonals',()=>{
  const topology=buildContourTopology(faces),model=createContourModel(cube,faces,topology),target=new Float32Array(topology.length/4*6);
  for(const [viewer,axis,coordinate] of [[[0,0,5],2,1],[[0,0,-5],2,-1],[[5,0,0],0,1]]){
   const count=writeContourSegments(model,viewer,target);expect(count).toBe(4);
   for(let vertex=0;vertex<count*2;vertex++)expect(target[vertex*3+axis]).toBe(coordinate);
  }
  expect(writeContourSegments(model,[5,5,5],target)).toBe(6);
 });
 it('does not alter source vertices or invent endpoints when the view rotates',()=>{
  const before=cube.slice(),topology=buildContourTopology(faces),model=createContourModel(cube,faces,topology),target=new Float32Array(topology.length/4*6);
  const source=new Set(Array.from({length:cube.length/3},(_,i)=>Array.from(cube.subarray(i*3,i*3+3)).join(',')));
  for(const viewer of [[0,0,5],[5,1,3],[-5,-2,-4]]){
   const count=writeContourSegments(model,viewer,target);
   for(let vertex=0;vertex<count*2;vertex++)expect(source.has(Array.from(target.subarray(vertex*3,vertex*3+3)).join(','))).toBe(true);
  }
  expect(cube).toEqual(before);
 });
 it('identical reference and personal shapes have exactly identical contours',()=>{
  const topology=buildContourTopology(faces),own=createContourModel(cube,faces,topology),reference=createContourModel(cube.slice(),faces,topology),a=new Float32Array(topology.length/4*6),b=new Float32Array(a.length);
  for(const viewer of [[0,0,5],[3,2,-5],[-5,0,0]]){
   expect(writeContourSegments(own,viewer,a)).toBe(writeContourSegments(reference,viewer,b));expect(a).toEqual(b);
  }
 });
 it('omits head-detail contours without changing the underlying surface',()=>{
  const topology=buildContourTopology(faces),source=cube.slice(),headModel=createContourModel(source,faces,topology,new Uint8Array(8)),target=new Float32Array(topology.length/4*6);
  expect(writeContourSegments(headModel,[0,0,5],target)).toBe(0);expect(source).toEqual(cube);
  const bodyModel=createContourModel(source,faces,topology,new Uint8Array(8).fill(1));expect(writeContourSegments(bodyModel,[0,0,5],target)).toBe(4);
 });
 it('produces finite, bounded contours from the actual authored human mesh',()=>{
  const source=mannequinBase('male'),before=source.slice(),model=createContourModel(source),target=new Float32Array(model.topology.length/4*6);
  for(const viewer of [[0,.9,4],[0,.9,-4],[4,.9,0],[-4,.9,0]]){
   const count=writeContourSegments(model,viewer,target);expect(count).toBeGreaterThan(50);expect(count).toBeLessThan(5000);expect(target.subarray(0,count*6).every(Number.isFinite)).toBe(true);
  }
  expect(source).toEqual(before);
 });
});
