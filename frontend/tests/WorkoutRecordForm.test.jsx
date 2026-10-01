import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutRecordForm from '../src/health/components/exercise/WorkoutRecordForm.jsx';
import {HealthAPI} from '../src/shared/lib/api.js';
vi.mock('../src/shared/lib/api.js',()=>({HealthAPI:{createWorkout:vi.fn(async b=>({...b,id:'saved'}))}}));
const exercise={exercise_id:'d1-squat',motion_id:'squat',exercise_name:'스쿼트',day_number:1,dose_type:'reps',sets:2};
it('editing only a load retains stored pain, effort, duration and memo',async()=>{
 const user=userEvent.setup();render(<WorkoutRecordForm exercise={exercise} routine={{id:'r'}} date="2026-10-02" existing={{set_records:[{weight_kg:10,reps:8}],rpe:7,pain:2,difficulty:'pain',actual_minutes:12.5,memo:'기존 메모',completed:false}} onSaved={vi.fn()}/>);
 expect(screen.queryByLabelText('실제 세트')).toBeNull();
 const input=screen.getByLabelText('1세트 중량 kg');await waitFor(()=>expect(input.closest('fieldset').disabled).toBe(false));await user.clear(input);await user.type(input,'12.5');await user.click(screen.getByRole('button',{name:'기록 수정'}));
 expect(HealthAPI.createWorkout.mock.lastCall[0]).toMatchObject({set_records:[{weight_kg:12.5,reps:8}],rpe:7,pain:2,difficulty:'pain',actual_minutes:12.5,memo:'기존 메모',completed:false});
});
it('copying last sets is explicit, duplicate is editable and pending save locks repeated submit',async()=>{
 HealthAPI.createWorkout.mockResolvedValueOnce({pending_sync:true});const user=userEvent.setup();render(<WorkoutRecordForm exercise={exercise} routine={{id:'r'}} date="2026-10-02" previous={{date:'2026-10-01',set_records:[{weight_kg:20,reps:10}]}} onSaved={vi.fn()}/>);
 expect(screen.queryByLabelText('1세트 중량 kg')).toBeNull();await user.click(screen.getByRole('button',{name:/지난 세트 불러오기/}));await user.click(screen.getByRole('button',{name:'같은 세트 추가'}));
 expect(screen.getByLabelText('2세트 중량 kg').value).toBe('20');await user.click(screen.getByRole('button',{name:'완료 기록'}));
 expect(await screen.findByRole('button',{name:'전송 대기 중'})).toHaveProperty('disabled',true);
});
