import { MathUtils } from 'three';
import mesh from '../body3d/assets/human-mesh.json';

// Paint features in the neutral mesh's coordinates. All supported bodies share
// topology, so eyelids and facial details travel with the same skinned vertices.
export function athleteCoordinates() {
  return Float32Array.from(mesh.profiles.male, value => value * mesh.scale);
}

export function sculptTrainingKit(wear, scale) {
  const shape = wear.positions.slice();
  const neutral = athleteCoordinates();
  for (let i = 0; i < shape.length; i += 3) {
    const x = neutral[i], y = neutral[i + 1], z = neutral[i + 2];
    const front = MathUtils.smoothstep(z, .035, .145);
    // Swept crop: add volume over the crown and taper into the temples.
    const hairline = 1.648 + front * (.058 + .012 * Math.sin(x * 30));
    const crown = MathUtils.smoothstep(y, hairline, hairline + .045);
    shape[i] += crown * (x * .15 + .006);
    shape[i + 1] += crown * (.014 + .011 * front) * scale;
    shape[i + 2] += crown * (z - .045) * .17;
    // Ease through the waist with shallow, asymmetric folds above the hem.
    if (wear.labels[i / 3] === 'top' && Math.abs(x) < .21) {
      const ease = MathUtils.smoothstep(y,.93,.99) * (1 - MathUtils.smoothstep(y,1.15,1.33));
      const folds = .011 + .004 * Math.sin(96*y + 15*x + 3*front);
      shape[i] += x * ease * .053;
      shape[i + 2] += ease * folds * Math.tanh(40*(z-.035));
    }
  }
  return {...wear, positions:shape};
}

export function paintAthlete(materials) {
  function paint(material, fragment) {
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute vec3 athleteRest; varying vec3 vAthleteRest;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAthleteRest = athleteRest;');
      shader.fragmentShader = 'varying vec3 vAthleteRest;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + fragment);
    };
    material.customProgramCacheKey = () => fragment;
  }
  paint(materials[0], `
    vec3 p = vAthleteRest;
    if (p.y > 1.58 && p.z > .10) {
      float x = abs(p.x);
      float browY = 1.690 - 4.8*((x-.032)*(x-.032)) - .065*(x-.032);
      float brow = (1.-smoothstep(.0017,.0040,abs(p.y-browY))) * smoothstep(.011,.021,x)*(1.-smoothstep(.046,.054,x));
      float eyeY = 1.665 + .075*(x-.032);
      vec2 eye = vec2((x-.032)/.014,(p.y-eyeY)/.0049);
      float lid = abs(eye.y) + pow(abs(eye.x),1.65);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.095,.052,.045), (1.-smoothstep(.86,1.5,lid))*.77);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.71,.64,.57), 1.-smoothstep(.68,1.02,lid));
      float iris = length(vec2(x-.032,p.y-eyeY))/.0056;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.055,.032,.022), (1.-smoothstep(.72,1.,iris))*(1.-smoothstep(.68,1.02,lid)));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.06,.035,.025), brow*.88);
    }
  `);
  paint(materials[1], `
    vec3 p = vAthleteRest;
    float angle = atan(abs(p.x),p.z-.035);
    float panel = 1.08 + .24*sin((p.y-1.)*6.);
    float seam = abs(angle-panel);
    vec3 cloth = mix(vec3(.013,.185,.174),vec3(.005,.063,.072),smoothstep(-.025,.025,angle-panel));
    cloth = mix(cloth,vec3(.40,.79,.61),1.-smoothstep(.010,.025,seam));
    // Contrast shoulder yoke and a staggered pair of chest marks.
    float yoke = smoothstep(1.40,1.41,p.y+.34*abs(p.x));
    cloth = mix(cloth,vec3(.016,.10,.115),yoke*.83);
    vec2 logo=vec2(p.x-.085,p.y-1.371);
    float slash=abs(logo.x-.55*logo.y);
    if(p.z>.07 && abs(logo.y)<.014 && (slash<.003 || abs(logo.x-.55*logo.y-.010)<.003)) cloth=vec3(.67,.91,.68);
    cloth = mix(vec3(.016,.036,.052), cloth, smoothstep(.957,.965,p.y));
    diffuseColor.rgb = cloth * (.982+.018*cos(290.*p.y+8.*sin(6.*angle)));
  `);
  paint(materials[2], `
    vec3 p = vAthleteRest;
    float hem = .655 + .034*smoothstep(.08,.22,abs(p.x));
    vec3 fabric = mix(vec3(.054,.083,.102),vec3(.016,.036,.052),smoothstep(hem-.004,hem+.004,p.y));
    float piping = 1.-smoothstep(.002,.006,abs(p.y-hem-.010));
    diffuseColor.rgb = mix(fabric,vec3(.20,.38,.34),piping*.78);
  `);
}
