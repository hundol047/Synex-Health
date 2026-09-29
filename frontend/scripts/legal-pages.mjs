import fs from 'node:fs';import {loadEnv} from 'vite';
const e={...loadEnv('production',process.cwd(),''),...process.env};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const name of ['privacypolicy','terms']){let s=fs.readFileSync(`legal/${name}.html`,'utf8');for(const key of ['LEGAL_OPERATOR','SUPPORT_EMAIL','RETENTION_POLICY'])s=s.replaceAll(`{{${key}}}`,esc(e[key]||'운영자 설정 필요 · 출시 전 확정'));fs.writeFileSync(`public/${name}.html`,s);}
