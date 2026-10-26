import * as THREE from 'three';
import handMesh from '../body3d/assets/human-mesh.json' with { type: 'json' };
const referenceHands = Float32Array.from(handMesh.profiles.male, value => value * handMesh.scale);
import { orientation, scaleFor, smoothStep, vector } from './poseMath.js';

// Hand-plane calibration for the bundled CC0 human topology. Wrist joints are
// proximal to the visible palms; a tool belongs inside the curled palm, rather
// than on the nominal wrist joint. Mirrored hands keep their anatomical sides.
export function handRestFrame(rest, side) {
  const wrist = side === 0 ? 5 : 8, finger = side === 0 ? 17 : 18, sign = side === 0 ? 1 : -1;
  const along = vector(rest[finger]).sub(vector(rest[wrist])).normalize();
  const back = new THREE.Vector3(sign * .68, .71, .18);
  back.addScaledVector(along, -back.dot(along)).normalize();
  return { wrist, finger, sign, along, back, across: back.clone().cross(along).normalize() };
}

export function toolHandRotation(rest, joints, side, gripAxis = [1, 0, 0]) {
  const { wrist, finger, along, back } = handRestFrame(rest, side);
  const posedAlong = vector(joints[finger]).sub(vector(joints[wrist])).normalize();
  let posedBack = vector(gripAxis).cross(posedAlong);
  if (posedBack.lengthSq() < 1e-8) posedBack = new THREE.Vector3(side === 0 ? 1 : -1, 0, 0).addScaledVector(posedAlong, -(side === 0 ? 1 : -1) * posedAlong.x);
  posedBack.normalize();
  return orientation(posedAlong.toArray(), posedBack.toArray()).multiply(orientation(along.toArray(), back.toArray()).invert());
}

export function toolGripAnchor(rest, joints, side, rotation) {
  const { wrist, sign, along, back, across } = handRestFrame(rest, side), h = scaleFor(rest) * (rest.handGripScale?.[side] || 1);
  const offset = along.multiplyScalar(.17 * h).addScaledVector(across, -sign * .06 * h).addScaledVector(back, -.001 * h);
  return offset.applyQuaternion(rotation).add(vector(joints[wrist])).toArray();
}

export function calibrateGripScale(base, weights, rest) {
  const h = scaleFor(rest);
  return [0, 1].map(side => {
    const { wrist, along } = handRestFrame(rest, side), origin = vector(rest[wrist]);
    let maximum = 0;
    for (let i = 0; i < weights.length; i++) if (weights[i].some(([bone, influence]) => bone === 12 + side && influence > .85)) {
      maximum = Math.max(maximum, new THREE.Vector3().fromArray(base, i * 3).sub(origin).dot(along));
    }
    return maximum ? THREE.MathUtils.clamp(maximum / (.2841273 * h), .65, 1.2) : 1;
  });
}

// Separate MCP/PIP/DIP flexion for the four modeled fingers. Coordinates are
// calibrated in the CC0 palm plane, mirrored and scaled for each avatar.
const DIGITS = [
  { w: -.096, d: .174, tipW: -.134, tipD: .254 },
  { w: -.071, d: .178, tipW: -.093, tipD: .282 },
  { w: -.046, d: .177, tipW: -.054, tipD: .280 },
  { w: -.023, d: .163, tipW: -.025, tipD: .246 },
];

function fingerArc(distance, length, flexion) {
  // Integrating smoothly changing joint angles avoids collapsing the entire
  // finger onto one circular hinge. Rotate its cross-section with the tangent.
  const angleAt = s => flexion * (.92 * smoothStep(0, .13, s / length)
    + 1.12 * smoothStep(.38, .52, s / length) + .65 * smoothStep(.69, .81, s / length));
  let forward = 0, normal = 0;
  const steps = 16, step = distance / steps;
  for (let i = 0; i < steps; i++) {
    const angle = angleAt((i + .5) * step);
    forward += step * Math.cos(angle); normal -= step * Math.sin(angle);
  }
  return { forward, normal, angle: angleAt(distance) };
}

// Keep the shared surface connected while fingers curl. Adjacent vertices must
// not stretch into long spikes at the thumb web or between finger regions.
const handEdges = (() => {
  const edges = new Set(), pairs=[];
  for(let i=0;i<handMesh.indices.length;i+=3)for(let k=0;k<3;k++){
    const a=handMesh.indices[i+k],b=handMesh.indices[i+(k+1)%3],key=Math.min(a,b)+':'+Math.max(a,b);
    if(!edges.has(key)){edges.add(key);pairs.push([a,b]);}
  }
  return pairs;
})();
function constrainFingerSurface(base, output, mobility) {
  if(base.length!==referenceHands.length)return;
  const edges=handEdges.filter(([a,b])=>mobility[a]>0||mobility[b]>0).map(([a,b])=>[a,b,Math.hypot(base[a*3]-base[b*3],base[a*3+1]-base[b*3+1],base[a*3+2]-base[b*3+2])]);
  for(let iteration=0;iteration<96;iteration++)for(const [a,b,length] of edges){
    const ma=mobility[a],mb=mobility[b],total=ma+mb;if(!total||!length)continue;
    const ax=a*3,bx=b*3,dx=output[bx]-output[ax],dy=output[bx+1]-output[ax+1],dz=output[bx+2]-output[ax+2],distance=Math.hypot(dx,dy,dz);
    if(distance<=length*1.35||distance<1e-8)continue;
    const correction=(distance-length*1.35)/distance*.8;
    for(const [k,delta] of [[0,dx],[1,dy],[2,dz]]){output[ax+k]+=delta*correction*ma/total;output[bx+k]-=delta*correction*mb/total;}
  }
}

