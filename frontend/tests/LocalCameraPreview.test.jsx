import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import LocalCameraPreview from '../src/shared/components/LocalCameraPreview.jsx';
vi.mock('../src/health/components/exercise/CameraCoaching.jsx',()=>({default:({motion,localPreview})=><p>camera:{motion}:{String(localPreview)}</p>}));
it('requires explicit opt-in, offers 74 motions, and unmounts camera when consent is withdrawn',()=>{
 render(<LocalCameraPreview onExit={()=>{}}/>);
 expect(screen.queryByText(/camera:/)).toBeNull();fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.getAllByRole('option')).toHaveLength(74);
 fireEvent.change(screen.getByLabelText('테스트할 운동'),{target:{value:'wall_push'}});
 expect(screen.getByText('camera:wall_push:true')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'카메라 테스트 동의 철회'}));
 expect(screen.queryByText(/camera:/)).toBeNull();expect(screen.getByRole('checkbox').checked).toBe(false);
});
