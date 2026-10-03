import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import WorkoutMode from '../src/health/components/exercise/WorkoutMode.jsx';
const mocks=vi.hoisted(()=>({saved:null,flush:vi.fn(async()=>{})}));
vi.mock('../src/health/lib/useWorkoutDraft.js',()=>({useWorkoutDraft:(scope,value,dirty,restore)=>{React.useEffect(()=>{if(mocks.saved)restore(mocks.saved);},[]);return {ready:true,flush:mocks.flush,clear:async()=>{}};}}));
vi.mock('../src/health/components/exercise/ExerciseCard.jsx',()=>({default:()=>null}));
vi.mock('../src/shared/lib/api.js',()=>({HealthAPI:{createWorkout:vi.fn(async x=>x)}}));
const exercise={exercise_id:'squat',exercise_name:'Squat',day_number:1,sets:3,reps:'10',rest_seconds:60};
it('resumes restored sets with expired absolute rest deadline instead of restarting rest',async()=>{
 mocks.saved={index:0,sets:1,setRows:[{reps:8,weight_kg:0,kind:'working'}],restUntil:Date.now()-1000,remaining:60};
 render(<WorkoutMode routine={{id:'r'}} exercises={[exercise]} onSaved={()=>{}} onClose={()=>{}}/>);
 expect(await screen.findByText('진행 중인 운동이 있습니다.')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'이어하기'}));await waitFor(()=>expect(screen.getByRole('button',{name:'세트 완료'}).disabled).toBe(false));expect(screen.queryByText('휴식 건너뛰기')).toBeNull();
});
