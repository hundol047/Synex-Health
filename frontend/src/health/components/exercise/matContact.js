import * as THREE from 'three';
import { exerciseShoeFloor } from './runningShoeGeometry.js';

export function supportVertices(weights, forearms) {
  const indices = [];
  for (const [vertex, influences] of weights.entries()) {
    if (influences.some(([bone, weight]) => weight > .5 && (
      bone === 12 || bone === 13 || (forearms && (bone === 3 || bone === 5))
    ))) indices.push(vertex * 3);
  }
  return indices;
}

// Level the toe support and the palm/forearm support with a single rigid
// transform. Re-evaluate the lowest vertices as the contact angle changes.
export function matAlignment(shoes, positions, supports) {
  const footZ = (shoes[0].center[2] + shoes[1].center[2]) / 2;
  let pitch = 0;
  for (let step = 0; step < 4; step++) {
    const shoeHeight = Math.min(...shoes.map(shoe => exerciseShoeFloor(shoe, pitch)));
    let armHeight = Infinity, armZ = 0;
    const cos = Math.cos(pitch), sin = Math.sin(pitch);
    for (const i of supports) {
      const y = cos * positions[i+1] - sin * positions[i+2];
      if (y < armHeight) { armHeight = y; armZ = positions[i+2]; }
    }
    const gap = armHeight - shoeHeight;
    if (!Number.isFinite(gap) || Math.abs(gap) < .0001 || step === 3)
      return {pitch, y: .003 - shoeHeight};
    pitch += Math.atan2(gap, Math.max(.4, armZ - footZ));
  }
}

export function posedShoes(anchors, rest, joints) {
  return anchors.map((shoe, i) => {
    const [ankle, toe] = i === 0 ? [11, 15] : [14, 16];
    const origin = new THREE.Vector3(...rest[ankle]), destination = new THREE.Vector3(...joints[ankle]);
    const authored = joints.boneRotations?.[i === 0 ? 10 : 11];
    const rotation = authored ? new THREE.Quaternion().fromArray(authored).normalize() : new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...rest[toe]).sub(origin).normalize(), new THREE.Vector3(...joints[toe]).sub(destination).normalize());
    return { ...shoe, center: new THREE.Vector3(...shoe.center).sub(origin).applyQuaternion(rotation).add(destination).toArray(), rotation };
  });
}
