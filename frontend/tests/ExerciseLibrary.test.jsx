import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import ExerciseLibraryPage from '../src/health/pages/ExerciseLibraryPage.jsx';
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
