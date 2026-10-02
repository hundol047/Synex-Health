import React,{useState} from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {useWorkoutDraft} from '../src/health/lib/useWorkoutDraft.js';
const pending=vi.hoisted(()=>[]);
vi.mock('../src/shared/lib/offline.js',()=>({offlineEpoch:()=>1,loadDraft:async()=>null,saveDraft:vi.fn(()=>new Promise(resolve=>pending.push(resolve))),removeDraft:async()=>{}}));
function Form(){const [value,setValue]=useState('');const draft=useWorkoutDraft('x',{value},!!value,()=>{});return <><input aria-label="입력" disabled={!draft.ready} value={value} onChange={e=>setValue(e.target.value)}/><p role="status">{draft.status}</p></>;}
it('does not announce saved while the newest input is still queued',async()=>{
 render(<Form/>);await waitFor(()=>expect(screen.getByLabelText('입력').disabled).toBe(false));
 fireEvent.change(screen.getByLabelText('입력'),{target:{value:'first'}});await waitFor(()=>expect(pending).toHaveLength(1));
 fireEvent.change(screen.getByLabelText('입력'),{target:{value:'latest'}});
 await act(async()=>pending[0]('one'));await waitFor(()=>expect(pending).toHaveLength(2));
 expect(screen.getByRole('status').textContent).toBe('기기에 임시 저장 중…');
 await act(async()=>pending[1]('two'));expect(screen.getByRole('status').textContent).toBe('기기에 임시 저장됨');
});
