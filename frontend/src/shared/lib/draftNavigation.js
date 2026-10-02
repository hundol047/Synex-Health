const entries=new Map(),listeners=new Set();
export const subscribeDraftNavigation=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export const hasDraftChanges=()=>[...entries.values()].some(e=>e.dirty);
export const hasDraftChangesForPath=path=>[...entries.values()].some(e=>e.dirty&&(!e.path||e.path===path));
export function registerDraftNavigation(id,dirty,flush,prompt,path){entries.set(id,{dirty,flush,prompt,path});listeners.forEach(fn=>fn());return()=>{entries.delete(id);listeners.forEach(fn=>fn());};}
export const flushDraftChanges=path=>Promise.all([...entries.values()].filter(e=>e.dirty&&(!path||!e.path||e.path===path)).map(e=>e.flush()));

export const navigationPrompt=path=>[...entries.values()].find(e=>e.dirty&&e.prompt&&(!path||!e.path||e.path===path))?.prompt||'진행 중인 운동 입력이 있습니다. 기기에 임시 저장한 뒤 다른 화면으로 이동할까요?';
