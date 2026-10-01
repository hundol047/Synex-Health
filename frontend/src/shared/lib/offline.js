// Only pending workout writes persist. Health response caches and auth tokens stay in memory.
// AES-GCM + non-exportable CryptoKey protect stored bytes, not a compromised same-origin script.
const cache = new Map();
const allowed = new Set(['/api/body-composition','/api/body-composition/latest','/api/body-map/latest','/api/exercise-routines','/api/workouts','/api/exercise-catalog']);
let active = null, epoch = 0, syncing = false, entries = [], storageError = '';
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
    const request = indexedDB.open('synex-workout-outbox-v1',1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keys');
      request.result.createObjectStore('records',{keyPath:'id'}).createIndex('account','account');
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
  const candidate = await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  return transaction(['keys'],'readwrite',(tx,done) => {
    const store = tx.objectStore('keys'), read = store.get(account);
    read.onsuccess = () => { const record = read.result || {key:candidate,id:crypto.randomUUID()}; if (!read.result) store.put(record,account); done(record); };
  });
}
async function readEntries(ctx) {
  const rows = await transaction(['records'],'readonly',(tx,done) => {
    const read = tx.objectStore('records').index('account').getAll(ctx.account); read.onsuccess = () => done(read.result);
  });
  return Promise.all(rows.map(async row => {
    const bytes = await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:encode(row.id)},ctx.key,row.data);
    return {...JSON.parse(new TextDecoder().decode(bytes)),id:row.id};
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
    } catch { if (version === epoch) { active={account,key:null,keyId:null}; storageError = '기기에 기록을 보관할 수 없습니다. 저장 공간과 브라우저 설정을 확인하세요.'; } }
    notify();
  });
}
export function cacheResponse(path,data) { if (allowed.has(path)) cache.set(path,structuredClone(data)); }
export function cachedResponse(path) { return allowed.has(path) && cache.has(path) ? structuredClone(cache.get(path)) : undefined; }
export function prepareWorkout(body) {
  const previous = (cachedResponse('/api/workouts') || []).find(w => identity(w) === identity(body));
  return {...body,expected_revision:body.expected_revision ?? previous?.revision ?? 0,mutation_id:body.mutation_id || crypto.randomUUID()};
}
export async function queueWorkout(body) {
  const ctx = active;
  if (!ctx?.key) throw Error(storageError || '로그인 후 기록 저장을 다시 시도하세요.');
  return serial(async () => {
    if (ctx !== active) throw Error('계정이 변경되었습니다.');
    const id = await entryId(ctx,body);
    const saved = (await readEntries(ctx)).find(e => e.id === id);
    if (saved && saved.body.mutation_id !== body.mutation_id) throw Error('이 운동의 미전송 기록이 있습니다. 먼저 전송하거나 기록 충돌을 해결하세요.');
    const entry = {id,body:structuredClone(body),queuedAt:new Date().toISOString(),error:''};
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
export const offlineState = () => ({pending:entries.length,syncing,sessionOnly:false,ready:!!active?.key,storageError,entries:structuredClone(entries)});
// Expiry locks local records until this server-verified account signs in again; it does not erase them.
export function lockOffline() { epoch++; active = null; cache.clear(); entries = []; storageError = ''; notify(); }
// Explicit logout/account deletion purges that account's key and ciphertext.
export function clearOffline() {
  const ctx = active; lockOffline();
  if(ctx)channel?.postMessage({action:'logout',account:ctx.account});
  return serial(async () => {
    if (!ctx) return;
    await transaction(['keys','records'],'readwrite',tx => {
      tx.objectStore('keys').delete(ctx.account);
      const cursor = tx.objectStore('records').index('account').openCursor(IDBKeyRange.only(ctx.account));
      cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
    });
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
    entry.body = {...entry.body,expected_revision:revision,mutation_id:crypto.randomUUID()}; entry.error = ''; delete entry.conflict;
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
        await send(entry.body);
        await removeEntry(ctx,entry);
      } catch (error) {
        failure = error;
        if (ctx !== active || start !== epoch) return;
        entry.error = error.message;
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
