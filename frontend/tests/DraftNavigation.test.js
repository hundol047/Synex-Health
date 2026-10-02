import {it,expect} from 'vitest';
import {registerDraftNavigation,hasDraftChangesForPath} from '../src/shared/lib/draftNavigation.js';
it('ignores old route drafts during a lazy route transition without losing the draft guard',()=>{
 const remove=registerDraftNavigation('old-workout',true,async()=>{},undefined,'/health/workout');
 try{
  expect(hasDraftChangesForPath('/health/workout')).toBe(true);
  expect(hasDraftChangesForPath('/health/profile')).toBe(false);
  const removeProfile=registerDraftNavigation('profile',true,async()=>{},undefined,'/health/profile');
  expect(hasDraftChangesForPath('/health/profile')).toBe(true);
  removeProfile();
  expect(hasDraftChangesForPath('/health/profile')).toBe(false);
  expect(hasDraftChangesForPath('/health/workout')).toBe(true);
 }finally{remove();}
});
