// Credentials live only in memory. IdPs that issue refresh tokens can renew within this session.
let accessToken='',refreshToken='',tokenEndpoint='',clientId='',refreshing,generation=0;
export const getAccessToken=()=>accessToken;
export function setAccessToken(value){accessToken=value;if(!value){generation++;refreshToken='';tokenEndpoint='';clientId='';}}
export function configureRefresh(tokens,endpoint,client){refreshToken=tokens.refresh_token||'';tokenEndpoint=endpoint;clientId=client;}
export async function refreshAccessToken(){
 if(!refreshToken||!tokenEndpoint.startsWith('https://'))return false;
 if(refreshing)return refreshing;
 const version=generation;
 refreshing=(async()=>{try{const r=await fetch(tokenEndpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken,client_id:clientId})});const t=await r.json();if(version!==generation||!r.ok||!t.access_token)return false;accessToken=t.access_token;refreshToken=t.refresh_token||refreshToken;return true;}catch{return false;}finally{refreshing=null;}})();
 return refreshing;
}
