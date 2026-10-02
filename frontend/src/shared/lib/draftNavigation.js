const entries=new Map(),listeners=new Set();
export const subscribeDraftNavigation=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export const hasDraftChanges=()=>[...entries.values()].some(e=>e.dirty);
export function registerDraftNavigation(id,dirty,flush,prompt){entries.set(id,{dirty,flush,prompt});listeners.forEach(fn=>fn());return()=>{entries.delete(id);listeners.forEach(fn=>fn());};}
export const flushDraftChanges=()=>Promise.all([...entries.values()].filter(e=>e.dirty).map(e=>e.flush()));

export const navigationPrompt=()=>[...entries.values()].find(e=>e.dirty&&e.prompt)?.prompt||'진행 중인 운동 입력이 있습니다. 기기에 임시 저장한 뒤 다른 화면으로 이동할까요?';
