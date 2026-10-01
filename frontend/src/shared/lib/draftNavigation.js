const entries=new Map(),listeners=new Set();
export const subscribeDraftNavigation=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export const hasDraftChanges=()=>[...entries.values()].some(e=>e.dirty);
export function registerDraftNavigation(id,dirty,flush){entries.set(id,{dirty,flush});listeners.forEach(fn=>fn());return()=>{entries.delete(id);listeners.forEach(fn=>fn());};}
export const flushDraftChanges=()=>Promise.all([...entries.values()].filter(e=>e.dirty).map(e=>e.flush()));
