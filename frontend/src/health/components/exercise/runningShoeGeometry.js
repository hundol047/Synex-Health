import * as THREE from 'three';
// Loft the sidewall, forefoot and raised heel as a single continuous upper.
// The color bands follow the shoe rather than the camera or the floor.
function buildShoeData() {
  const positions=[], colors=[], indices=[];
  const color=new THREE.Color();
  const rings=36, sides=32;
  for (let i=0;i<=rings;i++) {
    const t=i/rings;
    const width=.5*Math.pow(Math.max(.0001,Math.sin(Math.PI*t)),.37)*(.85+.17*t);
    const lift=.009*Math.pow(t,5);
    const heel = .029*Math.exp(-Math.pow((t-.27)/.23,2));
    const tip = Math.pow(Math.max(0,Math.sin(Math.PI*t)),.46);
    const height=(.055+heel-.021*t)*tip;
    for(let j=0;j<=sides;j++){
      const angle=j/sides*2*Math.PI, side=Math.cos(angle), up=Math.sin(angle);
      const x=width*Math.sign(side)*Math.pow(Math.abs(side),.68);
      const y=lift + (up>0 ? -.012+height*Math.pow(up,.74) : -.012+.024*up*tip);
      positions.push(x,y,t-.5);
      const stripe=.11+.49*t;
      const upper= Math.abs(up-stripe)<.11 && t>.19 && t<.73;
      color.set(up<-.63?'#253b41':up<-.12?'#e7efdf':upper?'#a7d4bb':t<.17?'#214e50':t>.80?'#739791':'#396760');
      colors.push(color.r,color.g,color.b);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  return {positions:new Float32Array(positions), colors:new Float32Array(colors), indices};
}

// All athletes use this same neutral mesh. Their width, length and orientation
// are applied identically by the renderer and the ground contact calculation.
const shoeData = buildShoeData();
export const shoeMeshScale = shoe => [shoe.width * 1.10, 1, shoe.length * 1.04];

export function runningShoeGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(shoeData.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(shoeData.colors, 3));
  geometry.setIndex(shoeData.indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function exerciseShoeFloor(shoe, pitch = 0) {
  const normal = new THREE.Vector3(0, Math.cos(pitch), -Math.sin(pitch));
  const centerHeight = normal.y * shoe.center[1] + normal.z * shoe.center[2];
  if (shoe.rotation) normal.applyQuaternion(shoe.rotation.clone().invert());
  const [width, , length] = shoeMeshScale(shoe);
  const nx = normal.x * width, nz = normal.z * length;
  const vertices = shoeData.positions;
  let min = Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    min = Math.min(min, nx * vertices[i] + normal.y * vertices[i + 1] + nz * vertices[i + 2]);
  }
  return centerHeight + min;
}

export function soleSupportOffsets(shoes, rest) {
  return shoes.map((shoe, side) => {
    const ankle = rest[side ? 14 : 11];
    return [shoe.center[0] - ankle[0], exerciseShoeFloor(shoe) - ankle[1],
      shoe.center[2] + .12 * shoe.length - ankle[2]];
  });
}

// Dead bug rolls the heel onto the mat with the foot rotated 90° from rest.
// Solve the ankle target against this athlete's shoe rather than average height.
export function heelContactTargets(shoes, rest) {
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  return shoes.map((shoe, side) => {
    const ankle = new THREE.Vector3(...rest[side ? 14 : 11]);
    const center = new THREE.Vector3(...shoe.center).sub(ankle).applyQuaternion(rotation).toArray();
    return .003 - exerciseShoeFloor({ ...shoe, center, rotation });
  });
}
