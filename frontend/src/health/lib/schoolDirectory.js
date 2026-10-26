const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('ko').replace(/대학교|대학/g,'대').replace(/\s+/g,'');
export function filterSchools(schools,query='',region='',centerOnly=false,centerSchoolIds=new Set()){
 const words=query.trim().split(/\s+/).filter(Boolean).map(normalize);
 return schools.filter(s=>(!region||s.region.includes(region))&&(!centerOnly||centerSchoolIds.has(s.id))&&words.every(word=>normalize(`${s.name} ${s.region}`).includes(word))).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
