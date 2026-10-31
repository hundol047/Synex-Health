import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Delay before the settled scene is re-rendered with jittered supersampling.
export const REFINE_DELAY_MS = 160;

const cutoutOrTransparent = material => material && (material.alphaTest > 0 || material.transparent);

// GTAO's normal pass ignores alphaTest, so hair cards would occlude as solid
// quads and stamp dark rectangles over the face. Hair, face overlays, the
// contact shadow and other see-through meshes therefore stay out of the AO
// G-buffer; the AO comes from the opaque head and body beneath them.
// Meshes tagged userData.noAO (the 30 m studio floor, whose grazing far depth
// greys out the horizon) are skipped too; ContactShadows grounds the feet.
class SurfaceGTAOPass extends GTAOPass {
  _overrideVisibility() {
    super._overrideVisibility();
    const cache = this._visibilityCache;
    this.scene.traverse(object => {
      if (object.isMesh && object.visible && (object.userData.noAO || [].concat(object.material).some(cutoutOrTransparent))) { object.visible = false; cache.push(object); }
    });
  }
}

// three only tone maps (and fogs after tone mapping) when drawing to the
// canvas. Rendering the scene into a linear target and tone mapping in
// OutputPass therefore shifts every fogged pixel (the studio floor turned flat
// grey), and blending the eye layers in linear space greys the iris. Marking
// the targets display-referred makes materials tone map and sRGB-encode exactly
// as on the canvas, so blending matches and OutputPass becomes a plain copy.
function displayReferred(target) {
  target.isXRRenderTarget = true;
  target.texture.colorSpace = THREE.SRGBColorSpace;
  return target;
}

class DisplayOutputPass extends OutputPass {
  render(renderer, ...rest) {
    const { toneMapping, outputColorSpace } = renderer;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    try { super.render(renderer, ...rest); } finally { renderer.toneMapping = toneMapping; renderer.outputColorSpace = outputColorSpace; }
  }
}

export default function QualityPipeline({ settings, portrait = false }) {
  const { gl, scene, camera, size, viewport, invalidate } = useThree();
  const refine = useRef({ pending: false, timer: 0 });
  const pipeline = useMemo(() => {
    const target = displayReferred(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: settings.msaa }));
    const composer = new EffectComposer(gl, target);
    displayReferred(composer.renderTarget2);
    const base = new RenderPass(scene, camera);
    const supersample = new SSAARenderPass(scene, camera);
    supersample.sampleLevel = settings.refineSamples;
    // Created eagerly (the pass would lazily make a scene-referred, single-sample
    // one; without MSAA, alpha-to-coverage hair edges leave a bright fringe).
    supersample._sampleRenderTarget = displayReferred(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: settings.msaa }));
    supersample.enabled = false;
    composer.addPass(base);
    composer.addPass(supersample);
    if (settings.ao) {
      const ao = new SurfaceGTAOPass(scene, camera, 1, 1);
      // Metric scene: a tight radius keeps close-up AO in creases (eyes, nostrils, ears) instead of haloing the head.
      ao.blendIntensity = portrait ? .55 : .7;
      ao.updateGtaoMaterial({ radius: portrait ? .05 : .2, distanceExponent: 1.5, thickness: portrait ? .03 : .2, scale: 1, samples: 16 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      composer.addPass(ao);
    }
    composer.addPass(new DisplayOutputPass());
    return { composer, base, supersample, target };
  }, [gl, scene, camera, settings, portrait]);

  useEffect(() => {
    pipeline.composer.setPixelRatio(viewport.dpr);
    pipeline.composer.setSize(size.width, size.height);
    invalidate();
  }, [pipeline, size.width, size.height, viewport.dpr, invalidate]);

  useEffect(() => {
    const state = refine.current;
    return () => {
      clearTimeout(state.timer);
      for (const pass of pipeline.composer.passes) pass.dispose?.();
      pipeline.composer.dispose();
      pipeline.target.dispose();
    };
  }, [pipeline]);

  // Priority 1 hands rendering to the composer. Interactive frames stay cheap;
  // once nothing has invalidated for REFINE_DELAY_MS the still frame is
  // replaced by a 2^refineSamples jittered average.
  useFrame((_, delta) => {
    const state = refine.current, refining = state.pending && settings.refineSamples > 0;
    state.pending = false;
    clearTimeout(state.timer);
    pipeline.base.enabled = !refining;
    pipeline.supersample.enabled = refining;
    pipeline.composer.render(delta);
    if (!refining && settings.refineSamples > 0) state.timer = setTimeout(() => { state.pending = true; invalidate(); }, REFINE_DELAY_MS);
  }, 1);

  return null;
}
