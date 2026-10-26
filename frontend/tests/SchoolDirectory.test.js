import {it,expect} from 'vitest';
import {filterSchools} from '../src/health/lib/schoolDirectory.js';
import schools from '../src/shared/lib/localSchools.json';
import {UNIVERSITY_CENTERS} from '../src/health/lib/universityCenters.js';
it('searches abbreviated university names and multiple terms without hiding other regions',()=>{
 expect(filterSchools(schools,'고려대 서울').map(s=>s.id)).toContain('korea-seoul');
 expect(filterSchools(schools,'연세대 원주').map(s=>s.id)).toEqual(['yonsei-mirae']);
 expect(filterSchools(schools,'','부산').some(s=>s.id==='pusan')).toBe(true);
 expect(filterSchools(schools,'')).toHaveLength(schools.length);
});
it('links every confirmed facility to a selectable school and keeps integration disconnected',()=>{
 expect(new Set(schools.map(s=>s.id)).size).toBe(schools.length);
 for(const c of UNIVERSITY_CENTERS)expect(schools.some(s=>s.id===c.schoolId),c.id).toBe(true);
 for(const s of schools)expect(s.integration_status).toBe('not_connected');
 const ids=new Set(UNIVERSITY_CENTERS.map(c=>c.schoolId));
 expect(filterSchools(schools,'','',true,ids).length).toBe(ids.size);
});
