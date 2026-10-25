import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env,VITE_LOCAL_ONLY:'true',VITE_RELEASE_BUILD:'false',VITE_API_BASE:'',VITE_POSE_MODEL_URL:'',SYNEX_APPLICATION_ID:process.env.SYNEX_APPLICATION_ID||'com.synex.health.personal'};
function run(command,args,cwd=root){const r=spawnSync(command,args,{cwd,env,stdio:'inherit',shell:process.platform==='win32'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run('node',['scripts/install-pose-model.mjs']);run('npm',['run','prebuild']);run('npx',['vite','build']);run('npx',['cap','sync','android']);
run(process.platform==='win32'?'gradlew.bat':'./gradlew',['assembleDebug','--no-daemon'],resolve(root,'android'));
console.log('Install: frontend/android/app/build/outputs/apk/debug/app-debug.apk');
