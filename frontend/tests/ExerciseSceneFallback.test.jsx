import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ExerciseSceneFallback} from '../src/health/components/exercise/ExerciseMotion3D.jsx';
it('releases the loading gate when WebGL falls back to the simpler guide',()=>{
 const ready=vi.fn();const {rerender}=render(<ExerciseSceneFallback onReady={ready}><span>동작 0</span></ExerciseSceneFallback>);
 expect(ready).toHaveBeenCalledTimes(1);expect(screen.getByRole('status').textContent).toContain('간단 동작 안내');
 rerender(<ExerciseSceneFallback onReady={ready}><span>동작 1</span></ExerciseSceneFallback>);expect(ready).toHaveBeenCalledTimes(1);expect(screen.getByText('동작 1')).toBeTruthy();
});

it('recovers from a failed detailed asset when switching back to the configurable model',async()=>{
 const {SceneBoundary}=await import('../src/health/components/exercise/ExerciseMotion3D.jsx');
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 const Broken=()=>{throw new Error('unavailable character asset');};
 try{
  const {rerender}=render(<SceneBoundary motion="shoulder_roll" resetKey="detailed:female" fallback={<p>간단한 시범</p>}><Broken/></SceneBoundary>);
  expect(screen.getByText('간단한 시범')).toBeTruthy();
  rerender(<SceneBoundary motion="shoulder_roll" resetKey="custom:female" fallback={<p>간단한 시범</p>}><p>다시 불러온 캐릭터</p></SceneBoundary>);
  expect(screen.getByText('다시 불러온 캐릭터')).toBeTruthy();expect(screen.queryByText('간단한 시범')).toBeNull();
 }finally{log.mockRestore();}
});
