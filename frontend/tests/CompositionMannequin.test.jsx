import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {MUSCLE_STUDY,ageAt,publishedMuscleReference} from '../src/health/lib/publishedMuscleReference.js';
import {mannequinBase,mannequinPositions,referenceMannequinMeasurement,torsoCircumference,GIRTH_FIELDS} from '../src/health/components/body3d/mannequinMath.js';
const {scene}=vi.hoisted(()=>({scene:vi.fn()}));
vi.mock('../src/health/components/body3d/BodyScene.jsx',()=>({default:p=>{scene(p);return <div>마네킹 뷰어</div>;}}));
import CompositionMannequin from '../src/health/components/body3d/CompositionMannequin.jsx';
const measurement={height:178,weight:78,skeletal_muscle_mass:30,body_fat_percentage:23,measurement_date:'2026-10-08',segments:[]};
const profile={gender:'male',birth_date:'1996-10-09'};
it('uses explicit published whole-body means and measurement-date age, never age/sex guesses',()=>{
 expect(ageAt(profile.birth_date,measurement.measurement_date)).toBe(29);
 expect(ageAt('2000-02-30',measurement.measurement_date)).toBeNull();
 expect(publishedMuscleReference(measurement,profile)).toMatchObject({value:33,differenceKg:-3,age:29});
 expect(publishedMuscleReference(measurement,{...profile,gender:'female'}).value).toBe(21);
 for(const p of [{}, {...profile,birth_date:null},{...profile,birth_date:'2015-01-01'},{...profile,birth_date:'1900-01-01'}])expect(publishedMuscleReference(measurement,p).available).toBe(false);
 expect(publishedMuscleReference({...measurement,weight:30,body_fat_percentage:20},profile).canOverlay).toBe(false);
 expect(publishedMuscleReference({...measurement,body_fat_percentage:null},profile)).toMatchObject({available:true,canOverlay:false});
 expect(MUSCLE_STUDY.sampleSize).toBe(468);expect(MUSCLE_STUDY.method).toBe('전신 MRI');
});
it('fat and muscle deform different body envelopes while a muscle-only overlay preserves pose and height',()=>{
 const base=mannequinBase('male'),own=mannequinPositions(base,measurement,profile),muscle=mannequinPositions(base,{...measurement,skeletal_muscle_mass:40},profile),fat=mannequinPositions(base,{...measurement,body_fat_percentage:38},profile);
 let changedMuscle=0,changedFat=0;
 for(let i=0;i<base.length;i+=3){expect(muscle[i+1]).toBe(own[i+1]);expect(fat[i+1]).toBe(own[i+1]);if(Math.abs(muscle[i+2]-own[i+2])>.0001)changedMuscle++;if(Math.abs(fat[i+2]-own[i+2])>.0001)changedFat++;}
 expect(changedMuscle).toBeGreaterThan(1000);expect(changedFat).toBeGreaterThan(1000);expect(muscle).not.toEqual(fat);
 const short=mannequinPositions(base,{...measurement,height:160},profile);expect(Math.max(...short.filter((_,i)=>i%3===1))/Math.max(...own.filter((_,i)=>i%3===1))).toBeCloseTo(160/178,5);
 expect(own.every(Number.isFinite)).toBe(true);
});
it('fits measured torso perimeters without moving the pose or inventing regional muscle kg',()=>{
 const m={...measurement,chest_circumference:99,waist_circumference:84,hip_circumference:101,segments:[{segment:'LEFT_ARM',lean_mass_kg:3.2,fat_mass_kg:.8}]};
 const shaped=mannequinPositions(mannequinBase('male'),m,profile);
 for(const [key,,plane] of GIRTH_FIELDS)expect(torsoCircumference(shaped,plane)).toBeCloseTo(m[key],0);
 const ref=referenceMannequinMeasurement(m,33);expect(ref.weight).toBe(m.weight);expect(ref.body_fat_percentage).toBe(m.body_fat_percentage);expect(ref.waist_circumference).toBe(84);expect(ref.segments[0]).toEqual({segment:'LEFT_ARM',fat_mass_kg:.8});
 const equalMassRef=referenceMannequinMeasurement(m,m.skeletal_muscle_mass);
 expect(mannequinPositions(mannequinBase('male'),equalMassRef,profile,m.segments)).toEqual(shaped);
 // Bone and mineral totals are displayed/stored, never used to guess bone anatomy.
 expect(mannequinPositions(mannequinBase('male'),{...m,bone_mass:3,mineral_mass:3.5},profile)).toEqual(shaped);
});
it('shows provenance and composition, toggles actual layers, and keeps own body without eligible mean',async()=>{
 const user=userEvent.setup();const view=render(<MemoryRouter><CompositionMannequin comparisonData={{measurement,body_profile:profile}}/></MemoryRouter>);
 expect(screen.getByText('골격근량')).toBeTruthy();expect(screen.getByText(/전신 MRI/)).toBeTruthy();expect(scene.mock.lastCall[0].mannequin.referenceMeasurement.skeletal_muscle_mass).toBe(33);
 expect(screen.getByRole('button',{name:'나란히 비교',exact:true}).getAttribute('aria-pressed')).toBe('true');
 expect(scene.mock.lastCall[0].mannequin.options).toMatchObject({layout:'side-by-side',showMy:true,showReference:true,myOpacity:.38,referenceOpacity:.34});
 expect(screen.getByText(/왼쪽은 내 몸, 오른쪽은 문헌 평균/)).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'내 몸만',exact:true}));expect(scene.mock.lastCall[0].mannequin.options.showReference).toBe(false);
 await user.click(screen.getByText('투명도 · 골격 · 표현 설정'));await user.click(screen.getByRole('checkbox',{name:/골격 구조 보기/}));expect(scene.mock.lastCall[0].mannequin.options.skeleton).toBe(true);
 view.rerender(<MemoryRouter><CompositionMannequin comparisonData={{measurement,body_profile:{gender:'unspecified'}}}/></MemoryRouter>);
 expect(scene.mock.lastCall[0].mannequin.referenceMeasurement).toBeNull();expect(scene.mock.lastCall[0].mannequin.options.showMy).toBe(true);expect(screen.queryByText('33')).toBeNull();
 expect(screen.getByRole('button',{name:'나란히 비교',exact:true}).disabled).toBe(true);
 expect(screen.getByRole('link',{name:'평균 모형에 필요한 정보 입력'}).getAttribute('href')).toBe('/health/profile');
 expect(screen.getByRole('status').textContent).toContain('성별 · 생년월일');
});
it('higher displayed transparency makes both actual materials less opaque',async()=>{
 const user=userEvent.setup();render(<MemoryRouter><CompositionMannequin comparisonData={{measurement,body_profile:profile}}/></MemoryRouter>);
 await user.click(screen.getByText('투명도 · 골격 · 표현 설정'));
 expect(screen.getByLabelText('내 마네킹 투명도').value).toBe('62');expect(screen.getByLabelText('평균 마네킹 투명도').value).toBe('66');
 fireEvent.change(screen.getByLabelText('내 마네킹 투명도'),{target:{value:'80'}});fireEvent.change(screen.getByLabelText('평균 마네킹 투명도'),{target:{value:'75'}});
 expect(scene.mock.lastCall[0].mannequin.options).toMatchObject({myOpacity:.2,referenceOpacity:.25});
 expect(screen.getByText('내 몸 투명도 80%')).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'겹쳐보기',exact:true}));expect(scene.mock.lastCall[0].mannequin.options).toMatchObject({layout:'overlap',showMy:true,showReference:true});
 await user.click(screen.getByRole('button',{name:'평균 비교 모형',exact:true}));expect(scene.mock.lastCall[0].mannequin.options).toMatchObject({showMy:false,showReference:true});
 expect(screen.queryByText('내 체성분 · 30 kg')).toBeNull();expect(screen.getByText('문헌 평균 · 33 kg')).toBeTruthy();
});
it('explains incompatible reference composition above the viewer and never invents a full average record',()=>{
 render(<MemoryRouter><CompositionMannequin comparisonData={{measurement:{...measurement,weight:30},body_profile:profile}}/></MemoryRouter>);
 expect(scene.mock.lastCall[0].mannequin.referenceMeasurement).toBeNull();expect(scene.mock.lastCall[0].mannequin.options.showMy).toBe(true);
 expect(screen.getByRole('status').textContent).toContain('현재 체중·체지방 조건');
 expect(screen.getByRole('button',{name:'평균 비교 모형',exact:true}).disabled).toBe(true);
 expect(screen.queryByRole('link',{name:'평균 모형에 필요한 정보 입력'})).toBeNull();
});
it('keeps the study age restriction clear even when other body inputs are missing',()=>{
 render(<MemoryRouter><CompositionMannequin comparisonData={{measurement:{...measurement,body_fat_percentage:null},body_profile:{...profile,birth_date:'2015-01-01'}}}/></MemoryRouter>);
 expect(screen.getAllByRole('status').find(s=>s.className==='mannequin-reference-setup').textContent).toContain('18–88세');
 expect(screen.queryByRole('link',{name:'평균 모형에 필요한 정보 입력'})).toBeNull();expect(scene.mock.lastCall[0].mannequin.referenceMeasurement).toBeNull();
});
