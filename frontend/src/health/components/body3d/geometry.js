// Procedural human-silhouette geometry for the 3D Body Map.
//
// The product brief explicitly forbids a "robot/mannequin assembled from spheres, cylinders and
// capsules" and asks for adult-human proportions. We do not have a licensed, pre-rigged human GLB
// asset available in this environment to verify and ship (see docs/BODY_3D.md), so instead of
// bolting primitives together we loft a smooth, continuously-varying cross-section along a curved
// spine per limb -- the same technique 3D character modeling uses for a body silhouette, just
// without sculpted musculature. Each segment (LEFT_ARM/RIGHT_ARM/TRUNK/LEFT_LEG/RIGHT_LEG) is its
// own BufferGeometry so material/color can be controlled independently per data segment.
//
// This keeps the implementation self-contained (no external asset licensing risk) while looking
// like a tapered human limb/torso rather than a uniform tube. docs/BODY_3D.md documents how to swap
// this for a licensed GLB later without changing the segment-group contract components downstream
// rely on (group.name === one of the five Segment enum values).
import * as THREE from 'three';

/** Builds a tapered, curved tube along `curvePoints` with a per-t radius function. Uses Frenet
 * frames so the cross-section stays correctly oriented through bends (elbow/knee). */
export function loftTube(curvePoints, radiusFn, { radialSegments = 14, heightSegments = 24, capStart = true, capEnd = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(curvePoints.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(heightSegments, false);
  const positions = [];
  const normals = [];
  const indices = [];
  const ringVertexCount = radialSegments + 1;

  for (let i = 0; i <= heightSegments; i++) {
    const t = i / heightSegments;
    const center = curve.getPointAt(t);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    const r = radiusFn(t);
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cx = Math.cos(theta) * r;
      const cy = Math.sin(theta) * r;
      const offset = new THREE.Vector3()
        .addScaledVector(normal, cx)
        .addScaledVector(binormal, cy);
      const vertex = center.clone().add(offset);
      positions.push(vertex.x, vertex.y, vertex.z);
      const n = offset.clone().normalize();
      normals.push(n.x, n.y, n.z);
    }
  }

  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringVertexCount + j;
      const b = (i + 1) * ringVertexCount + j;
      const c = (i + 1) * ringVertexCount + (j + 1);
      const d = i * ringVertexCount + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  // End caps -- simple triangle fans so limbs don't look hollow at the shoulder/hip/wrist/ankle.
  const capFan = (ringStart, center, flip) => {
    const centerIndex = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    normals.push(0, flip ? 1 : -1, 0);
    for (let j = 0; j < radialSegments; j++) {
      const a = ringStart + j;
      const b = ringStart + j + 1;
      if (flip) indices.push(centerIndex, a, b);
      else indices.push(centerIndex, b, a);
    }
  };
  if (capStart) capFan(0, curve.getPointAt(0), false);
  if (capEnd) capFan(heightSegments * ringVertexCount, curve.getPointAt(1), true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Elliptical loft for the trunk (chest/waist/hip silhouette is visibly wider than deep). */
export function loftEllipticalTube(curvePoints, rxFn, rzFn, { radialSegments = 20, heightSegments = 20 } = {}) {
  const curve = new THREE.CatmullRomCurve3(curvePoints.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(heightSegments, false);
  const positions = [];
  const normals = [];
  const indices = [];
  const ringVertexCount = radialSegments + 1;

  for (let i = 0; i <= heightSegments; i++) {
    const t = i / heightSegments;
    const center = curve.getPointAt(t);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    const rx = rxFn(t);
    const rz = rzFn(t);
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cx = Math.cos(theta) * rx;
      const cy = Math.sin(theta) * rz;
      const offset = new THREE.Vector3(cx, 0, cy);
      const vertex = center.clone().add(offset);
      positions.push(vertex.x, vertex.y, vertex.z);
      const n = offset.clone().normalize();
      normals.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringVertexCount + j;
      const b = (i + 1) * ringVertexCount + j;
      const c = (i + 1) * ringVertexCount + (j + 1);
      const d = i * ringVertexCount + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }
  const capFan = (ringStart, center, flip) => {
    const centerIndex = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    normals.push(0, flip ? 1 : -1, 0);
    for (let j = 0; j < radialSegments; j++) {
      const a = ringStart + j;
      const b = ringStart + j + 1;
      if (flip) indices.push(centerIndex, a, b);
      else indices.push(centerIndex, b, a);
    }
  };
  capFan(0, curve.getPointAt(0), false);
  capFan(heightSegments * ringVertexCount, curve.getPointAt(1), true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Smooth taper helper: eases between control radii at given t breakpoints (e.g. shoulder -> elbow
// -> wrist) using cosine interpolation so limbs don't look faceted/linear at the joints.
export function taperProfile(stops) {
  // stops: [[t0, r0], [t1, r1], ...] sorted by t
  return (t) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const [t0, r0] = stops[i];
      const [t1, r1] = stops[i + 1];
      if (t >= t0 && t <= t1) {
        const localT = (t - t0) / (t1 - t0 || 1);
        const eased = 0.5 - 0.5 * Math.cos(localT * Math.PI);
        return r0 + (r1 - r0) * eased;
      }
    }
    return stops[stops.length - 1][1];
  };
}
