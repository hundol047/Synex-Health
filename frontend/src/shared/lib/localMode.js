// A separate personal APK build. Never a fallback for failed server authentication.
export const LOCAL_ONLY = import.meta.env.VITE_LOCAL_ONLY === 'true' && import.meta.env.VITE_RELEASE_BUILD !== 'true';
export const LOCAL_ACCOUNT = 'device-owner';
export const LOCAL_NAMESPACE = 'synex-device-only-v1';
