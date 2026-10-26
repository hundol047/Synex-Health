import {it,expect,afterEach} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {verifyPersonalEvidence,DEVICE_SCENARIOS} from '../scripts/personal-release-evidence.mjs';
const roots=[];
afterEach(()=>{for(const root of roots.splice(0))fs.rmSync(root,{recursive:true,force:true});});
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'synex-evidence-test-'));roots.push(root);
 const file=(name,text)=>{fs.writeFileSync(path.join(root,name),text);return {file:name,sha256:crypto.createHash('sha256').update(text).digest('hex')};};
 const apk=file('candidate.apk','TEST FIXTURE NOT APK'),proof=file('report.txt','UNIT TEST ONLY — not physical validation');
 const env={PERSONAL_RELEASE_EVIDENCE:path.join(root,'manifest.json'),VITE_BUILD_COMMIT:'a'.repeat(40),SYNEX_APPLICATION_ID:'com.synex.health.personal',SYNEX_VERSION_CODE:'123',PERSONAL_SIGNER_SHA256:'b'.repeat(64)};
 const m={schema:1,reviewer:'unit test',tested_at:new Date().toISOString(),build:{commit:env.VITE_BUILD_COMMIT,application_id:env.SYNEX_APPLICATION_ID,version_code:123,signer_sha256:env.PERSONAL_SIGNER_SHA256,apk},devices:['fixture1','fixture2'].map(model=>({model,os:'android',tester:'fixture',physical_device:true,apk_sha256:apk.sha256,checks:Object.fromEntries(DEVICE_SCENARIOS.map(s=>[s,{status:'passed',...proof}]))}))};
 return {env,m,write:()=>fs.writeFileSync(env.PERSONAL_RELEASE_EVIDENCE,JSON.stringify(m)),root};
}
it('cannot unlock releases with boolean acceptance flags',()=>expect(verifyPersonalEvidence({PERSONAL_DEVICE_QA_VERIFIED:'true',PERSONAL_POSE_QA_VERIFIED:'true'}).join()).toContain('manifest required'));
it('rejects mismatched build, stale evidence, emulators and missing physical scenarios',()=>{
 for(const mutate of [f=>f.m.build.commit='c'.repeat(40),f=>f.m.tested_at='2000-01-01',f=>f.m.devices[0].physical_device=false,f=>f.m.devices[0].checks.incoming_call.status='not tested']){
  const f=fixture();mutate(f);f.write();expect(verifyPersonalEvidence(f.env)).not.toEqual([]);
 }
});
it('rejects changed APKs, tampered reports and evidence outside the reviewed folder',()=>{
 const f=fixture();f.write();fs.writeFileSync(path.join(f.root,'candidate.apk'),'changed');expect(verifyPersonalEvidence(f.env).join()).toContain('SHA-256 mismatch');
 const g=fixture();g.m.devices[0].checks.upgrade_records.file='../missing.txt';g.write();expect(verifyPersonalEvidence(g.env)).not.toEqual([]);
 const h=fixture();h.write();fs.writeFileSync(path.join(h.root,'other.apk'),'different');expect(verifyPersonalEvidence(h.env,path.join(h.root,'other.apk')).join()).toContain('APK differs');
});
it('device attestations alone cannot replace real-video evaluation',()=>{const f=fixture();f.write();expect(verifyPersonalEvidence(f.env)).not.toEqual([]);});
