import {cp,mkdir,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('public/pose/wasm/',root),{recursive:true});
await cp(new URL('node_modules/@mediapipe/tasks-vision/wasm/',root),new URL('public/pose/wasm/',root),{recursive:true});
// Model installation is explicit; a missing asset produces an unavailable state before camera use.
