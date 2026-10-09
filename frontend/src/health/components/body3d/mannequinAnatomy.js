// Composition-only surface mathematics. The shared CC0 mesh and exercise rig
// remain unchanged; anatomical masks are bound to its actual rest positions.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const bell = (value, center, width) => Math.exp(-(((value - center) / width) ** 2));

// Intersect every triangle. Stored segment labels are useful for selection but
// are not a valid way to remove arms: some shoulder/hip vertices share those
// labels. Removing them cuts an open torso and underestimates its perimeter.
export function sectionLoops(positions, indices, height) {
  const nodes = new Map(), segments = new Set(), plane = height + 1e-8;
  const node = point => {
    const key = `${point[0].toFixed(7)},${point[1].toFixed(7)}`;
    if (!nodes.has(key)) nodes.set(key, { point, neighbours: new Set() });
    return key;
  };
  for (let i = 0; i < indices.length; i += 3) {
    const hits = [];
    for (let edge = 0; edge < 3; edge++) {
      const a = indices[i + edge] * 3, b = indices[i + (edge + 1) % 3] * 3;
      const ay = positions[a + 1] - plane, by = positions[b + 1] - plane;
      if ((ay < 0 && by >= 0) || (by < 0 && ay >= 0)) {
        const t = ay / (ay - by);
        hits.push([positions[a] + t * (positions[b] - positions[a]), positions[a + 2] + t * (positions[b + 2] - positions[a + 2])]);
      }
    }
    if (hits.length !== 2) continue;
    const a = node(hits[0]), b = node(hits[1]);
    if (a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (segments.has(key)) continue;
    segments.add(key); nodes.get(a).neighbours.add(b); nodes.get(b).neighbours.add(a);
  }
  const seen = new Set(), loops = [];
  for (const start of nodes.keys()) {
    if (seen.has(start)) continue;
    const component = [], pending = [start];
    while (pending.length) {
      const key = pending.pop(); if (seen.has(key)) continue;
      seen.add(key); component.push(key); pending.push(...nodes.get(key).neighbours);
    }
    if (component.length < 3 || component.some(key => nodes.get(key).neighbours.size !== 2)) continue;
    const points = [], first = component[0]; let current = first, previous;
    do {
      points.push(nodes.get(current).point);
      const next = [...nodes.get(current).neighbours].find(key => key !== previous);
      previous = current; current = next;
    } while (current !== first && points.length <= component.length);
    if (current !== first || points.length !== component.length) continue;
    let perimeter = 0, area = 0, cx = 0, cz = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], cross = a[0] * b[1] - b[0] * a[1];
      perimeter += Math.hypot(a[0] - b[0], a[1] - b[1]); area += cross;
      cx += (a[0] + b[0]) * cross; cz += (a[1] + b[1]) * cross;
    }
    if (Math.abs(area) < 1e-8) continue;
    const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
    loops.push({ points, perimeter, area: Math.abs(area) / 2, center: [cx / (3 * area), cz / (3 * area)], minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), closed: true });
  }
  return loops;
}
export function centralTorsoLoop(positions, indices, height) {
  return sectionLoops(positions, indices, height).filter(loop => loop.minX < 0 && loop.maxX > 0).sort((a, b) => b.area - a.area)[0] || null;
}

function interpolate(stops, y) {
  if (y <= stops[0][0]) return stops[0].slice(1);
  if (y >= stops.at(-1)[0]) return stops.at(-1).slice(1);
  const end = stops.findIndex(stop => stop[0] >= y), a = stops[end - 1], b = stops[end];
  const t = smooth(a[0], b[0], y);
  return a.slice(1).map((value, i) => value + (b[i + 1] - value) * t);
}
const frames = new WeakMap();
export function anatomicalFrame(base, indices) {
  if (frames.has(base)) return frames.get(base);
  const armFallback = [[.95, .54, .25], [1.06, .46, .15], [1.18, .38, .06], [1.28, .30, .025], [1.38, .245, .02], [1.47, .18, .025]];
  const legFallback = [[.1, .19, .035], [.25, .17, .035], [.4, .16, .04], [.54, .15, .045], [.68, .125, .04], [.8, .11, .035], [.92, .10, .035]];
  const limbCenters = fallback => fallback.map(([y, x, z]) => {
    const loop = sectionLoops(base, indices, y).filter(loop => loop.minX > .008).sort((a, b) => b.area - a.area)[0];
    return loop ? [y, ...loop.center] : [y, x, z];
  });
  const arms = limbCenters(armFallback), legs = limbCenters(legFallback);
  const trunk = [.91, 1.02, 1.10, 1.24, 1.34, 1.45].map(y => [y, centralTorsoLoop(base, indices, y)?.center[1] ?? .035]);
  const frame = { at(x, y, z) {
    const armBoundary = interpolate([[.70, .30], [.86, .32], [1.04, .31], [1.20, .265], [1.34, .205], [1.46, .14], [1.56, .11]], y)[0];
    const arm = smooth(armBoundary - .025, armBoundary + .025, Math.abs(x)) * smooth(.60, .78, y) * (1 - smooth(1.47, 1.57, y));
    const leg = (1 - smooth(.78, .96, y)) * (1 - arm);
    const torso = Math.max(0, 1 - arm - leg) * (1 - smooth(1.44, 1.57, y));
    const [ax, az] = interpolate(arms, y), [lx, lz] = interpolate(legs, y);
    // Blend the two leg centers across the groin. A sign(x) jump would pinch
    // neighboring central pelvis vertices toward opposite limb origins.
    const side = 2 * smooth(-.035, .035, x) - 1;
    const centerX = side * (ax * arm + lx * leg), centerZ = az * arm + lz * leg + interpolate(trunk, y)[0] * (1 - arm - leg);
    const armSoft = smooth(1.04, 1.15, y) * (1 - smooth(.405, .47, Math.abs(x)));
    const legSoft = smooth(.14, .24, y);
    const knee = 1 - .94 * bell(y, .54, .055), elbow = 1 - .90 * bell(y, 1.26, .04);
    return { arm, leg, torso, centerX, centerZ, armSoft, legSoft, knee, elbow,
      abdomen: torso * bell(y, 1.10, .145), chest: torso * bell(y, 1.34, .105), hips: (1 - arm) * bell(y, .9, .105),
      thigh: leg * bell(y, .735, .14), calf: leg * bell(y, .33, .13), upperArm: arm * bell(y, 1.355, .095), forearm: arm * bell(y, 1.15, .075),
    };
  } };
  frames.set(base, frame); return frame;
}

const regionMaps = new WeakMap();
// Composition-only grouping and picking. Shared asset labels were authored
// before gender morphing and incorrectly include some hips/chest in the arms.
export function compositionAnatomicalRegions(base, indices) {
  if (regionMaps.has(base)) return regionMaps.get(base);
  const anatomy = anatomicalFrame(base, indices), regions = new Uint8Array(base.length / 3);
  for (let i = 0; i < base.length; i += 3) {
    const x = base[i], y = base[i + 1], z = base[i + 2], a = anatomy.at(x, y, z);
    if (y > 1.515 || y > 1.465 && Math.abs(x) < .09) regions[i / 3] = 0;
    else if (a.arm > .5) regions[i / 3] = x >= 0 ? 2 : 3;
    else if (a.leg > .5 && Math.abs(x) > .035) regions[i / 3] = x >= 0 ? 4 : 5;
    else regions[i / 3] = 1;
  }
  regionMaps.set(base, regions); return regions;
}
