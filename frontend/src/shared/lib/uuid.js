// Secure UUID fallback for WebViews that have Web Crypto but no randomUUID().
export function secureUUID(){
 if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
 if(!globalThis.crypto?.getRandomValues)throw Error('이 기기에서 안전한 기록 ID를 만들 수 없습니다. WebView를 업데이트하거나 HTTPS 연결을 확인해 주세요.');
 const b=globalThis.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
