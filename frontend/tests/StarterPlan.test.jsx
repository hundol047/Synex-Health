import 'fake-indexeddb/auto';
import React from 'react';
import {webcrypto} from 'node:crypto';
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {mockFetch} from './helpers.js';
import {localApi} from '../src/shared/lib/localApi.js';
import {bindOfflineAccount,clearOffline} from '../src/shared/lib/offline.js';
import {LOCAL_ACCOUNT,LOCAL_NAMESPACE} from '../src/shared/lib/localMode.js';
import RoutinePage from '../src/health/pages/RoutinePage.jsx';

beforeEach(async()=>{vi.stubGlobal('crypto',webcrypto);await bindOfflineAccount(LOCAL_ACCOUNT,LOCAL_NAMESPACE);});
afterEach(async()=>{await clearOffline();vi.unstubAllGlobals();});

it('personal mode builds a gentle starter plan before any measurement',async()=>{
 const r=await localApi('/api/exercise-routines/generate',{});
 expect(r.starter).toBe(true);expect(r.based_on_measurement_id).toBeNull();
 expect(r.exercises.length).toBeGreaterThan(0);expect(r.input_snapshot.weight_kg).toBeNull();
 expect(r.rationale.join(' ')).toContain('체성분 측정값이 없어');
 await localApi('/api/body-composition',{measurement_date:'2026-01-01',weight:60,height:165,skeletal_muscle_mass:24,segments:[]});
 const next=await localApi('/api/exercise-routines/generate',{});
 expect(next.starter).toBe(false);expect(next.input_snapshot.muscle_kg).toBe(24);
});

it('server mode guides the user to measurement entry instead of a dead-end error',async()=>{
 mockFetch({'/api/exercise-routines/generate':{status:404,body:{detail:'체성분 측정 데이터가 없어 루틴을 생성할 수 없습니다.'}},'/api/exercise-routines':[],'/api/adaptive':[]});
 render(<MemoryRouter><RoutinePage/></MemoryRouter>);
 await userEvent.click(await screen.findByRole('button',{name:'내 운동 계획 만들기'}));
 expect(await screen.findByText('체성분을 먼저 입력해 주세요')).toBeTruthy();
 expect(screen.getByRole('link',{name:'체성분 입력하기'}).getAttribute('href')).toBe('/health/profile#measurement-entry');
 expect(screen.queryByText('다시 시도')).toBeNull();
});
