import {clearOffline} from './offline.js';
import {Capacitor} from '@capacitor/core';
import {setAccessToken} from './session.js';
import {logoutPurchases} from './subscriptions.js';
export async function clearLocalAccount(){
 await clearOffline();
 setAccessToken('');
 for(const storage of [localStorage,sessionStorage])for(const key of Object.keys(storage))if(key.startsWith('synex'))storage.removeItem(key);
 await logoutPurchases().catch(()=>{});
 if(Capacitor.isNativePlatform()){
  const {LocalNotifications}=await import('@capacitor/local-notifications');await LocalNotifications.cancel({notifications:[1001,1002,1003,1004].map(id=>({id}))}).catch(()=>{});
  const {PushNotifications}=await import('@capacitor/push-notifications');await PushNotifications.unregister().catch(()=>{});
 }
 window.dispatchEvent(new Event('synex-session-expired'));
}
