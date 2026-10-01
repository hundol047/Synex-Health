// Session-only health cache: no health data or credentials written to browser persistent storage.
const cache=new Map(),queue=new Map();let syncing=false,epoch=0;
const allowed=new Set(['/api/body-composition','/api/body-composition/latest','/api/body-map/latest','/api/exercise-routines','/api/workouts','/api/exercise-catalog']);
export function cacheResponse(path,data){if(allowed.has(path))cache.set(path,structuredClone(data));}
export function cachedResponse(path){if(!allowed.has(path)||!cache.has(path))return undefined;return structuredClone(cache.get(path));}
export function queueWorkout(body){const key=[body.routine_id,body.date,body.day_number,body.routine_exercise_id||body.exercise_name].join('|');queue.set(key,structuredClone(body));window.dispatchEvent(new Event('synex-offline-change'));return {...body,id:`pending-${key}`,pending_sync:true};}
export const offlineEpoch=()=>epoch;
export const offlineState=()=>({pending:queue.size,syncing,sessionOnly:true});
export function clearOffline(){epoch++;cache.clear();queue.clear();window.dispatchEvent(new Event('synex-offline-change'));}
export async function syncWorkouts(send){if(syncing)return;syncing=true;const start=epoch;try{for(const [key,body] of queue){await send(body);if(start!==epoch)return;if(queue.get(key)===body)queue.delete(key);}}finally{syncing=false;window.dispatchEvent(new Event('synex-offline-change'));}}
if(typeof window!=='undefined')window.addEventListener('synex-session-expired',clearOffline);
