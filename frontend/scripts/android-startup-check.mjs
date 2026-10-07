import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/android-native';mkdirSync(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'}).trim();
adb('install','-r','android/app/build/outputs/apk/debug/app-debug.apk');
adb('shell','am','start','-n','com.synex.health.personal/com.synex.health.MainActivity');
let socket;
for(let i=0;i<30;i++){socket=adb('shell','cat','/proc/net/unix').split('\n').find(l=>l.includes('webview_devtools_remote'))?.split('@')[1];if(socket)break;await new Promise(r=>setTimeout(r,1000));}
if(!socket)throw Error('Android WebView debug socket was not created');
adb('forward','tcp:9222',`localabstract:${socket}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
const page=browser.contexts()[0].pages()[0];
const events=[];page.on('console',m=>events.push(m.text()));page.on('pageerror',e=>events.push(e.message));
await page.addInitScript(()=>{
 window.__storageProbe=[];
 const record=s=>window.__storageProbe.push(s);
 const wrap=(object,key,label)=>{const original=object[key].bind(object);object[key]=(...args)=>{record(`${label} start ${args[0]||''}`);const result=original(...args);if(result?.then)result.then(()=>record(`${label} resolved`),e=>record(`${label} rejected ${e.message}`));return result;};};
 if(window.Capacitor?.nativePromise)wrap(window.Capacitor,'nativePromise','native');
 for(const key of ['digest','generateKey','importKey','encrypt','decrypt'])wrap(crypto.subtle,key,`crypto.${key}`);
 const original=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{record('indexedDB.open start');const req=original(...args);for(const event of ['success','error','blocked','upgradeneeded'])req.addEventListener(event,()=>record(`indexedDB.open ${event}`));return req;};
});
await page.evaluate(()=>localStorage.removeItem('synex-personal-onboarding-v1'));
await page.reload();
for(let i=0;i<6;i++)await page.getByRole('button',{name:'다음',exact:true}).click();
await page.getByRole('button',{name:'시작하기',exact:true}).click();
try{
 await page.getByText('내 기록은 이 기기에',{exact:true}).waitFor({timeout:45000});
 await page.reload();
 await page.getByText('내 기록은 이 기기에',{exact:true}).waitFor({timeout:20000});
 console.log('ANDROID_NATIVE_STARTUP_OK: onboarding, native encrypted key creation, restart');
}finally{
 const state=await page.evaluate(()=>({body:document.body.innerText,probe:window.__storageProbe,platform:window.Capacitor?.getPlatform?.()}));
 writeFileSync(`${out}/startup.json`,JSON.stringify({state,events},null,2));console.log(JSON.stringify(state));
 await page.screenshot({path:`${out}/startup.png`});
 writeFileSync(`${out}/logcat.txt`,adb('logcat','-d','-t','500'));
 await browser.close();
}
