import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,act,cleanup} from '@testing-library/react';
import TempoWorkout from '../src/health/components/exercise/TempoWorkout.jsx';
vi.mock('../src/health/components/exercise/CameraCoaching.jsx',()=>({default:({motion,playback,standaloneSession})=><div data-testid="split" data-motion={motion} data-kind={playback?.kind} data-standalone={String(standaloneSession)}>시범과 카메라</div>}));
vi.mock('../src/health/components/exercise/WorkoutResults.jsx',()=>({default:()=> <p>운동 결과</p>}));
afterEach(()=>{cleanup();vi.useRealTimers();});
it('starts once, runs the transition countdown and automatically starts the next movement',()=>{
 vi.useFakeTimers();
 render(<TempoWorkout autoStart onClose={()=>{}} exercises={[{motion_id:'squat',exercise_name:'스쿼트',sets:1,reps:'1',transition_seconds:10},{motion_id:'hinge',exercise_name:'힌지',sets:1,reps:'1'}]}/>);
 act(()=>vi.advanceTimersByTime(1));expect(screen.getByRole('button',{name:'템포 일시정지'})).toBeTruthy();
 expect(screen.getByTestId('split').dataset.standalone).toBe('false');
 act(()=>vi.advanceTimersByTime(5100));expect(screen.getByTestId('split').dataset.kind).toBe('work');
 act(()=>vi.advanceTimersByTime(7100));expect(screen.getByText('다음 운동 준비')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(10100));expect(screen.getByTestId('split').dataset.kind).toBe('work');expect(screen.getByTestId('split').dataset.motion).toBe('hip_hinge');
 act(()=>vi.advanceTimersByTime(8100));expect(screen.getByText('운동 결과')).toBeTruthy();expect(screen.queryByTestId('split')).toBeNull();
});

it('finishes timed exercises, rests, starts the next timed motion and opens results without further taps',()=>{
 vi.useFakeTimers();
 render(<TempoWorkout autoStart onClose={()=>{}} exercises={[{motion_id:'plank',exercise_name:'플랭크',sets:1,dose_type:'hold',hold_seconds:5,transition_seconds:10},{motion_id:'march',exercise_name:'제자리 걷기',sets:1,dose_type:'duration',duration_seconds:5}]}/>);
 act(()=>vi.advanceTimersByTime(1));
 act(()=>vi.advanceTimersByTime(5100));expect(screen.getByTestId('split').dataset.kind).toBe('work');
 act(()=>vi.advanceTimersByTime(5100));expect(screen.getByText('다음 운동 준비')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(10100));expect(screen.getByTestId('split').dataset.motion).toBe('march');expect(screen.getByTestId('split').dataset.kind).toBe('work');
 act(()=>vi.advanceTimersByTime(5100));expect(screen.getByText('운동 결과')).toBeTruthy();
});
