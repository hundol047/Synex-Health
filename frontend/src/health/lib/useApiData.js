import {useCallback,useEffect,useRef,useState} from 'react';
export function useApiData(fetcher,deps=[]){
 const [state,setState]=useState({loading:true,error:null,data:null}),generation=useRef(0);
 const load=useCallback(async()=>{const id=++generation.current;setState(s=>({...s,loading:true,error:null}));try{const data=await fetcher();if(id===generation.current)setState({loading:false,error:null,data});return data;}catch(error){if(id===generation.current)setState({loading:false,error,data:null});}},deps);
 useEffect(()=>{load();return()=>{generation.current++;};},[load]);
 return {...state,reload:load};
}
