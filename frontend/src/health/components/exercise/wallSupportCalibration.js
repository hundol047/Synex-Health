import { calibratePalmRoll, deformSurface } from './rig.js';
import { standingCatalogPose } from './standingCatalogRig.js';

export const WALL_SUPPORTED_MOTIONS = Object.freeze([
  'wall_push', 'close_wall_push', 'calf_stretch', 'wall_hinge', 'wall_sit',
]);

/** A stationary wall contact face fitted to the actual clothed surface. */
export function calibrateWallSupport(base, weights, rest) {
  const contact = { palmRoll: calibratePalmRoll(base, weights, rest) };
  const uncalibratedRest = rest.map(joint => joint.slice());
  uncalibratedRest.wallSupport = { palmRoll: contact.palmRoll };
  // The pose envelope has a flat maximum, but intermediate arm blending also
  // matters. Fit the complete cycle once per avatar, never once per frame.
  for (const motion of WALL_SUPPORTED_MOTIONS) {
    let fitted;
    Object.defineProperty(contact, motion, { enumerable: true, get() {
      if (fitted) return fitted;
      const posed = new Float32Array(base.length);
      const rear = motion === 'wall_hinge' || motion === 'wall_sit';
      let extreme = rear ? Infinity : -Infinity;
      for (let frame = 0; frame <= 32; frame++) {
        const joints = standingCatalogPose(motion, frame / 32, uncalibratedRest);
        deformSurface(base, weights, joints, posed, uncalibratedRest, false);
        for (let index = 2; index < posed.length; index += 3) {
          extreme = rear ? Math.min(extreme, posed[index]) : Math.max(extreme, posed[index]);
        }
      }
      // A millimetre of clearance prevents coplanar shimmer while retaining
      // visible contact. Feet and toes are included in the same surface fit.
      fitted = { surfaceZ: extreme + (rear ? -.001 : .001) };
      return fitted;
    } });
  }
  return contact;
}
