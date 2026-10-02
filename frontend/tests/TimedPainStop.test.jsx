import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import WorkoutMode from '../src/health/components/exercise/WorkoutMode.jsx';
import {HealthAPI} from '../src/shared/lib/api.js';
vi.mock('../src/shared/lib/api.js',()=>({HealthAPI:{createWorkout:vi.fn(async body=>({...body,id:'saved'}))}}));
vi.mock('../src/health/lib/useWorkoutDraft.js',()=>({useWorkoutDraft:()=>({ready:true,flush:async()=>{},clear:async()=>{}})}));
vi.mock('../src/health/components/exercise/ExerciseCard.jsx',()=>({default:()=>null}));
vi.mock('../src/health/components/exercise/WorkoutTimer.jsx',()=>({default:({onChange})=><button onClick={()=>onChange(17)}>17초 측정</button>}));
it.each(['hold','duration'])('preserves running %s time when stopped for pain without recording the time first',async dose_type=>{
 HealthAPI.createWorkout.mockClear();render(<WorkoutMode routine={{id:'r'}} exercises={[{exercise_id:'e',day_number:1,exercise_name:'운동',dose_type,sets:2,hold_seconds:30,duration:'5분'}]} onSaved={async()=>{}} onClose={()=>{}}/>);
 fireEvent.click(screen.getByText('17초 측정'));fireEvent.change(screen.getByLabelText('통증 (0–10)'),{target:{value:'3'}});fireEvent.click(screen.getByRole('button',{name:'통증 기록 · 운동 중단'}));
 await waitFor(()=>expect(HealthAPI.createWorkout).toHaveBeenCalledTimes(1));const body=HealthAPI.createWorkout.mock.lastCall[0];expect(body).toMatchObject({completion_status:'stopped',completed:false,pain:3,sets_completed:1});
 if(dose_type==='hold')expect(body.timed_sets_seconds).toEqual([17]);else expect(body.performed_seconds).toBe(17);
});
