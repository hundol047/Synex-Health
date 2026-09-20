import React from 'react';
import { it, expect } from 'vitest';
import { render,screen,fireEvent } from '@testing-library/react';
import { mockFetch } from './helpers.js';
import SchoolSelector from '../src/health/components/SchoolSelector.jsx';
it('school changes require a new explicit sharing selection',async()=>{
  mockFetch({'/api/schools':[{id:'a',name:'A 대학',region:'서울',integration_message:'미연결'}, {id:'b',name:'B 대학',region:'원주',integration_message:'미연결'}]});
  render(<SchoolSelector profile={{school_id:'a',share_with_center:true}}/>);
  await screen.findByRole('option',{name:'B 대학'});
  expect(screen.getByRole('checkbox').checked).toBe(true);
  fireEvent.change(screen.getByLabelText('소속 학교'),{target:{value:'b'}});
  expect(screen.getByRole('checkbox').checked).toBe(false);
  expect(screen.getByText('미연결')).toBeTruthy();
});
