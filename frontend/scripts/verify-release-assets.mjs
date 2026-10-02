import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const marker=JSON.parse(await readFile('dist/release-config.json','utf8'));
if(!marker.release)throw Error('Release build marker missing');
const model=await readFile('dist/pose/pose_landmarker_lite.task');
if(createHash('sha256').update(model).digest('hex')!=='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a')throw Error('Pose model missing or corrupt');
if(!(await readdir('dist/pose/wasm')).some(name=>name.endsWith('.wasm')))throw Error('Pose WASM missing');
for(const file of ['privacypolicy','terms']){
 const html=await readFile(`dist/${file}.html`,'utf8');
 if(/\{\{|운영자 설정 필요|출시 전 확정/.test(html))throw Error('Legal page configuration missing');
}
console.log('Verified release marker, pose model/WASM and legal pages.');
