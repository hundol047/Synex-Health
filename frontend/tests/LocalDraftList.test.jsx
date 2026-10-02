import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import WorkoutDraftList from '../src/health/components/WorkoutDraftList.jsx';
import {HealthAPI} from '../src/shared/lib/api.js';
vi.mock('../src/shared/lib/api.js',()=>({HealthAPI:{listRoutines:vi.fn()}}));
vi.mock('../src/shared/lib/offline.js',()=>({removeDraft:vi.fn(),listWorkoutDrafts:vi.fn(async()=>[{id:'local',scope:'record:r:e',value:{date:'2026-10-02',patch:{memo:'보존할 입력',timed_sets_seconds:[13]}}}])}));
it('shows local inputs while the routine request never responds',async()=>{
 HealthAPI.listRoutines.mockReturnValue(new Promise(()=>{}));render(<MemoryRouter><WorkoutDraftList/></MemoryRouter>);
 expect(await screen.findByText(/보존할 입력/)).toBeTruthy();expect(screen.queryByRole('link',{name:'이 기록 이어 쓰기'})).toBeNull();
});
it('keeps local inputs visible on server errors and offers retry',async()=>{
 HealthAPI.listRoutines.mockRejectedValue(Error('503'));render(<MemoryRouter><WorkoutDraftList/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('503'));expect(screen.getByText(/보존할 입력/)).toBeTruthy();expect(screen.getByRole('button',{name:'다시 확인'})).toBeTruthy();
});
