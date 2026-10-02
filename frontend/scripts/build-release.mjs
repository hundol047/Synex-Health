import {spawnSync} from 'node:child_process';
const r=spawnSync('npm',['run','build'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,VITE_RELEASE_BUILD:'true'}});process.exit(r.status??1);
