import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/android-native';mkdirSync(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'}).trim();
adb('install','-r','android/app/build/outputs/apk/debug/app-debug.apk');
adb('shell','am','start','-n','com.synex.health.personal/com.synex.health.MainActivity');
let socket;
for(let i=0;i<30;i++){socket=adb('shell','cat','/proc/net/unix').split('\n').find(l=>l.includes('webview_devtools_remote'))?.split('@')[1];if(socket)break;await new Promise(r=>setTimeout(r,1000));}
if(!socket)throw Error('Android WebView debug socket was not created');
adb('forward','tcp:9222',`localabstract:${socket}`);
const targets=await (await fetch('http://127.0.0.1:9222/json')).json();
const target=targets.find(t=>t.type==='page');
if(!target)throw Error('Android WebView page target not found');
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),events=[];let nextId=0;
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const task=pending.get(m.id);if(task){pending.delete(m.id);clearTimeout(task.timer);m.error?task.reject(Error(JSON.stringify(m.error))):task.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled')events.push(m);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
await command('Runtime.enable');await command('Page.enable');
const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const waitFor=async(expression,ms=20000)=>{const start=Date.now();while(Date.now()-start<ms){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,250));}throw Error(`Android screen did not become ready: ${expression}`);};
const page={
 addInitScript:fn=>command('Page.addScriptToEvaluateOnNewDocument',{source:`(${fn.toString()})();`}),
 evaluate:fn=>evaluate(`(${fn.toString()})();`),
 reload:async()=>{const token=JSON.stringify(String(Date.now())+Math.random());await evaluate(`window.__nativeReloadToken=${token}`);await command('Page.reload');await waitFor(`window.__nativeReloadToken!==${token} && document.readyState==='complete'`);},
 getByRole:(_,options)=>({click:async()=>{const name=JSON.stringify(options.name);await waitFor(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${name})`);await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${name}).click()`);}}),
 getByText:text=>({waitFor:({timeout})=>waitFor(`document.body?.innerText.includes(${JSON.stringify(text)})`,timeout)}),
 screenshot:async({path})=>{const r=await command('Page.captureScreenshot');writeFileSync(path,Buffer.from(r.data,'base64'));}
};
await page.addInitScript(()=>{
 window.__storageProbe=[];
 const record=s=>window.__storageProbe.push(s);
 const wrap=(object,key,label)=>{const original=object[key].bind(object);object[key]=(...args)=>{record(`${label} start ${args.slice(0,2).join(' ')}`);const result=original(...args);if(result?.then)result.then(()=>record(`${label} resolved`),e=>record(`${label} rejected ${e.message}`));return result;};};
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
 const created=await page.evaluate(()=>window.__storageProbe);
 if(!created.some(s=>s.includes('native start SecureStorage internalSetItem')))throw Error('Native encrypted key creation was not observed');
 await page.reload();
 await page.getByText('내 기록은 이 기기에',{exact:true}).waitFor({timeout:20000});
 const restored=await page.evaluate(()=>window.__storageProbe);
 if(!restored.some(s=>s.includes('native start SecureStorage internalGetItem')) || restored.some(s=>s.includes('native start SecureStorage internalSetItem')))throw Error('Native key must be restored without replacement');
 console.log('ANDROID_NATIVE_STARTUP_OK: onboarding, native encrypted key creation, restart');
}finally{
 const state=await page.evaluate(()=>({body:document.body.innerText,probe:window.__storageProbe,platform:window.Capacitor?.getPlatform?.()}));
 writeFileSync(`${out}/startup.json`,JSON.stringify({state,events},null,2));console.log(JSON.stringify(state));
 await page.screenshot({path:`${out}/startup.png`});
 writeFileSync(`${out}/logcat.txt`,adb('logcat','-d','-t','500'));
 ws.close();
}
