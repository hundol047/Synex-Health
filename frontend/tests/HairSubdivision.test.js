import {it,expect} from 'vitest';
import {subdivideHair,hairBoundaryVertices} from '../src/health/components/character/hairSubdivision.js';
// Two triangles share physical vertices but have separate UV islands.
const data={vertices:[0,1,2,0,2,3],uv:[0,0,1,0,1,1,.1,.1,.8,.9,0,1],indices:[0,1,2,3,4,5]};
const points=[[0,0,0],[1,0,.1],[1,1,.2],[0,1,.1]];
it('feathers only the physical hairline, without opening the shared UV seam',()=>{
 const refined=subdivideHair(data,points),boundary=hairBoundaryVertices(refined);
 expect(boundary.size).toBe(8);
 const interior=refined.points.findIndex(p=>Math.abs(p[0]-.5)<1e-6&&Math.abs(p[1]-.5)<1e-6);
 expect(interior).toBeGreaterThan(-1);expect(boundary.has(interior)).toBe(false);
 expect(boundary.has(refined.vertices[0])).toBe(true);
 expect(boundary.has(refined.vertices[3])).toBe(true);
});
it('smooths a connected silhouette without splitting the positions at a UV seam',()=>{
 const original=structuredClone(points),out=subdivideHair(data,points);
 expect(points).toEqual(original);
 expect(out.indices.length).toBe(24);expect(out.uv.length).toBe(out.vertices.length*2);
 expect(out.points[out.vertices[0]]).toEqual(out.points[out.vertices[3]]);
 expect(out.points[out.vertices[2]]).toEqual(out.points[out.vertices[4]]);
 expect(out.uv.slice(0,2)).not.toEqual(out.uv.slice(6,8));
 expect(out.points[0][0]).toBeGreaterThan(0);expect(out.points[0][1]).toBeGreaterThan(0);
 for(const p of out.points)for(let k=0;k<3;k++){
  expect(Number.isFinite(p[k])).toBe(true);
  expect(p[k]).toBeGreaterThanOrEqual(Math.min(...points.map(v=>v[k])));
  expect(p[k]).toBeLessThanOrEqual(Math.max(...points.map(v=>v[k])));
 }
});
it('reuses topology without retaining another fitted head position',()=>{
 const first=subdivideHair(data,points),shifted=subdivideHair(data,points.map(p=>p.map(v=>v+2)));
 for(let i=0;i<first.points.length;i++)for(let k=0;k<3;k++)expect(shifted.points[i][k]-first.points[i][k]).toBeCloseTo(2);
});
