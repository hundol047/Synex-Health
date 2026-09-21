import {it,expect} from 'vitest';
import mesh from '../src/health/components/body3d/assets/human-mesh.json';
it('has distinct adult profiles with shared valid triangle topology',()=>{
 const count=mesh.profiles.male.length/3;
 expect(count).toBe(13380);expect(mesh.profiles.female.length).toBe(count*3);
 expect(mesh.profiles.male).not.toEqual(mesh.profiles.female);
 expect(mesh.indices.length%3).toBe(0);expect(Math.max(...mesh.indices)).toBeLessThan(count);
 for(const coords of Object.values(mesh.profiles))expect(coords.every(Number.isFinite)).toBe(true);
 expect(mesh.regions.length).toBe(count);expect(new Set(mesh.regions).size).toBe(6);
});
it('preserves anatomical left/right in the front view',()=>{
 mesh.regions.forEach((r,i)=>{
  if(r===2||r===4)expect(mesh.profiles.male[i*3]).toBeGreaterThanOrEqual(0);
  if(r===3||r===5)expect(mesh.profiles.male[i*3]).toBeLessThanOrEqual(0);
 });
});
