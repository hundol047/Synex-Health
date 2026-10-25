// Capture the actual local 3D renderer; no remote imagery or screenshot service.
// Start a LOCAL_ONLY Vite server first, then run this from frontend/.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir,stat,copyFile,mkdtemp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';

const frontend=fileURLToPath(new URL('../',import.meta.url));
const catalogue=JSON.parse(await readFile(resolve(frontend,'src/shared/lib/localCatalog.json'),'utf8'));
// The application module has a Vite JSON import. Inline that local catalogue
// for this Node-only helper so capture also works against a stable preview.
const guideSource=(await readFile(resolve(frontend,'src/health/components/exercise/motionGuide.js'),'utf8')).replace(/^import catalog from [^\n]+\n/,`const catalog=${JSON.stringify(catalogue)};\n`);
const guides=(await import(`data:text/javascript;base64,${Buffer.from(guideSource).toString('base64')}`)).MOTION_GUIDES;
const destination=resolve(frontend,'public/exercise-thumbnails');
const workingDestination=await mkdtemp(resolve(tmpdir(),'synex-exercise-thumbnails-'));
const requestedIds=process.env.SYNEX_THUMBNAIL_IDS?.split(',').map(id=>id.trim()).filter(Boolean);
if(requestedIds?.some(id=>!catalogue.some(exercise=>exercise.motion_id===id)))throw new Error('Unknown thumbnail motion ID');
const selected=requestedIds?.length?catalogue.filter(exercise=>requestedIds.includes(exercise.motion_id)):catalogue;
const origin=process.env.SYNEX_THUMBNAIL_ORIGIN||'http://127.0.0.1:5181';
const localPython=resolve(frontend,'../backend/.venv/bin/python');
const python=process.env.SYNEX_THUMBNAIL_PYTHON||(existsSync(localPython)?localPython:'python3');
const browser=await chromium.launch({executablePath:process.env.SYNEX_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1024,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>localStorage.setItem('synex-personal-onboarding-v1','done'));
await mkdir(destination,{recursive:true});
const manifest={description:'로컬 3D 운동 시범에서 캡처한 표준 체형 대표 자세',format:'webp',entries:[]};
if(requestedIds?.length&&existsSync(resolve(destination,'manifest.json')))manifest.entries=JSON.parse(await readFile(resolve(destination,'manifest.json'),'utf8')).entries;
try{
 await page.goto(`${origin}/health/library`);
 await page.getByRole('heading',{name:`운동 라이브러리 · ${catalogue.length}개`}).waitFor();
 let completed=0;
 for(const exercise of selected){
  const guide=guides[exercise.motion_id];
  const phase = guide.kind === 'hold' ? 0 : (guide.kind === 'alternating' || guide.kind === 'cyclic') ? .25 : .43;
  await page.getByLabel('운동·근육 검색').fill(exercise.name);
  await page.getByRole('button',{name:`${exercise.name} 동작 보기`,exact:true}).click();
  const stage=page.getByRole('region',{name:'선택한 운동 시범'}),canvas=stage.locator('canvas');
  await stage.getByLabel('동작 구간',{exact:true}).fill(String(Math.round(phase*100)));
  await page.waitForFunction(({id,phase})=>{
   const canvas=document.querySelector('.exercise-library-stage canvas');
   return canvas?.dataset.exerciseRendered===id&&Number(canvas.dataset.exerciseVertices)>10000&&Math.abs(Number(canvas.dataset.exerciseProgress)-phase)<.001&&canvas.height>350;
  },{id:exercise.motion_id,phase},{timeout:20000});
  // Place the entire canvas below both sticky headers. Element screenshots
  // capture composited pixels, including an overlapping HTML navigation bar.
  await page.evaluate(()=>{
   const bounds=document.querySelector('.exercise-library-stage canvas').getBoundingClientRect();
   window.scrollTo({top:window.scrollY+bounds.top-240,behavior:'instant'});
  });
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('.exercise-library-stage canvas').getBoundingClientRect();
   const heading=document.querySelector('.exercise-library-stage-heading').getBoundingClientRect();
   return canvas.top>heading.bottom+8&&canvas.top>75&&canvas.bottom<innerHeight-15;
  });
  // Demand rendering has completed, then wait two browser frames for shadows.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const pixels=await canvas.screenshot();
  const encoded=spawnSync(python,['-c',"import sys,io; from PIL import Image; image=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB'); image.save(sys.stdout.buffer,format='WEBP',quality=91,method=6)"],{input:pixels,maxBuffer:8*1024*1024});
  if(encoded.status!==0)throw new Error(`WebP encoding failed for ${exercise.motion_id}: ${encoded.stderr.toString()}`);
  const filename=`${exercise.motion_id}.webp`;
  await writeFile(resolve(workingDestination,filename),encoded.stdout);
  const box=await canvas.boundingBox();
  const entry={id:exercise.motion_id,name:exercise.name,file:filename,phase,view:guide.defaultView,width:Math.round(box.width),height:Math.round(box.height),bytes:(await stat(resolve(workingDestination,filename))).size,sha256:createHash('sha256').update(encoded.stdout).digest('hex')};
  const existing=manifest.entries.findIndex(previous=>previous.id===exercise.motion_id);
  if(existing>=0)manifest.entries[existing]=entry;else manifest.entries.push(entry);
  process.stdout.write(`${++completed}/${selected.length} ${exercise.motion_id}\n`);
 }
 if(errors.length)throw new Error(`Renderer errors: ${errors.join('; ')}`);
 await writeFile(resolve(workingDestination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 // Publish together after capture so public-file HMR cannot clear the next
 // selected exercise halfway through the render loop.
 for(const exercise of selected)await copyFile(resolve(workingDestination,`${exercise.motion_id}.webp`),resolve(destination,`${exercise.motion_id}.webp`));
 await copyFile(resolve(workingDestination,'manifest.json'),resolve(destination,'manifest.json'));
 process.stdout.write(JSON.stringify({images:manifest.entries.length,bytes:manifest.entries.reduce((total,entry)=>total+entry.bytes,0),errors})+'\n');
}finally{await browser.close();}
