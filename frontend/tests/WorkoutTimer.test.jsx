import React,{useState} from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import WorkoutTimer from '../src/health/components/exercise/WorkoutTimer.jsx';
import {workoutStatus} from '../src/health/lib/workoutStatus.js';
it('timer restores stopped, counts active time and pauses without counting the background gap',()=>{
 vi.useFakeTimers();
 function Harness({paused=false}){const [seconds,setSeconds]=useState(10);return <WorkoutTimer seconds={seconds} onChange={setSeconds} target={30} paused={paused}/>;}
 try{
  const view=render(<Harness/>);act(()=>vi.advanceTimersByTime(5000));expect(screen.getByRole('timer').textContent).toBe('0:10');
  fireEvent.click(screen.getByRole('button',{name:'타이머 시작'}));act(()=>vi.advanceTimersByTime(2000));expect(screen.getByRole('timer').textContent).toBe('0:12');
  view.rerender(<Harness paused/>);act(()=>vi.advanceTimersByTime(60000));expect(screen.getByRole('timer').textContent).toBe('0:12');
 }finally{vi.useRealTimers();}
});
it('zero, partial and full timed performance match server status rules',()=>{
 expect(workoutStatus({sets_completed:0},{sets:2})).toBe('not_started');
 expect(workoutStatus({sets_completed:1},{sets:2})).toBe('partial');
 expect(workoutStatus({timed_sets_seconds:[30,10]},{dose_type:'hold',hold_seconds:30,sets:2})).toBe('partial');
 expect(workoutStatus({performed_seconds:300},{dose_type:'duration',duration:'5분'})).toBe('completed');
});
