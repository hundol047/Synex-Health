import {Capacitor} from '@capacitor/core';
export const HEALTH_TYPES=['steps','distance','activeEnergy','workouts','heartRate','restingHeartRate','sleep','weight'];
const nativeType=t=>t==='activeEnergy'?'calories':t;
export async function healthAvailability(){
 const provider=Capacitor.getPlatform()==='ios'?'HealthKit':'Health Connect';
 if(!Capacitor.isNativePlatform())return {available:false,status:'unsupported',provider};
 const {Health}=await import('@capgo/capacitor-health');
 return {...await Health.isAvailable(),provider};
}
export async function readDeviceHealth(types,start,end){
 if(!types.length||types.some(t=>!HEALTH_TYPES.includes(t)))throw Error('가져올 건강 항목을 선택하세요.');
 const availability=await healthAvailability();if(!availability.available)throw Error('이 기기에서 건강 데이터를 사용할 수 없습니다.');
 const {Health}=await import('@capgo/capacitor-health');
 const requested=types.map(nativeType);
 const authorization=await Health.requestAuthorization({read:requested,write:[]});
 // HealthKit deliberately does not disclose read denial; an empty result is not proof of authorization.
 const allowed=Capacitor.getPlatform()==='ios'?requested:requested.filter(t=>authorization.readAuthorized.includes(t));
 const samples=[];
 for(const dataType of allowed){
  if(dataType==='workouts'){const r=await Health.queryWorkouts({startDate:start,endDate:end,limit:100});samples.push(...r.workouts.map(s=>({...s,type:'workouts'})));}
  else {const r=await Health.readSamples({dataType,startDate:start,endDate:end,limit:100});samples.push(...r.samples.map(s=>({...s,type:dataType==='calories'?'activeEnergy':dataType})));}
 }
 return {samples:samples.filter(s=>types.includes(s.type)&&Number.isFinite(Date.parse(s.startDate))),status:samples.length?'read_complete':'no_data_or_permission',truncated:true};
}
