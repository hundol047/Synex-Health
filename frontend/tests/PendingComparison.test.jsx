import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import PendingWorkouts from '../src/shared/components/PendingWorkouts.jsx';
vi.mock('../src/shared/lib/api.js',()=>({syncPendingWorkouts:vi.fn()}));
it('shows timed performance and notes on both sides before resolving conflicts',()=>{
 render(<PendingWorkouts state={{pending:1,entries:[{id:'x',body:{exercise_name:'플랭크',timed_sets_seconds:[30,20],performed_seconds:50,memo:'기기 메모'},conflict:{timed_sets_seconds:[40],performed_seconds:40,memo:'서버 메모',revision:2}}]}}/>);
 const table=screen.getByRole('table',{name:'운동 기록 상세 비교'});
 for(const value of ['30 / 20','50','40','기기 메모','서버 메모'])expect(within(table).getAllByText(value).length).toBeGreaterThan(0);
});
