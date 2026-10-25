import React from 'react';
import {expect,it} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {segmentComparison,differenceText} from '../src/health/components/body3d/segmentComparison.js';
import SegmentComparisonReadout from '../src/health/components/body3d/SegmentComparisonReadout.jsx';
const data=(lean,percent)=>({measurement:{skeletal_muscle_mass:30,segments:[{segment:'LEFT_ARM',lean_mass_kg:lean,lean_reference_percent:percent}]}});

it('derives the report standard from regional kg and percent without calling it a population average',()=>{
 const result=segmentComparison(data(2.7,90),'LEFT_ARM');
 expect(result).toMatchObject({available:true,reference:3,direction:'below',differencePercent:-10,kind:'report'});
 expect(result.differenceKg).toBeCloseTo(-.3);expect(differenceText(result)).toBe('결과지 기준보다 0.3 kg 적어요');
 const above=segmentComparison(data(3.3,110),'LEFT_ARM');expect(above.differenceKg).toBeCloseTo(.3);expect(differenceText(above)).toBe('결과지 기준보다 0.3 kg 많아요');
 expect(differenceText(segmentComparison(data(3,100),'LEFT_ARM'))).toBe('결과지 기준과 같아요');
});
it('compares percent alone without inventing kg and rejects absent, zero or invalid percentage standards',()=>{
 const result=segmentComparison(data(null,85),'LEFT_ARM');
 expect(result).toMatchObject({own:null,reference:null,differenceKg:null,differencePercent:-15});expect(differenceText(result)).toBe('결과지 기준보다 15% 적어요');
 for(const percent of [null,undefined,0,-1,Infinity,NaN,1001])expect(segmentComparison(data(2.7,percent),'LEFT_ARM')).toMatchObject({available:false,own:2.7});
 expect(segmentComparison(data(2.7,90),'RIGHT_ARM').available).toBe(false);
 expect(segmentComparison({measurement:{skeletal_muscle_mass:30}},'LEFT_ARM').available).toBe(false);
});
it('uses a sourced selected cohort mean, rejects demo means, and keeps tiny nonzero differences distinct',()=>{
 const comparison={...data(2.7,90),average_comparison:{selected_group_id:'g',groups:[{id:'g',metadata:{reference_source:'Validated regional study'},segments:{LEFT_ARM:{lean:{reference_value:3.2}}}}]}};
 expect(segmentComparison(comparison,'LEFT_ARM')).toMatchObject({kind:'average',reference:3.2,source:'Validated regional study'});
 expect(differenceText(segmentComparison(comparison,'LEFT_ARM'))).toBe('비교군 평균보다 0.5 kg 적어요');
 comparison.average_comparison.groups[0].metadata.demo=true;expect(segmentComparison(comparison,'LEFT_ARM').kind).toBe('report');
 comparison.measurement.segments[0].lean_reference_percent=null;expect(segmentComparison(comparison,'LEFT_ARM').available).toBe(false);
 expect(differenceText(segmentComparison(data(2.9999,99.999),'LEFT_ARM'))).toBe('결과지 기준보다 0.01 kg 미만 적어요');
});
it('shows a large regional result with its source and missing-data instructions without relabeling total muscle',()=>{
 const view=render(<MemoryRouter><SegmentComparisonReadout selected="LEFT_ARM" focusRegion="left_arm" comparisonData={data(2.7,90)}/></MemoryRouter>);
 const card=screen.getByRole('status',{name:'선택 부위 수치 비교'});
 expect(within(card).getByText('왼팔 선택')).toBeTruthy();expect(card.textContent).toContain('결과지 기준보다 0.3 kg 적어요');expect(card.textContent).toContain('문헌 평균과 다릅니다');
 view.rerender(<MemoryRouter><SegmentComparisonReadout selected="RIGHT_ARM" focusRegion="right_arm" comparisonData={data(2.7,90)} totalReference={{available:true,differenceKg:-3}}/></MemoryRouter>);
 expect(card.textContent).toContain('부위 비교 정보가 필요해요');expect(card.textContent).toContain('해당 부위 차이 아님');expect(card.textContent).not.toContain('0.3 kg 적어요');
 expect(within(card).getByRole('link',{name:/부위 수치 입력/}).getAttribute('href')).toBe('/health/profile#segment-measurements');
});
it('identifies trunk-wide values for back/chest and never assigns trunk kg to the buttocks',()=>{
 const comparison={measurement:{segments:[{segment:'TRUNK',lean_mass_kg:24,lean_reference_percent:96}]}};
 const view=render(<MemoryRouter><SegmentComparisonReadout selected="TRUNK" focusRegion="back" comparisonData={comparison}/></MemoryRouter>);
 let card=screen.getByRole('status',{name:'선택 부위 수치 비교'});expect(card.textContent).toContain('몸통 전체 분석 값');expect(card.textContent).toContain('등만의 수치가 아닌 몸통 전체 비교');expect(card.textContent).toContain('1 kg 적어요');
 view.rerender(<MemoryRouter><SegmentComparisonReadout selected="TRUNK" focusRegion="hips" comparisonData={comparison}/></MemoryRouter>);
 card=screen.getByRole('status',{name:'선택 부위 수치 비교'});expect(card.textContent).toContain('엉덩이만의 비교 수치는 없어요');expect(card.textContent).not.toContain('1 kg 적어요');expect(card.textContent).not.toContain('24 kg');
});
