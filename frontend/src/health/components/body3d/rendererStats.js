let latest=null;
export const recordRenderer=value=>{latest={...value,updatedAt:new Date().toISOString()};};
export const rendererStats=()=>latest;
