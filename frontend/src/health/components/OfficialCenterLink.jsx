import React,{useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {officialCenterUrl} from '../lib/universityCenters.js';

export default function OfficialCenterLink({center}) {
  const [error,setError]=useState('');
  const url=officialCenterUrl(center.id);
  async function open(event) {
    if(!Capacitor.isNativePlatform())return;
    event.preventDefault();setError('');
    try {
      const {Browser}=await import('@capacitor/browser');
      // Use the system browser, without account IDs, health data or app tokens.
      await Browser.open({url});
    } catch {setError('공식 안내를 열지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.');}
  }
  return <><a className="btn btn-ghost" href={url} target="_blank" rel="noopener noreferrer" onClick={open} aria-label={`${center.university} ${center.campus} ${center.center} 공식 안내 열기`}>공식 안내 열기 ↗</a>{error&&<p role="alert">{error}</p>}</>;
}
