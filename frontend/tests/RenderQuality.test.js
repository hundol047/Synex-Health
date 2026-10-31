import { describe, expect, it } from 'vitest';
import { detectRenderQuality, refineRenderQuality, renderSettings, usesQualityPipeline } from '../src/health/components/exercise/renderQuality.js';

const env = navigator => ({ navigator });

describe('render quality tiers', () => {
  it('reserves the full pipeline for capable desktops', () => {
    expect(detectRenderQuality(env({ deviceMemory: 8, hardwareConcurrency: 12, userAgent: 'Windows NT 10.0' }))).toBe('high');
    expect(detectRenderQuality(env({ deviceMemory: 8, hardwareConcurrency: 8, userAgent: 'Mozilla/5.0 (Linux; Android 15) Mobile' }))).toBe('medium');
    expect(detectRenderQuality(env({ deviceMemory: 2, hardwareConcurrency: 8 }))).toBe('low');
    expect(detectRenderQuality(env({ deviceMemory: 16, hardwareConcurrency: 16, connection: { saveData: true } }))).toBe('low');
  });

  it('drops software renderers to the lightweight path but never raises a tier', () => {
    expect(refineRenderQuality('high', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))')).toBe('low');
    expect(refineRenderQuality('medium', 'ANGLE (NVIDIA GeForce RTX 4070)')).toBe('medium');
  });

  it('keeps low-tier and compact mobile scenes off the post-processing pipeline', () => {
    const high = renderSettings('high', { devicePixelRatio: 3 });
    expect(high).toMatchObject({ dpr: [1, 2], msaa: 4, ao: true, shadowMap: 2048 });
    expect(usesQualityPipeline(high)).toBe(true);
    expect(usesQualityPipeline(renderSettings('medium', { compact: true, devicePixelRatio: 3 }))).toBe(false);
    expect(usesQualityPipeline(renderSettings('low'))).toBe(false);
  });
});
