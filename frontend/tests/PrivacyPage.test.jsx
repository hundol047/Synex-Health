import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrivacyPage from '../src/health/pages/PrivacyPage.jsx';
import {api} from '../src/shared/lib/api.js';
import {clearOffline,bindOfflineAccount} from '../src/shared/lib/offline.js';
vi.mock('../src/shared/lib/api.js',()=>({BASE:'test-server',api:vi.fn(async(path)=>path==='/api/privacy/export'?{profile:{id:'me',school_id:'campus'},measurements:[],workouts:[],sharing_history:[]}:{deleted:true})}));
vi.mock('../src/shared/lib/offline.js',()=>({offlineState:()=>({pending:1}),clearOffline:vi.fn(async()=>{}),clearResponseCache:vi.fn(),bindOfflineAccount:vi.fn(async()=>{})}));
vi.mock('../src/health/components/WorkoutDraftList.jsx',()=>({default:()=>null}));
vi.mock('../src/shared/lib/accountLifecycle.js',()=>({clearLocalAccount:vi.fn()}));
it('revoking sharing keeps pending workouts and health deletion rebinds the still-signed-in account',async()=>{
 const u=userEvent.setup();render(<PrivacyPage/>);
 const revoke=await screen.findByRole('button',{name:'건강센터 공유 철회'});await waitFor(()=>expect(revoke.disabled).toBe(false));await u.click(revoke);
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/api/health/school',{school_id:'campus',share_with_center:false},{method:'PUT'}));expect(clearOffline).not.toHaveBeenCalled();
 await u.type(screen.getByLabelText('확인 문구 DELETE 입력'),'DELETE');await u.click(screen.getByRole('button',{name:'건강 데이터 전체 삭제'}));
 await waitFor(()=>expect(bindOfflineAccount).toHaveBeenCalledWith('me','test-server'));expect(clearOffline).toHaveBeenCalledTimes(1);
});
