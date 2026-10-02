import {useEffect,useRef,useState,useCallback} from 'react';
import {loadDraft,saveDraft,removeDraft,offlineEpoch} from '../../shared/lib/offline.js';
import {registerDraftNavigation} from '../../shared/lib/draftNavigation.js';
export function useWorkoutDraft(scope,value,dirty,onRestore){
 const [savedEncoded,setSavedEncoded]=useState('');
 const [ready,setReady]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const restore=useRef(onRestore);restore.current=onRestore;
 const token=useRef(null),chain=useRef(Promise.resolve()),last=useRef(''),blocked=useRef(false),skip=useRef(false),identity=useRef(Symbol());
 const encoded=JSON.stringify(value),currentValue=useRef('');currentValue.current=encoded;
 useEffect(()=>{let alive=true;const epoch=offlineEpoch();loadDraft(scope).then(saved=>{
  if(!alive||epoch!==offlineEpoch())return;
  if(saved){token.current=saved.token;last.current=JSON.stringify(saved.value);setSavedEncoded(last.current);restore.current(saved.value);setStatus('이전에 입력하던 운동을 복구했습니다.');}
  setReady(true);
 }).catch(e=>{if(alive){blocked.current=true;setError(e.message);setReady(true);}});return()=>{alive=false;};},[scope]);
 useEffect(()=>{
  if(!ready||!dirty||blocked.current||skip.current||encoded===last.current)return;
  last.current=encoded;setStatus('기기에 임시 저장 중…');const epoch=offlineEpoch();
  chain.current=chain.current.then(async()=>{
   if(blocked.current||epoch!==offlineEpoch())return;
   try{token.current=await saveDraft(scope,JSON.parse(encoded),token.current);setError('');setSavedEncoded(encoded);if(last.current===encoded)setStatus('기기에 임시 저장됨');}
   catch(e){blocked.current=true;setError(e.message);throw e;}
  });chain.current.catch(()=>{});
 },[scope,encoded,dirty,ready]);
 const flush=useCallback(()=>blocked.current?Promise.reject(Error('임시 저장에 실패했습니다. 입력을 확인하세요.')):chain.current,[scope]);
 useEffect(()=>registerDraftNavigation(identity.current,dirty,flush),[dirty,flush]);
 async function clear(){skip.current=true;try{await chain.current.catch(()=>{});await removeDraft(scope,token.current);token.current=null;last.current=currentValue.current;blocked.current=false;chain.current=Promise.resolve();setStatus('');setError('');}finally{skip.current=false;}}
 return {ready,status:ready&&dirty&&!error&&encoded!==savedEncoded?'기기에 임시 저장 중…':status,error,flush,clear};
}
