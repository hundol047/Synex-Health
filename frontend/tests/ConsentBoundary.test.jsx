import React from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ConsentBoundary from '../src/shared/components/ConsentBoundary.jsx';
import {api} from '../src/shared/lib/api.js';
vi.mock('../src/shared/lib/api.js',()=>({BASE:'',api:vi.fn()}));
vi.mock('../src/shared/components/AuthBoundary.jsx',()=>({useAuth:()=>({demo:true,role:'student'})}));
vi.mock('../src/shared/lib/offline.js',()=>({lockOffline:vi.fn(),bindOfflineAccount:vi.fn()}));
vi.mock('../src/health/pages/PrivacyPage.jsx',()=>({default:()=> <p>내보내기 및 삭제</p>}));
let active;
beforeEach(()=>{active=false;api.mockReset();api.mockImplementation(async(path,body)=>{
 if(path==='/api/health/profile')return {id:'student'};
 if(path==='/api/consents'){if(body)active=true;return {active,version:'v1',retention_policy:'삭제 요청 시까지',operator:'Synex Health 운영팀',support_email:'hundol047@gmail.com'};}
});});
it('requires three unchecked opt-ins before showing health screens',async()=>{
 render(<ConsentBoundary><p>운동 화면</p></ConsentBoundary>);
 const checks=await screen.findAllByRole('checkbox');expect(checks).toHaveLength(3);
 checks.forEach(c=>expect(c.checked).toBe(false));
 const submit=screen.getByRole('button',{name:'동의하고 계속'});expect(submit.disabled).toBe(true);
 checks.forEach(c=>fireEvent.click(c));fireEvent.click(submit);
 await screen.findByText('운동 화면');
 expect(api).toHaveBeenCalledWith('/api/consents',{privacy_collection:true,sensitive_health:true,age_14_or_over:true,version:'v1'});
});
it('opens export and deletion without consent and returns to unchecked form',async()=>{
 render(<ConsentBoundary/>);
 fireEvent.click(await screen.findByRole('button',{name:'동의 없이 내보내기·삭제 관리'}));
 expect(await screen.findByText('내보내기 및 삭제')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'동의 화면으로 돌아가기'}));
 (await screen.findAllByRole('checkbox')).forEach(c=>expect(c.checked).toBe(false));
});
it('locks active content when server reports withdrawn or outdated consent',async()=>{
 active=true;render(<ConsentBoundary><p>운동 화면</p></ConsentBoundary>);await screen.findByText('운동 화면');
 active=false;window.dispatchEvent(new Event('synex-consent-required'));
 await waitFor(()=>expect(screen.queryByText('운동 화면')).toBeNull());
 expect(await screen.findAllByRole('checkbox')).toHaveLength(3);
});
