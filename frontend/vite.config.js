import {defineConfig,loadEnv} from 'vite';
import {validateRelease} from './scripts/release-config.mjs';
export default defineConfig(({mode})=>{
 const e={...loadEnv(mode,process.cwd(),''),...process.env};const errors=validateRelease(e);if(errors.length)throw Error(errors.join('\n'));
 return {server:{port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:8000',changeOrigin:true}}},build:{outDir:'dist'},plugins:[{
  name:'personal-network-boundary',
  transformIndexHtml(){if(e.VITE_LOCAL_ONLY==='true')return [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:"connect-src 'self'"},injectTo:'head-prepend'}];},
 },{name:'release-marker',generateBundle(){this.emitFile({type:'asset',fileName:'release-config.json',source:JSON.stringify({localOnly:e.VITE_LOCAL_ONLY==='true',release:e.VITE_RELEASE_BUILD==='true',api:e.VITE_API_BASE||'',mode:e.VITE_LAUNCH_MODE||'development',bundle:e.IOS_BUNDLE_ID||null})});}}]};
});
