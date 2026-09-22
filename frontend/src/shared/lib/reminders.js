import {Capacitor} from '@capacitor/core';
export function reminderCandidates({measurement,routine,workouts=[],hour=19,now=new Date()}){
 const notifications=[];const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(hour,0,0,0);
 if(routine)notifications.push({id:1001,title:'Synex Health',body:'오늘의 운동 루틴을 확인해 주세요.',schedule:{on:{hour,minute:0},repeats:true}});
 if(!measurement||now-new Date(measurement.measurement_date)>30*86400000)notifications.push({id:1002,title:'Synex Health',body:'최근 측정 기록을 확인하고 재측정을 계획해 주세요.',schedule:{at:tomorrow}});
 const start=new Date(now);start.setDate(start.getDate()-((start.getDay()+6)%7));start.setHours(0,0,0,0);
 const done=new Set(workouts.filter(w=>w.completed&&new Date(w.date+'T12:00:00')>=start&&new Date(w.date+'T00:00:00')<=now).map(w=>w.date)).size;
 if(routine&&routine.days_per_week-done===1)notifications.push({id:1003,title:'Synex Health',body:'이번 주 운동 목표까지 하루 남았습니다.',schedule:{at:new Date(now.getTime()+60000)}});
 return notifications;
}
export async function setReminders(enabled,context){
 if(enabled&&(!Number.isInteger(context?.hour)||context.hour<0||context.hour>23))throw Error('알림 시각은 0~23시로 입력하세요.');
 if(!Capacitor.isNativePlatform())throw Error('운동 알림은 설치된 Android/iOS 앱에서 설정할 수 있습니다.');
 const {LocalNotifications}=await import('@capacitor/local-notifications');
 if(!enabled){await LocalNotifications.cancel({notifications:[1001,1002,1003,1004].map(id=>({id}))});return;}
 const permission=await LocalNotifications.requestPermissions();if(permission.display!=='granted')throw Error('알림 권한이 허용되지 않았습니다.');
 await LocalNotifications.cancel({notifications:[1001,1002,1003,1004].map(id=>({id}))});
 await LocalNotifications.schedule({notifications:reminderCandidates(context)});
}
export async function registerPush(){
 if(!Capacitor.isNativePlatform()||import.meta.env.VITE_PUSH_CONFIGURED!=='true')throw Error('원격 푸시는 APNs/FCM 설정이 아직 연결되지 않았습니다.');
 const {PushNotifications}=await import('@capacitor/push-notifications');
 const permission=await PushNotifications.requestPermissions();if(permission.receive!=='granted')throw Error('푸시 알림 권한이 거부되었습니다.');
 // Register listeners before registration. Tokens are not logged or uploaded without consent.
 return new Promise(async(resolve,reject)=>{let success,failure;const timeout=setTimeout(()=>finish(Error('푸시 등록 시간이 초과되었습니다.')),15000);const finish=(err,value)=>{clearTimeout(timeout);success?.remove();failure?.remove();err?reject(err):resolve(value);};try{success=await PushNotifications.addListener('registration',value=>finish(null,value));failure=await PushNotifications.addListener('registrationError',()=>finish(Error('푸시 등록에 실패했습니다.')));await PushNotifications.register();}catch(e){finish(e);}});
}