// Unsupported hands curl gently; support palms retain the calibrated flat
// surface. Arrays allow one hand to support while the other holds or relaxes.
export function gripSurface(base, weights, rest, grip) {
  const output = base.slice(), mobility = new Float32Array(weights.length);
  const stature = scaleFor(rest), scales = rest.handGripScale || calibrateGripScale(base, weights, rest);
  for (let side = 0; side < 2; side++) {
    const shape = Array.isArray(grip) ? grip[side] : grip;
    if (!['closed', 'relaxed', 'clasp'].includes(shape)) continue;
    const closure = shape === 'relaxed' ? .32 : shape === 'clasp' ? .70 : 1;
    const h = stature * scales[side];
    const { wrist, sign, along, back, across } = handRestFrame(rest, side), origin = vector(rest[wrist]);
    const referenceAlong = new THREE.Vector3(sign*.12,-.14,.12).normalize();
    const referenceBack = new THREE.Vector3(sign*.68,.71,.18);
    referenceBack.addScaledVector(referenceAlong,-referenceBack.dot(referenceAlong)).normalize();
    const referenceAcross = referenceBack.clone().cross(referenceAlong).normalize();
    for (let i = 0; i < weights.length; i++) {
      const influence = weights[i].find(([bone]) => bone === 12 + side)?.[1] || 0;
      if (influence < .5) continue;
      // Both profiles share topology: use the same anatomical digit assignment.
      // Reclassifying a smaller hand by world coordinates split single fingers.
      const canonical = base.length === referenceHands.length;
      const relative = new THREE.Vector3().fromArray(canonical ? referenceHands : base, i * 3).sub(canonical ? vector(side ? [-.445,1.105,.13] : [.445,1.105,.13]) : origin);
      const unit = canonical ? 1 : h;
      const d = relative.dot(canonical?referenceAlong:along) / unit, width = sign * relative.dot(canonical?referenceAcross:across) / unit, normal = relative.dot(canonical?referenceBack:back) / unit;
      const actualForward = new THREE.Vector3().fromArray(base,i*3).sub(origin).dot(along)/h;
      if (d <= .125 || actualForward <= .125) continue;
      let nextD = 0, nextN = 0, nextW = 0, total = 0;
      for (const digit of DIGITS) {
        const slope = (digit.tipW-digit.w)/(digit.tipD-digit.d);
        const separation = width-(digit.w+slope*Math.max(0,d-digit.d));
        const weight = 1 / (separation*separation + .000016) ** 3;
        const length = Math.hypot(digit.tipW-digit.w,digit.tipD-digit.d);
        const aw=(digit.tipW-digit.w)/length,ad=(digit.tipD-digit.d)/length;
        const dw=width-digit.w,dd=d-digit.d,forward=dw*aw+dd*ad,lateral=dw*ad-dd*aw;
        let fw=width,fd=d,fn=normal;
        if(forward>0){
          const arc=fingerArc(forward,length,closure),spread=Math.atan2(aw,ad)*(1-closure*.55),crossSection=normal-.021;
          const bent=arc.forward+crossSection*Math.sin(arc.angle),web=smoothStep(0,.025,forward);
          fw=THREE.MathUtils.lerp(width,digit.w+Math.sin(spread)*bent+Math.cos(spread)*lateral,web);
          fd=THREE.MathUtils.lerp(d,digit.d+Math.cos(spread)*bent-Math.sin(spread)*lateral,web);
          fn=THREE.MathUtils.lerp(normal,.021+arc.normal+crossSection*Math.cos(arc.angle),web);
        }
        nextW+=fw*weight;nextD+=fd*weight;nextN+=fn*weight;total+=weight;
      }
      nextW/=total;nextD/=total;nextN/=total;
      // A continuous web transition replaces the sharp thumb cutoff at d=.191.
      const thumb=smoothStep(.09,.135,-width)*(1-smoothStep(.175,.225,d));
      const bend=smoothStep(.125,.155,d),angle=-1.03*closure*bend,dw=width+.102,dd=d-.133;
      nextW=THREE.MathUtils.lerp(nextW,-.102+dw*Math.cos(angle)-dd*Math.sin(angle),thumb);
      nextD=THREE.MathUtils.lerp(nextD,.133+dw*Math.sin(angle)+dd*Math.cos(angle),thumb);
      nextN=THREE.MathUtils.lerp(nextN,normal-.027*closure*bend,thumb);
      const folded = new THREE.Vector3().fromArray(base,i*3).addScaledVector(along,(nextD-d)*h).addScaledVector(across,sign*(nextW-width)*h).addScaledVector(back,(nextN-normal)*h);
      mobility[i] = smoothStep(.125,.16,Math.min(d,actualForward))*smoothStep(.5,.85,influence);
      const blend = smoothStep(.5, .85, influence);
      new THREE.Vector3().fromArray(base, i * 3).lerp(folded, blend).toArray(output, i * 3);
    }
  }
  constrainFingerSurface(base,output,mobility);
  return output;
}
