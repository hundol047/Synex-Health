import directory from '../data/universityCenters.json';

export const UNIVERSITY_CENTERS=directory.centers;
export const CENTER_SOURCES_CHECKED_ON=directory.checkedOn;
export const CENTER_KIND_LABELS={measurement:'체성분 검사 안내 확인',facility:'센터 안내 확인 · 검사 여부 문의',historical:'과거 측정 안내 · 현재 운영 확인 필요'};
export function findUniversityCenters(query='',measurementOnly=false) {
  const words=query.normalize('NFKC').trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
  return UNIVERSITY_CENTERS.filter(center=>{
    const text=[center.university,center.campus,center.region,center.center].join(' ').normalize('NFKC').toLocaleLowerCase('ko');
    return (!measurementOnly||center.kind==='measurement')&&words.every(word=>text.includes(word));
  });
}
export function officialCenterUrl(id) {
  const center=UNIVERSITY_CENTERS.find(item=>item.id===id);
  if(!center)throw Error('등록된 대학 센터 안내를 찾을 수 없습니다.');
  const url=new URL(center.url);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.ac.kr')||url.username||url.password)throw Error('공식 대학 안내 주소를 확인해 주세요.');
  return url.href;
}
