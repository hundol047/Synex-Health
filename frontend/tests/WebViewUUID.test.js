import {it,expect,vi} from 'vitest';
import {secureUUID} from '../src/shared/lib/uuid.js';
it('creates secure IDs when WebView lacks randomUUID',()=>{
 const crypto=globalThis.crypto;
 vi.stubGlobal('crypto',{getRandomValues:crypto.getRandomValues.bind(crypto)});
 try{const ids=new Set(Array.from({length:50},secureUUID));expect(ids.size).toBe(50);for(const id of ids)expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);}
 finally{vi.unstubAllGlobals();}
});
