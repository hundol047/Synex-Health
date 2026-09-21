import {vi,it,expect,beforeEach} from 'vitest';
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'}}));
vi.mock('../src/shared/lib/api.js',()=>({api:vi.fn()}));
vi.mock('@revenuecat/purchases-capacitor',()=>({Purchases:{configure:vi.fn(),logIn:vi.fn(),restorePurchases:vi.fn(),purchasePackage:vi.fn(),getOfferings:vi.fn()}}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();vi.stubEnv('VITE_REVENUECAT_IOS_KEY','public-test-key');});
it('does not configure a payment SDK for demo or disabled mode',async()=>{
 const {purchaseSDK}=await import('../src/shared/lib/subscriptions.js');
 await expect(purchaseSDK({mode:'demo'})).rejects.toThrow();
 const {Purchases}=await import('@revenuecat/purchases-capacitor');expect(Purchases.configure).not.toHaveBeenCalled();
});
it('switches SDK identity when the authenticated account changes',async()=>{
 const {purchaseSDK}=await import('../src/shared/lib/subscriptions.js');
 await purchaseSDK({mode:'revenuecat',customer_id:'opaque-A'});
 await purchaseSDK({mode:'revenuecat',customer_id:'opaque-B'});
 const {Purchases}=await import('@revenuecat/purchases-capacitor');
 expect(Purchases.configure).toHaveBeenCalledWith({apiKey:'public-test-key',appUserID:'opaque-A'});
 expect(Purchases.logIn).toHaveBeenCalledWith({appUserID:'opaque-B'});
});
it('uses server verification after restore instead of trusting SDK entitlement',async()=>{
 const {restore}=await import('../src/shared/lib/subscriptions.js');
 const {api}=await import('../src/shared/lib/api.js');api.mockResolvedValue({active:false});
 const {Purchases}=await import('@revenuecat/purchases-capacitor');Purchases.restorePurchases.mockResolvedValue({customerInfo:{entitlements:{active:{plus:{}}}}});
 expect(await restore({mode:'revenuecat',customer_id:'opaque-A'})).toEqual({active:false});
 expect(api).toHaveBeenCalledWith('/api/billing/sync',{});
});
