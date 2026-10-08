import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import catalog from '../src/shared/lib/localCatalog.json';

describe('bundled exercise studio previews',()=>{
 it('packages one intact local 3D capture for every catalogue motion',()=>{
  const manifest=JSON.parse(readFileSync('public/exercise-thumbnails/manifest.json','utf8'));
  expect(manifest.entries).toHaveLength(74);
  expect(manifest.entries.map(entry=>entry.id).sort()).toEqual(catalog.map(exercise=>exercise.motion_id).sort());
  for(const entry of manifest.entries){
   const bytes=readFileSync(`public/exercise-thumbnails/${entry.file}`);
   expect(bytes.subarray(0,4).toString()).toBe('RIFF');
   expect(bytes.subarray(8,12).toString()).toBe('WEBP');
   expect(bytes.length).toBe(entry.bytes);
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
   expect(entry.width).toBeGreaterThan(350);
   expect(entry.height).toBeGreaterThan(350);
  }
 });
});
