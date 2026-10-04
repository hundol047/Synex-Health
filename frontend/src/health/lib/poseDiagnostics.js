let last=null;
export const recordPoseDiagnostics=value=>{last={...value,updatedAt:new Date().toISOString()};};
export const poseDiagnostics=()=>last;
