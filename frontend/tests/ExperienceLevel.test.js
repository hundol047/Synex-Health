import {describe,it,expect} from 'vitest';
import {deriveExperienceLevel,validExperienceDetail} from '../src/health/lib/exerciseProfileOptions.js';
// Same cases as backend test_experience_level_derived_from_detail.
describe('experience level from detailed indicators',()=>{
 const level=(training_history,weekly_sessions)=>deriveExperienceLevel({training_history,weekly_sessions});
 it('matches the backend rules',()=>{
  expect(level('gt2y','3_4')).toBe('ADVANCED');
  expect(level('6m_2y','3_4')).toBe('INTERMEDIATE');
  expect(level('lt6m','0')).toBe('BEGINNER');
  expect(level('none','5plus')).toBe('BEGINNER');
  expect(level('lt6m','5plus')).toBe('INTERMEDIATE');
  expect(deriveExperienceLevel({weekly_sessions:'0'})).toBeNull();
 });
 it('rejects removed or unknown answers',()=>{
  expect(validExperienceDetail({pushups:'lt5'})).toBe(false);
  expect(validExperienceDetail({weekly_sessions:'9'})).toBe(false);
  expect(validExperienceDetail(null)).toBe(true);
 });
});
