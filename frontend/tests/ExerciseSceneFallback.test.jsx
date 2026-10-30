import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ExerciseSceneFallback} from '../src/health/components/exercise/ExerciseMotion3D.jsx';
it('releases the loading gate when WebGL falls back to the simpler guide',()=>{
 const ready=vi.fn();const {rerender}=render(<ExerciseSceneFallback onReady={ready}><span>동작 0</span></ExerciseSceneFallback>);
 expect(ready).toHaveBeenCalledTimes(1);expect(screen.getByRole('status').textContent).toContain('간단 동작 안내');
 rerender(<ExerciseSceneFallback onReady={ready}><span>동작 1</span></ExerciseSceneFallback>);expect(ready).toHaveBeenCalledTimes(1);expect(screen.getByText('동작 1')).toBeTruthy();
});
