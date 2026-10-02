export function validateRelease(e){
 const errors=[];
 if(e.VITE_RELEASE_BUILD!=='true')return errors;
 for(const k of ['VITE_API_BASE','VITE_PRIVACY_URL','VITE_SUPPORT_URL','VITE_TERMS_URL']){
  try{const u=new URL(e[k]);if(u.protocol!=='https:'||/localhost|127\.0\.0\.1|\.example$|\.test$|(^|\.)example\.(com|org|net)$/.test(u.hostname))throw Error();}catch{errors.push(`${k}: real HTTPS URL required`);}
 }
 if(e.VITE_RELEASE_TARGET!=='web'){
 if(!e.IOS_BUNDLE_ID||e.IOS_BUNDLE_ID==='com.synex.health'||!/^[a-zA-Z][\w]*(\.[\w]+){2,}$/.test(e.IOS_BUNDLE_ID))errors.push('IOS_BUNDLE_ID: registered explicit identifier required');
 if(e.VITE_APP_SCHEME!==e.IOS_BUNDLE_ID)errors.push('VITE_APP_SCHEME must match IOS_BUNDLE_ID');
 }
 for(const k of ['LEGAL_OPERATOR','SUPPORT_EMAIL','RETENTION_POLICY'])if(!e[k]||/placeholder|TODO/i.test(e[k]))errors.push(`${k} required`);
 if(!['free','plus'].includes(e.VITE_LAUNCH_MODE))errors.push('VITE_LAUNCH_MODE must be free or plus');
 if(e.VITE_PUSH_CONFIGURED==='true')errors.push('Remote push release blocked until token lifecycle and APNs/FCM dispatch are verified');
 if(e.VITE_RELEASE_TARGET==='web'&&e.VITE_LAUNCH_MODE==='plus')errors.push('Web release currently supports free launch only');
 if(e.VITE_RELEASE_TARGET!=='web'&&e.VITE_LAUNCH_MODE==='plus'&&(!e.VITE_REVENUECAT_IOS_KEY||e.IAP_SANDBOX_VERIFIED!=='true'))errors.push('Plus requires configured IAP and sandbox verification');
 return errors;
}
