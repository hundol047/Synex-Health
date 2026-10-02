import React from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import WorkoutRecordForm from '../src/health/components/exercise/WorkoutRecordForm.jsx';
import {HealthAPI} from '../src/shared/lib/api.js';
const mocks=vi.hoisted(()=>({clear:vi.fn(),save:vi.fn()}));
vi.mock('../src/shared/lib/api.js',()=>({HealthAPI:{createWorkout:mocks.save}}));
vi.mock('../src/health/lib/useWorkoutDraft.js',()=>({useWorkoutDraft:()=>({ready:true,clear:mocks.clear,flush:async()=>{}})}));
const exercise={exercise_id:'e',exercise_name:'운동',day_number:1,sets:1};
const setup=()=>render(<WorkoutRecordForm exercise={exercise} routine={{id:'r'}} date="2026-10-02" existing={{revision:1,memo:'이전 메모',sets_completed:1,reps_completed:'10'}} onSaved={async()=>{}}/>);
beforeEach(()=>{mocks.clear.mockReset().mockResolvedValue();mocks.save.mockReset();vi.spyOn(window,'confirm').mockReturnValue(true);});
it('locks discard during save and retains the newest acknowledged base after discarding later edits',async()=>{
 let resolve;mocks.save.mockImplementationOnce(body=>new Promise(r=>{resolve=()=>r({...body,revision:2});}));setup();fireEvent.change(screen.getByLabelText('메모'),{target:{value:'저장된 새 메모'}});fireEvent.submit(screen.getByRole('button',{name:'기록 수정'}).closest('form'));
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(screen.getByText('임시 입력 버리기').disabled).toBe(true);resolve();await waitFor(()=>expect(screen.getByRole('button',{name:'기록 수정'}).disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('메모'),{target:{value:'버릴 메모'}});fireEvent.click(screen.getByText('임시 입력 버리기'));await waitFor(()=>expect(screen.getByLabelText('메모').value).toBe('저장된 새 메모'));
});
it('preserves inputs and shows an error if draft deletion fails',async()=>{
 mocks.clear.mockRejectedValueOnce(Error('storage failure'));setup();fireEvent.change(screen.getByLabelText('메모'),{target:{value:'보존할 메모'}});fireEvent.click(screen.getByText('임시 입력 버리기'));
 expect((await screen.findByRole('alert')).textContent).toContain('입력을 유지');expect(screen.getByLabelText('메모').value).toBe('보존할 메모');expect(HealthAPI.createWorkout).not.toHaveBeenCalled();
});
