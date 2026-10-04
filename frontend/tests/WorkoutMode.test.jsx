vi.mock('../src/health/lib/useWorkoutDraft.js',()=>({useWorkoutDraft:()=>({ready:true,flush:async()=>{},clear:async()=>{}})}));
import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutMode from '../src/health/components/exercise/WorkoutMode.jsx';
import {HealthAPI} from '../src/shared/lib/api.js';
vi.mock('../src/shared/lib/api.js',()=>({HealthAPI:{createWorkout:vi.fn(body=>Promise.resolve({...body,id:'saved'}))}}));
const exercises=[1,2].map(n=>({exercise_id:`d1-${n}`,day_number:1,exercise_name:`운동 ${n}`,motion_id:'squat',sets:1,dose_type:'reps',reps:'10',instructions:['천천히 움직이세요'],reason:'사용 가능한 장비를 반영했습니다.'}));
it('records completed sets/RPE/reps, advances, and pain stops the workout with an honest summary',async()=>{
 const user=userEvent.setup(),onSaved=vi.fn();render(<WorkoutMode routine={{id:'r'}} exercises={exercises} onSaved={onSaved} onClose={()=>{}}/>);
 expect(screen.getByRole('checkbox',{name:/음성/}).checked).toBe(false);
 expect(screen.getByRole('button',{name:'완료 기록 · 다음 운동'}).disabled).toBe(true);
 await user.type(screen.getByLabelText('이번 세트 반복 횟수'),'10');await user.type(screen.getByLabelText('이번 세트 중량 kg'),'12.5');await user.click(screen.getByRole('button',{name:/세트 완료/}));await user.type(screen.getByLabelText('운동 힘듦 (RPE 1–10)'),'6');await user.click(screen.getByRole('button',{name:'완료 기록 · 다음 운동'}));
 expect(await screen.findByText('운동 따라하기 · 2 / 2')).toBeTruthy();expect(HealthAPI.createWorkout.mock.calls[0][0]).toMatchObject({set_records:[{reps:10,weight_kg:12.5,kind:'working'}],sets_completed:1,reps_completed:'10',rpe:6,completed:true});
 await user.clear(screen.getByLabelText('통증 (0–10)'));await user.type(screen.getByLabelText('통증 (0–10)'),'3');await user.click(screen.getByRole('button',{name:'통증 기록 · 운동 중단'}));
 expect(await screen.findByText('오늘의 운동 요약')).toBeTruthy();expect(screen.getByRole('alert').textContent).toContain('진행을 중단');expect(HealthAPI.createWorkout.mock.calls[1][0]).toMatchObject({pain:3,completed:false,sets_completed:0});
});
it('pauses active time, blocks set completion while paused, and guards unsaved exit',async()=>{
 let now=100000;const clock=vi.spyOn(Date,'now').mockImplementation(()=>now),confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 const user=userEvent.setup(),onClose=vi.fn();render(<WorkoutMode routine={{id:'r'}} exercises={[exercises[0]]} onSaved={vi.fn()} onClose={onClose}/>);
 try{
  await user.type(screen.getByLabelText('이번 세트 반복 횟수'),'10');await user.click(screen.getByRole('button',{name:'목록으로'}));expect(onClose).not.toHaveBeenCalled();expect(confirm).toHaveBeenCalled();
  now+=60000;await user.click(screen.getByRole('button',{name:'잠시 멈추기'}));expect(screen.getByRole('button',{name:'세트 완료'}).disabled).toBe(true);
  now+=120000;await user.click(screen.getByRole('button',{name:'운동 계속하기'}));now+=60000;
  await user.click(screen.getByRole('button',{name:'세트 완료'}));await user.click(screen.getByRole('button',{name:'완료 기록 · 다음 운동'}));
  expect(HealthAPI.createWorkout.mock.lastCall[0].actual_minutes).toBe(2);
 }finally{clock.mockRestore();confirm.mockRestore();}
});
