import { matAlignment, posedShoes } from './matContact.js';
import { bodyweightPoseJoints } from './bodyweightRig.js';
import { deformSurface } from './rig.js';

// The authored joints live inside the skin. A level elbow-to-wrist bone does
// not guarantee a level support surface, particularly with different arm girths.
export function calibratePlankWrist(base, weights, rest, palmRoll, anchors) {
  const points = [], selectedWeights = [], palms = [], elbows = [];
  for (const [vertex, influences] of weights.entries()) {
    const palm = influences.some(([bone, w]) => (bone === 12 || bone === 13) && w > .5);
    const forearm = influences.some(([bone, w]) => (bone === 3 || bone === 5) && w > .5);
    if (!palm && !forearm) continue;
    const offset = vertex * 3;
    (palm ? palms : elbows).push(points.length);
    points.push(base[offset], base[offset + 1], base[offset + 2]);
    selectedWeights.push(influences);
  }
  if (!palms.length || !elbows.length) return 0;
  const surface = new Float32Array(points.length);
  const fit = Object.assign(rest.slice(), rest, {plankWristDrop: 0});
  const shoes = posedShoes(anchors, rest, bodyweightPoseJoints("plank",0,rest));
  for (let step = 0; step < 8; step++) {
    const pose = bodyweightPoseJoints('plank', 0, fit);
    pose.handRoll = palmRoll;
    deformSurface(points, selectedWeights, pose, surface, fit, false);
    const {pitch} = matAlignment(shoes, surface, elbows);
    const height = i => surface[i+1]*Math.cos(pitch) - surface[i+2]*Math.sin(pitch);
    let palmY = Infinity, elbowY = Infinity;
    for (const y of palms) palmY = Math.min(palmY, height(y));
    for (const y of elbows) elbowY = Math.min(elbowY, height(y));
    const gap = palmY - elbowY;
    if (Math.abs(gap) < .0005) break;
    fit.plankWristDrop = Math.max(-.02, Math.min(.12, fit.plankWristDrop + gap));
  }
  return fit.plankWristDrop;
}
