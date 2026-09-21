import {spawnSync} from 'node:child_process';
import {loadEnv} from 'vite';
const env={...loadEnv('production',process.cwd(),''),...process.env};
const api=env.VITE_API_BASE;
if(!api || !/^https:\/\//.test(api) || /localhost|127\.0\.0\.1/.test(api)){
 console.error('Set VITE_API_BASE to the deployed HTTPS API origin in .env.production.local before building native apps. Device localhost is not your server.');process.exit(1);
}
for(const [command,args] of [['npm',['run','build']],['npx',['cap','sync']]]){
 const result=spawnSync(command,args,{stdio:'inherit',env,shell:process.platform==='win32'});
 if(result.status!==0)process.exit(result.status||1);
}
