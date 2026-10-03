import {nativeOfflineKey,removeNativeOfflineKey,offlineEncryptionStatus} from './offlineKey.js';
// Only pending workout writes and unfinished workout drafts persist. Health response caches and auth tokens stay in memory.
// AES-GCM + non-exportable CryptoKey protect stored bytes, not a compromised same-origin script.
const cache = new Map();
const allowed = new Set(['/api/body-composition','/api/body-composition/latest','/api/body-map/latest','/api/exercise-routines','/api/workouts','/api/exercise-catalog']);
let active = null, epoch = 0, syncing = false, entries = [], storageError = '';
let draftCount=0;
let chain = Promise.resolve();
const notify = () => window.dispatchEvent(new Event('synex-offline-change'));
const serial = fn => { const result = chain.then(fn); chain = result.catch(() => {}); return result; };
const encode = value => new TextEncoder().encode(value);
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const entryId = async (ctx,body) => `${ctx.account}:${await hash(identity(body))}`;
const channel = typeof window !== 'undefined' && window.BroadcastChannel ? new window.BroadcastChannel('synex-account-lifecycle') : null;
if(channel)channel.onmessage=({data})=>{if(data?.action==='logout'&&data.account===active?.account)window.dispatchEvent(new Event('synex-session-expired'));};
const identity = b => JSON.stringify([b.routine_id,b.date,b.day_number,b.routine_exercise_id || b.exercise_name]);
function database() {
  return new Promise((resolve,reject) => {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle) return reject(Error('암호화 기록 저장을 지원하지 않는 환경입니다.'));
    const request = indexedDB.open('synex-workout-outbox-v1',3);
    request.onupgradeneeded = () => {
      if(!request.result.objectStoreNames.contains('keys'))request.result.createObjectStore('keys');
      for(const name of ['records','drafts','snapshots'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'}).createIndex('account','account');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction(stores,mode,action) {
  const db = await database();
  try { return await new Promise((resolve,reject) => {
    const tx = db.transaction(stores,mode); let value;
    tx.oncomplete = () => resolve(value); tx.onerror = tx.onabort = () => reject(tx.error || Error('기기 저장 실패'));
    action(tx, result => { value = result; });
  }); } finally { db.close(); }
}
async function keyFor(account) {
  const existing=await transaction(['keys'],'readonly',(tx,done)=>{const q=tx.objectStore('keys').get(account);q.onsuccess=()=>done(q.result);});
  const native=await nativeOfflineKey(account,existing);
  if(native){if(native.legacyKey)await migrateNativeRows(account,existing,native);else await transaction(['keys'],'readwrite',tx=>tx.objectStore('keys').put({id:native.id,native:true},account));return native;}
  const candidate = await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  return transaction(['keys'],'readwrite',(tx,done) => {
    const store = tx.objectStore('keys'), read = store.get(account);
    read.onsuccess = () => { const record = read.result || {key:candidate,id:crypto.randomUUID()}; if (!read.result) store.put(record,account); done(record); };
  });
}
// Re-encrypt legacy native records atomically, rejecting concurrent changes rather than losing them.
async function migrateNativeRows(account,existing,native){
 const names=['records','drafts','snapshots'];
 const rows=await transaction(names,'readonly',(tx,done)=>{const all={};let pending=names.length;for(const name of names){const q=tx.objectStore(name).index('account').getAll(account);q.onsuccess=()=>{all[name]=q.result;if(--pending===0)done(all);};}});
 const encrypted={};
 for(const name of names)encrypted[name]=await Promise.all(rows[name].map(async row=>{
  const aad=encode(row.id),bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:aad},native.legacyKey,row.data),iv=crypto.getRandomValues(new Uint8Array(12));
  return {...row,iv,data:await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},native.key,bytes)};
 }));
 await transaction(['keys',...names],'readwrite',tx=>{
  const key=tx.objectStore('keys').get(account);key.onsuccess=()=>{
   if(key.result?.id!==existing.id){tx.abort();return;}
   let pending=names.length;
   for(const name of names){const q=tx.objectStore(name).index('account').getAll(account);q.onsuccess=()=>{
    const old=new Map(rows[name].map(row=>[row.id,row]));
    if(q.result.length!==old.size||q.result.some(row=>{const prior=old.get(row.id);return !prior||new Uint8Array(row.data).some((v,i)=>v!==new Uint8Array(prior.data)[i])||row.data.byteLength!==prior.data.byteLength;})){tx.abort();return;}
    if(--pending===0){for(const store of names)for(const row of encrypted[store])tx.objectStore(store).put(row);tx.objectStore('keys').put({id:native.id,native:true},account);}
   };}
  };
 });
}
async function readEntries(ctx) {
  const rows = await transaction(['records'],'readonly',(tx,done) => {
    const read = tx.objectStore('records').index('account').getAll(ctx.account); read.onsuccess = () => done(read.result);
  });
  return Promise.all(rows.map(async row => {
    const bytes = await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:encode(row.id)},ctx.key,row.data);
    const entry=JSON.parse(new TextDecoder().decode(bytes));
    if(entry.checksum&&entry.checksum!==await hash(JSON.stringify(entry.body)))throw Error('기록 무결성 확인 실패');
    return {...entry,status:entry.status==='SYNCING'?'PENDING':entry.status||'PENDING',id:row.id};
  }));
}
async function writeEntry(ctx,entry) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode(entry.id)},ctx.key,encode(JSON.stringify({...entry,replacing:undefined})));
  if (active !== ctx) throw Error('계정이 변경되었습니다. 다시 로그인하세요.');
  await transaction(['keys','records'],'readwrite',tx => {
    const read=tx.objectStore('keys').get(ctx.account);
    read.onsuccess=()=>{
      if(active!==ctx||read.result?.id!==ctx.keyId){tx.abort();return;}
      const records=tx.objectStore('records'),prior=records.get(entry.id);
      prior.onsuccess=()=>{
        if(prior.result&&prior.result.mutation!==(entry.replacing||entry.body.mutation_id)){tx.abort();return;}
        records.put({id:entry.id,account:ctx.account,mutation:entry.body.mutation_id,iv,data});
      };
    };
  });
}
async function removeEntry(ctx,entry) {
  await transaction(['records'],'readwrite',tx => {
    const store = tx.objectStore('records'), read = store.get(entry.id);
    read.onsuccess = () => { if (read.result?.mutation === entry.body.mutation_id) store.delete(entry.id); };
  });
}
export async function bindOfflineAccount(userId,namespace='') {
  if (!userId) throw Error('기록을 저장할 로그인 계정이 필요합니다.');
  const account = await hash(`${namespace}|${userId}`);
  if (active?.account === account) return;
  lockOffline();
  const version = epoch;
  await serial(async () => {
    try {
      const stored=await keyFor(account);
      const ctx = {account,key:stored.key,keyId:stored.id};
      const restored = await readEntries(ctx);
      if (version !== epoch) return;
      active = ctx; entries = restored; storageError = '';
      await restoreSnapshots(ctx);
      draftCount=await transaction(['drafts'],'readonly',(tx,done)=>{const q=tx.objectStore('drafts').index('account').count(account);q.onsuccess=()=>done(q.result);});
    } catch { if (version === epoch) { active={account,key:null,keyId:null}; storageError = '기기에 기록을 보관할 수 없습니다. 저장 공간과 브라우저 설정을 확인하세요.'; } }
    notify();
  });
}
export function clearResponseCache() { cache.clear(); }
export async function cacheResponse(path,data) {
 if(!allowed.has(path))return;
 cache.set(path,structuredClone(data));const ctx=active;if(!ctx?.key)return;
 await serial(async()=>{
  const id=`${ctx.account}:cache:${path}`,iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=encode(JSON.stringify({path,data,saved_at:Date.now()}));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode(id)},ctx.key,bytes);
  if(active!==ctx)return;
  await transaction(['keys','snapshots'],'readwrite',tx=>{const q=tx.objectStore('keys').get(ctx.account);q.onsuccess=()=>{if(active!==ctx||q.result?.id!==ctx.keyId){tx.abort();return;}tx.objectStore('snapshots').put({id,account:ctx.account,iv,data:encrypted});};});
 }).catch(()=>{if(active===ctx){storageError='최근 데이터의 기기 저장에 실패했습니다.';notify();}});
}
async function restoreSnapshots(ctx){
 const rows=await transaction(['snapshots'],'readonly',(tx,done)=>{const q=tx.objectStore('snapshots').index('account').getAll(ctx.account);q.onsuccess=()=>done(q.result);});
 for(const row of rows){
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:encode(row.id)},ctx.key,row.data);
  const saved=JSON.parse(new TextDecoder().decode(bytes));
  if(active===ctx&&allowed.has(saved.path)&&Date.now()-saved.saved_at<7*86400000)cache.set(saved.path,saved.data);
 }
}
export function cachedResponse(path) { return allowed.has(path) && cache.has(path) ? structuredClone(cache.get(path)) : undefined; }
export function prepareWorkout(body) {
  const previous = (cachedResponse('/api/workouts') || []).find(w => identity(w) === identity(body));
  return {...body,time_zone:body.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',expected_revision:body.expected_revision ?? previous?.revision ?? 0,mutation_id:body.mutation_id || crypto.randomUUID()};
}
export async function queueWorkout(body) {
  const ctx = active;
  if (!ctx?.key) throw Error(storageError || '로그인 후 기록 저장을 다시 시도하세요.');
  return serial(async () => {
    if (ctx !== active) throw Error('계정이 변경되었습니다.');
    const id = await entryId(ctx,body);
    const saved = (await readEntries(ctx)).find(e => e.id === id);
    if (saved && saved.body.mutation_id !== body.mutation_id) throw Error('이 운동의 미전송 기록이 있습니다. 먼저 전송하거나 기록 충돌을 해결하세요.');
    const created_at=new Date().toISOString();
    const entry = {id,client_id:body.mutation_id,created_at,revision:body.expected_revision??0,checksum:await hash(JSON.stringify(body)),status:'PENDING',body:structuredClone(body),queuedAt:created_at,error:''};
    await writeEntry(ctx,entry);
    entries = await readEntries(ctx); notify();
    return {...body,id:`pending-${body.mutation_id}`,pending_sync:true};
  });
}
export async function acknowledgeWorkout(body) {
  const ctx = active; if (!ctx) return;
  await serial(async () => {
    await removeEntry(ctx,{id:await entryId(ctx,body),body});
    if (active === ctx) { entries = await readEntries(ctx); notify(); }
  });
}
export const offlineEpoch = () => epoch;
export const offlineState = () => ({pending:entries.length,drafts:draftCount,syncing,sessionOnly:false,encryption:offlineEncryptionStatus(),ready:!!active?.key,storageError,entries:structuredClone(entries)});
// Expiry locks local records until this server-verified account signs in again; it does not erase them.
export function lockOffline() { epoch++; active = null; cache.clear(); entries = []; draftCount=0; storageError = ''; notify(); }
// Explicit logout/account deletion purges that account's key and ciphertext.
export function clearOffline() {
  const ctx = active; lockOffline();
  if(ctx)channel?.postMessage({action:'logout',account:ctx.account});
  return serial(async () => {
    if (!ctx) return;
    await transaction(['keys','records','drafts','snapshots'],'readwrite',tx => {
      const snapshots=tx.objectStore('snapshots').index('account').openCursor(IDBKeyRange.only(ctx.account));
      snapshots.onsuccess=()=>{if(snapshots.result){snapshots.result.delete();snapshots.result.continue();}};
      const drafts=tx.objectStore('drafts').index('account').openCursor(IDBKeyRange.only(ctx.account));
      drafts.onsuccess=()=>{if(drafts.result){drafts.result.delete();drafts.result.continue();}};
      tx.objectStore('keys').delete(ctx.account);
      const cursor = tx.objectStore('records').index('account').openCursor(IDBKeyRange.only(ctx.account));
      cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
    });
    await removeNativeOfflineKey(ctx.account);
  });
}
export async function discardPending(id) {
  const ctx = active; if (!ctx) return;
  await serial(async () => {
    const entry = (await readEntries(ctx)).find(e => e.id === id);
    if (entry) await removeEntry(ctx,entry);
    if (ctx === active) { entries = await readEntries(ctx); notify(); }
  });
}
export async function resolvePending(id,revision) {
  const ctx = active; if (!ctx || !Number.isInteger(revision)) return;
  await serial(async () => {
    const entry = (await readEntries(ctx)).find(e => e.id === id);
    if (!entry) return;
    entry.replacing=entry.body.mutation_id;
    entry.body = {...entry.body,expected_revision:revision,mutation_id:crypto.randomUUID()}; entry.error = ''; entry.status='PENDING';entry.client_id=entry.body.mutation_id;entry.revision=revision;entry.checksum=await hash(JSON.stringify(entry.body));delete entry.conflict;
    await writeEntry(ctx,entry); entries = await readEntries(ctx); notify();
  });
}
export async function syncWorkouts(send) {
  if (syncing || !active?.key) return;
  syncing = true; const ctx = active, start = epoch; notify(); let failure;
  try {
    for (const entry of await readEntries(ctx)) {
      if (ctx !== active || start !== epoch) return;
      if (entry.conflict) { failure = Error('다른 기기의 기록과 충돌합니다. 저장할 기록을 선택하세요.'); continue; }
      try {
        entry.status='SYNCING';await serial(()=>writeEntry(ctx,entry));
        if(active!==ctx)return;entries=await readEntries(ctx);entries=entries.map(e=>e.id===entry.id?{...e,status:'SYNCING'}:e);notify();
        await send(entry.body);
        entry.status='SYNCED';
        await removeEntry(ctx,entry);
      } catch (error) {
        failure = error;
        if (ctx !== active || start !== epoch) return;
        entry.error = error.message;entry.status=error.status===409?'CONFLICT':'FAILED';
        if (error.status === 409) entry.conflict = error.data?.detail?.current;
        await serial(() => writeEntry(ctx,entry));
        if (!error.status || error.status === 401) break;
      }
    }
  } finally {
    syncing = false;
    if (ctx === active) entries = await readEntries(ctx);
    notify();
  }
  if (failure) throw failure;
}
if (typeof window !== 'undefined') window.addEventListener('synex-session-expired',lockOffline);


// Drafts are encrypted, account-bound, never sent as completed workouts.
export async function loadDraft(scope) {
 const ctx=active;if(!ctx?.key)return null;
 return serial(async()=>{
  if(active!==ctx)throw Error('계정이 변경되었습니다.');
  const id=`${ctx.account}:draft:${await hash(scope)}`;
  const row=await transaction(['drafts'],'readonly',(tx,done)=>{const q=tx.objectStore('drafts').get(id);q.onsuccess=()=>done(q.result);});
  if(!row)return null;
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:encode(id)},ctx.key,row.data);
  if(active!==ctx)throw Error('계정이 변경되었습니다.');
  return {token:row.token,value:JSON.parse(new TextDecoder().decode(bytes))};
 });
}
export async function saveDraft(scope,value,expectedToken=null) {
 const ctx=active;if(!ctx?.key)throw Error('로그인·저장 공간을 확인하세요. 임시 저장되지 않았습니다.');
 return serial(async()=>{
  const id=`${ctx.account}:draft:${await hash(scope)}`,token=crypto.randomUUID(),iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode(id)},ctx.key,encode(JSON.stringify({...value,_draftScope:scope})));
  let conflict=false;
  try{await transaction(['keys','drafts'],'readwrite',tx=>{
   const key=tx.objectStore('keys').get(ctx.account);key.onsuccess=()=>{
    if(active!==ctx||key.result?.id!==ctx.keyId){tx.abort();return;}
    const store=tx.objectStore('drafts'),q=store.get(id);q.onsuccess=()=>{
     if((q.result?.token??null)!==expectedToken){conflict=true;tx.abort();return;}
     store.put({id,account:ctx.account,token,iv,data});
    };
   };
  });}catch(e){if(conflict)throw Error('다른 탭에서 임시 기록이 바뀌었습니다. 다시 열어 확인하세요.');throw e;}
  if(active===ctx){draftCount=await transaction(['drafts'],'readonly',(tx,done)=>{const q=tx.objectStore('drafts').index('account').count(ctx.account);q.onsuccess=()=>done(q.result);});notify();}
  return token;
 });
}
export async function removeDraft(scope,expectedToken) {
 const ctx=active;if(!ctx?.key)return;
 return serial(async()=>{
  const id=`${ctx.account}:draft:${await hash(scope)}`;
  await transaction(['drafts'],'readwrite',tx=>{const store=tx.objectStore('drafts'),q=store.get(id);q.onsuccess=()=>{if(active===ctx&&q.result?.token===expectedToken)store.delete(id);};});
  if(active===ctx){draftCount=await transaction(['drafts'],'readonly',(tx,done)=>{const q=tx.objectStore('drafts').index('account').count(ctx.account);q.onsuccess=()=>done(q.result);});notify();}
 });
}
export async function clearWorkoutDrafts(){
 const ctx=active;if(!ctx?.key)return;
 await serial(async()=>{await transaction(['drafts'],'readwrite',tx=>{
  if(active!==ctx){tx.abort();return;}const cursor=tx.objectStore('drafts').index('account').openCursor(IDBKeyRange.only(ctx.account));
  cursor.onsuccess=()=>{if(cursor.result){cursor.result.delete();cursor.result.continue();}};
 });if(active===ctx){draftCount=0;notify();}});
}

export async function listWorkoutDrafts(scopes=[]){
 const ctx=active;if(!ctx?.key)return [];
 return serial(async()=>{
  if(active!==ctx)throw Error('계정이 변경되었습니다.');
  const names=new Map(await Promise.all(scopes.map(async scope=>[`${ctx.account}:draft:${await hash(scope)}`,scope])));
  const rows=await transaction(['drafts'],'readonly',(tx,done)=>{const q=tx.objectStore('drafts').index('account').getAll(ctx.account);q.onsuccess=()=>done(q.result);});
  const result=await Promise.all(rows.map(async row=>{
   const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:encode(row.id)},ctx.key,row.data);
   const value=JSON.parse(new TextDecoder().decode(bytes));
   return {id:row.id,token:row.token,scope:value._draftScope||names.get(row.id),value};
  }));
  if(active!==ctx)throw Error('계정이 변경되었습니다.');
  return result;
 });
}
