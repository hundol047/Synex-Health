import React,{useEffect,useSyncExternalStore} from 'react';
import {useBlocker,useLocation} from 'react-router-dom';
import {navigationPrompt,hasDraftChangesForPath,subscribeDraftNavigation,flushDraftChanges} from '../lib/draftNavigation.js';
export default function UnsavedChangesGuard(){
 const {pathname}=useLocation();
 const dirty=useSyncExternalStore(subscribeDraftNavigation,()=>hasDraftChangesForPath(pathname),()=>false);
 const blocker=useBlocker(({currentLocation,nextLocation})=>dirty&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search));
 useEffect(()=>{
  if(blocker.state!=='blocked')return;
  if(!window.confirm(navigationPrompt(pathname))){blocker.reset();return;}
  flushDraftChanges(pathname).then(()=>blocker.proceed()).catch(()=>{window.alert('임시 저장에 실패해 이동을 멈췄습니다. 입력을 먼저 확인하세요.');blocker.reset();});
 },[blocker,pathname]);
 useEffect(()=>{if(!dirty)return;const before=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty]);
 return null;
}
