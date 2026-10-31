// Picks a render tier for the browser 3D scenes. DLSS-class upscaling is not
// reachable from WebGL, so "high" instead spends spare GPU budget on native
// resolution, MSAA, ambient occlusion and a supersampled frame once the scene
// settles. Weak or software GPUs keep the original lightweight path.
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render|mesa offscreen/i;

const TIERS = new Set(['low', 'medium', 'high']);

// QA/support override: localStorage 'synex-render-quality' = low | medium | high.
export function forcedRenderQuality(env = globalThis) {
  try { const tier = env?.localStorage?.getItem('synex-render-quality'); return TIERS.has(tier) ? tier : null; } catch { return null; }
}

export function detectRenderQuality(env = globalThis) {
  const forced = forcedRenderQuality(env);
  if (forced) return forced;
  const nav = env?.navigator || {};
  const memory = nav.deviceMemory ?? 8, cores = nav.hardwareConcurrency ?? 4;
  const mobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '');
  if (nav.connection?.saveData || memory <= 2 || cores <= 2) return 'low';
  if (mobile || memory < 6 || cores < 6) return 'medium';
  return 'high';
}

// The UA heuristics cannot see the GPU, so the live renderer string can only lower the tier.
export function refineRenderQuality(tier, rendererName = '') {
  return SOFTWARE_GPU.test(rendererName) ? 'low' : tier;
}

export function renderSettings(tier, { compact = false, devicePixelRatio = 1 } = {}) {
  const dprCap = Math.min(2, Math.max(1, devicePixelRatio));
  if (tier === 'high') return { dpr: [1, dprCap], shadowMap: 2048, msaa: 4, ao: true, refineSamples: 3, powerPreference: 'high-performance' };
  if (tier === 'medium') return { dpr: [1, compact ? Math.min(1.5, dprCap) : dprCap], shadowMap: 1024, msaa: 0, ao: false, refineSamples: compact ? 0 : 2, powerPreference: 'default' };
  return { dpr: [1, compact ? 1 : 1.25], shadowMap: 512, msaa: 0, ao: false, refineSamples: 0, powerPreference: 'low-power' };
}

export const usesQualityPipeline = settings => settings.ao || settings.refineSamples > 0;
