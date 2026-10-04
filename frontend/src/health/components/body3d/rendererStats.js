let latest=null;const modes={};
export const recordRenderer=value=>{latest={...value,updatedAt:new Date().toISOString()};modes[(value.performanceMode||'unknown')+' / '+value.quality]=latest;};
export const rendererStats=()=>latest;
export const rendererModeStats=()=>({...modes});
