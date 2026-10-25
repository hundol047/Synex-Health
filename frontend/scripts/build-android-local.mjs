import {validateRelease} from './release-config.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const release=process.argv.includes('--release');
const env={...process.env,VITE_LOCAL_ONLY:'true',VITE_RELEASE_BUILD:release?'true':'false',VITE_LAUNCH_MODE:'free',VITE_API_BASE:'',VITE_POSE_MODEL_URL:'',SYNEX_APPLICATION_ID:process.env.SYNEX_APPLICATION_ID||'com.synex.health.personal'};
if(release){const errors=validateRelease(env);if(!process.env.SYNEX_APPLICATION_ID)errors.push('Explicit existing distribution SYNEX_APPLICATION_ID required');for(const name of ['SYNEX_KEYSTORE_PATH','SYNEX_KEYSTORE_PASSWORD','SYNEX_KEY_ALIAS','SYNEX_KEY_PASSWORD'])if(!env[name])errors.push(`${name} required`);if(errors.length)throw Error(errors.join('\n'));}
function run(command,args,cwd=root){const r=spawnSync(command,args,{cwd,env,stdio:'inherit',shell:process.platform==='win32'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run('node',['scripts/install-pose-model.mjs']);run('npm',['run','prebuild']);run('npx',['vite','build']);run('npx',['cap','sync','android']);
run(process.platform==='win32'?'gradlew.bat':'./gradlew',[release?'bundleRelease':'assembleDebug','--no-daemon'],resolve(root,'android'));
console.log(release?'Bundle: frontend/android/app/build/outputs/bundle/release/app-release.aab':'Install: frontend/android/app/build/outputs/apk/debug/app-debug.apk');
