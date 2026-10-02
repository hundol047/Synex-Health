import React,{useState} from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import {workoutStatus} from '../src/health/lib/workoutStatus.js';
import WorkoutTimer from '../src/health/components/exercise/WorkoutTimer.jsx';
function Timer(){const [seconds,setSeconds]=useState(0);return <WorkoutTimer seconds={seconds} onChange={setSeconds} target={60}/>;}
afterEach(()=>{cleanup();vi.useRealTimers();});
it('ignores system-clock changes while measuring elapsed exercise time',()=>{
 vi.useFakeTimers();render(<Timer/>);fireEvent.click(screen.getByText('타이머 시작'));act(()=>vi.advanceTimersByTime(2000));expect(screen.getByRole('timer').textContent).toBe('0:02');
 vi.setSystemTime(Date.now()+3600000);act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole('timer').textContent).toBe('0:03');
 vi.setSystemTime(Date.now()-7200000);act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole('timer').textContent).toBe('0:04');
});
it('excludes stopped time and resumes from the recorded seconds',()=>{
 vi.useFakeTimers();render(<Timer/>);fireEvent.click(screen.getByText('타이머 시작'));act(()=>vi.advanceTimersByTime(2000));fireEvent.click(screen.getByText('타이머 멈추기'));act(()=>vi.advanceTimersByTime(60000));fireEvent.click(screen.getByText('타이머 시작'));act(()=>vi.advanceTimersByTime(1000));expect(screen.getByRole('timer').textContent).toBe('0:03');
});

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
