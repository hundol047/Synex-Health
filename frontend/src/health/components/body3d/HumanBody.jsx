import React, { useMemo } from 'react';
import * as THREE from 'three';
import { loftTube, loftEllipticalTube, taperProfile } from './geometry.js';

// Adult-proportioned control curves (arbitrary scene units, ~1.8 tall). A-pose so arms don't
// clip through the trunk. Mirrored for left/right by negating x. See geometry.js for why this is
// lofted rather than assembled from primitives.
const TRUNK_CURVE = [[0, 1.00, 0], [0, 1.12, 0.01], [0, 1.28, 0.015], [0, 1.40, 0.01], [0, 1.49, 0]];
const trunkRx = taperProfile([[0, 0.145], [0.35, 0.115], [0.7, 0.16], [1, 0.135]]);
const trunkRz = taperProfile([[0, 0.10], [0.35, 0.085], [0.7, 0.10], [1, 0.09]]);

function armCurve(sign) {
  return [
    [sign * 0.16, 1.47, 0], [sign * 0.23, 1.30, 0.01], [sign * 0.25, 1.15, 0.02],
    [sign * 0.255, 0.95, 0.04], [sign * 0.26, 0.85, 0.06],
  ];
}
const armRadius = taperProfile([[0, 0.052], [0.25, 0.043], [0.5, 0.039], [0.75, 0.032], [1, 0.024]]);

function legCurve(sign) {
  return [
    [sign * 0.095, 1.01, 0], [sign * 0.10, 0.75, 0.005], [sign * 0.10, 0.54, 0.01],
    [sign * 0.10, 0.30, 0.005], [sign * 0.10, 0.07, 0],
  ];
}
const legRadius = taperProfile([[0, 0.10], [0.3, 0.075], [0.5, 0.058], [0.68, 0.065], [1, 0.042]]);

const DEFAULT_COLOR = '#c9d3e4';

function SegmentMesh({ name, geometry, color, onSelect, selected, onHover }) {
  return (
    <group name={name}>
      <mesh
        geometry={geometry}
        castShadow receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect?.(name); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover?.(name); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover?.(null); document.body.style.cursor = 'auto'; }}
      >
        <meshStandardMaterial
          color={color || DEFAULT_COLOR}
          roughness={0.55}
          metalness={0.05}
          emissive={selected ? new THREE.Color(color || DEFAULT_COLOR) : new THREE.Color('#000000')}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
    </group>
  );
}

/**
 * Renders the five data segments (group.name matches the Segment enum) plus a neutral, non-
 * interactive head/neck for visual completeness. `segmentColors` maps Segment -> CSS color string;
 * `onSelect(segment)` fires on click; `selectedSegment`/`hoveredSegment` drive the emissive highlight.
 */
export default function HumanBody({ segmentColors = {}, onSelect, selectedSegment, onHover, opacity = 1 }) {
  const geometries = useMemo(() => ({
    TRUNK: loftEllipticalTube(TRUNK_CURVE, trunkRx, trunkRz, { radialSegments: 24, heightSegments: 20 }),
    LEFT_ARM: loftTube(armCurve(-1), armRadius, { radialSegments: 12, heightSegments: 20 }),
    RIGHT_ARM: loftTube(armCurve(1), armRadius, { radialSegments: 12, heightSegments: 20 }),
    LEFT_LEG: loftTube(legCurve(-1), legRadius, { radialSegments: 14, heightSegments: 22 }),
    RIGHT_LEG: loftTube(legCurve(1), legRadius, { radialSegments: 14, heightSegments: 22 }),
  }), []);

  return (
    <group dispose={null}>
      {Object.entries(geometries).map(([name, geometry]) => (
        <SegmentMesh
          key={name}
          name={name}
          geometry={geometry}
          color={segmentColors[name]}
          selected={selectedSegment === name}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      {/* Head + neck: cosmetic only, not a measured segment, so never colored by data or clickable. */}
      <mesh position={[0, 1.635, 0.01]} castShadow>
        <sphereGeometry args={[0.095, 24, 24]} />
        <meshStandardMaterial color="#d7ddea" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.555, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.09, 16]} />
        <meshStandardMaterial color="#d7ddea" roughness={0.6} />
      </mesh>
    </group>
  );
}
