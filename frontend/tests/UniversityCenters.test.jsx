import React from 'react';
import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import UniversityCenters from '../src/health/components/UniversityCenters.jsx';
import OfficialCenterLink from '../src/health/components/OfficialCenterLink.jsx';
import {UNIVERSITY_CENTERS,findUniversityCenters,officialCenterUrl} from '../src/health/lib/universityCenters.js';

const platform=vi.hoisted(()=>({native:false,open:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>platform.native}}));
vi.mock('@capacitor/browser',()=>({Browser:{open:platform.open}}));
beforeEach(()=>{platform.native=false;platform.open.mockReset();});

it('searches campus and region together and excludes past or unconfirmed measurements',()=>{
  expect(findUniversityCenters('  연세  원주 ').map(c=>c.id)).toEqual(['yonsei-mirae-centers']);
  expect(findUniversityCenters('춘천',true).map(c=>c.schoolId)).toEqual(['kangwon']);
  expect(findUniversityCenters('전남',true)).toEqual([]);
  expect(findUniversityCenters('부산',true)).toEqual([]);
  expect(findUniversityCenters('서울',true).map(c=>c.schoolId)).toEqual(['snu','korea-seoul']);
});
it('keeps every official destination within the reviewed campus sources and rejects unknown identifiers',()=>{
  expect(new Set(UNIVERSITY_CENTERS.map(c=>c.id)).size).toBe(UNIVERSITY_CENTERS.length);
  for(const center of UNIVERSITY_CENTERS){
    const url=new URL(officialCenterUrl(center.id));
    expect(url.protocol).toBe('https:');expect(url.hostname.endsWith('.ac.kr')).toBe(true);
    expect(url.username+url.password).toBe('');
  }
  expect(()=>officialCenterUrl('https://example.com')).toThrow();
});
it('recovers from no search matches without claiming the school has no center',()=>{
  render(<UniversityCenters/>);
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'목록에없는학교'}});
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  expect(screen.getByText(/해당 학교에 센터가 없다고 판단하지 않습니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'전체 확인 목록 보기'}));
  expect(screen.getAllByRole('article')).toHaveLength(6);
});
it('opens a native external browser with exactly the reviewed URL and no app credentials',async()=>{
  platform.native=true;platform.open.mockResolvedValue(undefined);
  render(<OfficialCenterLink center={UNIVERSITY_CENTERS[0]}/>);
  fireEvent.click(screen.getByRole('link'));
  await waitFor(()=>expect(platform.open).toHaveBeenCalledWith({url:'https://spolex.snu.ac.kr/program/program05.php'}));
  expect(platform.open).toHaveBeenCalledTimes(1);
});
it('keeps the official link available after native browser opening fails',async()=>{
  platform.native=true;platform.open.mockRejectedValueOnce(Error('unavailable')).mockResolvedValueOnce(undefined);
  render(<OfficialCenterLink center={UNIVERSITY_CENTERS[0]}/>);
  fireEvent.click(screen.getByRole('link'));await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('link'));
  await waitFor(()=>expect(platform.open).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('alert')).toBeNull();
});
