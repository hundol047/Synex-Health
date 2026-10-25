import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import ExerciseLibraryPage from '../src/health/pages/ExerciseLibraryPage.jsx';
vi.mock('../src/health/components/exercise/ExerciseMotion3D.jsx',()=>({default:({motion})=><div data-testid="selected-3d-stage">{motion} 3D 시범</div>}));
vi.mock('../src/shared/lib/api.js',()=>({api:vi.fn(async()=>[
 {id:'squat',name:'맨몸 스쿼트',english_name:'squat',training_type:'bodyweight',category:'Legs',equipment:[],target_muscle:['하체'],instructions:['천천히'],motion_id:'squat'},
 {id:'leg_press',name:'레그 프레스',english_name:'leg press',training_type:'equipment',category:'Legs',equipment:['leg_press_machine'],target_muscle:['하체'],instructions:['발판'],motion_id:'leg_press'},
])}));
it('separates bodyweight and gym and searches Korean equipment names',async()=>{
 const u=userEvent.setup();render(<MemoryRouter><ExerciseLibraryPage/></MemoryRouter>);
 await screen.findByText('레그 프레스');await u.click(screen.getByRole('button',{name:/맨몸운동/}));expect(screen.queryByText('레그 프레스')).toBeNull();expect(screen.getByText('맨몸 스쿼트')).toBeTruthy();
 await u.click(screen.getByRole('button',{name:/헬스장 운동/}));expect(screen.queryByText('맨몸 스쿼트')).toBeNull();expect(screen.getByText('레그 프레스')).toBeTruthy();
 await u.type(screen.getByLabelText('운동·근육 검색'),'존재하지않음');expect(screen.getByText('조건에 맞는 운동이 없어요')).toBeTruthy();
});
it('mounts one large viewer only after selection and replaces it when another card is chosen',async()=>{
 const u=userEvent.setup();render(<MemoryRouter><ExerciseLibraryPage/></MemoryRouter>);
 await screen.findByText('레그 프레스');
 expect(screen.queryByTestId('selected-3d-stage')).toBeNull();
 expect(screen.getAllByTestId('exercise-preview')).toHaveLength(2);
 await u.click(screen.getByRole('button',{name:'맨몸 스쿼트 동작 보기'}));
 const stage=screen.getByRole('region',{name:'선택한 운동 시범'});
 expect((await within(stage).findByTestId('selected-3d-stage')).textContent).toContain('squat');
 expect(screen.getAllByTestId('selected-3d-stage')).toHaveLength(1);
 expect(within(stage).getByRole('link',{name:'이 동작 촬영·자세 교정'}).getAttribute('href')).toBe('/health/pose?motion=squat');
 await u.click(within(stage).getByRole('button',{name:'동작 재생'}));
 await u.click(screen.getByRole('button',{name:'레그 프레스 동작 보기'}));
 expect(within(stage).getByTestId('selected-3d-stage').textContent).toContain('leg_press');
 expect(screen.getAllByTestId('selected-3d-stage')).toHaveLength(1);
 expect(within(stage).getByRole('button',{name:'동작 재생'})).toBeTruthy();
 await u.click(screen.getByRole('button',{name:/맨몸운동/}));
 expect(screen.queryByRole('region',{name:'선택한 운동 시범'})).toBeNull();
});
it('closes the selected stage without removing the filtered catalogue',async()=>{
 const u=userEvent.setup();render(<MemoryRouter><ExerciseLibraryPage/></MemoryRouter>);
 await screen.findByText('레그 프레스');
 await u.click(screen.getByRole('button',{name:'레그 프레스 동작 보기'}));
 await u.click(screen.getByRole('button',{name:'선택한 운동 시범 닫기'}));
 expect(screen.queryByTestId('selected-3d-stage')).toBeNull();
 expect(screen.getAllByTestId('exercise-preview')).toHaveLength(2);
});
