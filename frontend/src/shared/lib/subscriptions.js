import { Capacitor } from '@capacitor/core';
import { api } from './api.js';
let configuredUser;
export const billingSDKStatus=()=>configuredUser?'configured — purchase verification separate':'not configured';
export const BillingAPI = {
  plans: () => api('/api/billing/plans'),
  status: () => api('/api/billing/subscription'),
  sync: () => api('/api/billing/sync', {}),
  demo: action => api('/api/billing/demo', {action}),
  report: month => api(`/api/billing/report?month=${encodeURIComponent(month)}`),
};
export async function purchaseSDK(status) {
  if(import.meta.env.VITE_LAUNCH_MODE==='free')throw new Error('현재 무료 출시 모드입니다.');
  if (!Capacitor.isNativePlatform() || status.mode !== 'revenuecat' || !status.customer_id) throw new Error('스토어 결제가 연결된 Android 또는 iOS 앱에서 이용해 주세요.');
  const key = Capacitor.getPlatform() === 'ios' ? import.meta.env.VITE_REVENUECAT_IOS_KEY : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
  if (!key) throw new Error('스토어 결제 연결을 준비 중입니다.');
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  if (!configuredUser) await Purchases.configure({apiKey:key, appUserID:status.customer_id});
  else if (configuredUser !== status.customer_id) await Purchases.logIn({appUserID:status.customer_id});
  configuredUser = status.customer_id;
  return Purchases;
}
export function purchaseReady(status){
 const key=Capacitor.getPlatform()==='ios'?import.meta.env.VITE_REVENUECAT_IOS_KEY:import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
 return !!(key&&status?.purchase_config?.ready&&status.purchase_config.apple_product_id&&status.purchase_config.google_product_id&&status.purchase_config.entitlement_id);
}
export async function storePackages(status) {
  if(!purchaseReady(status))return [];
  const sdk = await purchaseSDK(status);
  const offerings = await sdk.getOfferings();
  return (offerings.current?.availablePackages || []).filter(p => ['MONTHLY','ANNUAL'].includes(p.packageType)&&p.product.identifier===(Capacitor.getPlatform()==='ios'?status.purchase_config.apple_product_id:status.purchase_config.google_product_id));
}
export async function buyPackage(status, selected) {
  if(!purchaseReady(status))throw Error('결제 상품과 권한 설정이 필요합니다.');
  const expected=Capacitor.getPlatform()==='ios'?status.purchase_config.apple_product_id:status.purchase_config.google_product_id;
  if(selected?.product?.identifier!==expected)throw Error('등록되지 않은 상품입니다.');
  const sdk = await purchaseSDK(status);
  await sdk.purchasePackage({aPackage:selected});
  return BillingAPI.sync();
}
export async function restore(status) {
  const sdk = await purchaseSDK(status);
  await sdk.restorePurchases();
  return BillingAPI.sync();
}
export function manageURL(store) {
  if (store === 'app_store' || store === 'mac_app_store') return 'https://apps.apple.com/account/subscriptions';
  if (store === 'play_store') return 'https://play.google.com/store/account/subscriptions';
  return null;
}
export async function logoutPurchases(){
 if(!configuredUser)return;
 try {const {Purchases}=await import('@revenuecat/purchases-capacitor');await Purchases.logOut();}
 finally {configuredUser=undefined;}
}
