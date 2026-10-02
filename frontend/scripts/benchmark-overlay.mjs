import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {overlayPositions} from '../src/health/components/body3d/overlayMath.js';
const mesh=JSON.parse(readFileSync(new URL('../src/health/components/body3d/assets/human-mesh.json',import.meta.url)));
const base=Float32Array.from(mesh.profiles.female,v=>v*mesh.scale);
const fixture={LEFT_ARM:2,RIGHT_ARM:2.2,TRUNK:20,LEFT_LEG:6.4,RIGHT_LEG:7.1};
const samples=[];
for(let i=0;i<110;i++){const start=performance.now();overlayPositions(base,mesh.regions,fixture,165);overlayPositions(base,mesh.regions,{...fixture,RIGHT_LEG:7.8},165);if(i>=10)samples.push(performance.now()-start);}
samples.sort((a,b)=>a-b);
console.log(JSON.stringify({scope:'Node CPU two-layer deformation only; not GPU/FPS or device evidence',vertices_per_layer:base.length/3,position_buffer_bytes_two_layers:base.byteLength*2,median_ms:Number(samples[50].toFixed(2)),p95_ms:Number(samples[95].toFixed(2)),samples:samples.length},null,2));
