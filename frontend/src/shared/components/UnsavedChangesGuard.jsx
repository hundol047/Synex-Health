import React,{useEffect,useSyncExternalStore} from 'react';
import {useBlocker} from 'react-router-dom';
import {navigationPrompt,hasDraftChanges,subscribeDraftNavigation,flushDraftChanges} from '../lib/draftNavigation.js';
export default function UnsavedChangesGuard(){
 const dirty=useSyncExternalStore(subscribeDraftNavigation,hasDraftChanges,()=>false);
 const blocker=useBlocker(({currentLocation,nextLocation})=>dirty&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search));
 useEffect(()=>{
  if(blocker.state!=='blocked')return;
  if(!window.confirm(navigationPrompt())){blocker.reset();return;}
  flushDraftChanges().then(()=>blocker.proceed()).catch(()=>{window.alert('임시 저장에 실패해 이동을 멈췄습니다. 입력을 먼저 확인하세요.');blocker.reset();});
 },[blocker]);
 useEffect(()=>{if(!dirty)return;const before=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty]);
 return null;
}
