# 3D Body Map implementation notes

## What's here now

`frontend/src/health/components/body3d/geometry.js` + `HumanBody.jsx` generate a **procedural,
lofted human silhouette** at runtime (Three.js `BufferGeometry`, built via
`react-three-fiber`/`drei`): each of the five data segments (`LEFT_ARM`, `RIGHT_ARM`, `TRUNK`,
`LEFT_LEG`, `RIGHT_LEG`) is its own smoothly-tapered mesh lofted along a curved spine (Frenet-frame
tube/elliptical-tube generation), not a sphere/cylinder/capsule bolted onto a rig. This keeps
adult-human proportions (A-pose, tapered limbs, an elliptical torso silhouette wider than it is
deep) while staying entirely self-authored code with no external asset licensing risk.

## Why not a pre-made GLB/GLTF human model

The product brief asks for a licensed, adult-proportioned GLB/GLTF asset rather than this
procedural mesh. This environment does not have a verified, redistributable-license human body
asset available to fetch and ship (Mixamo characters carry Adobe's own redistribution terms;
generic "free" marketplace assets often have unclear or non-commercial licenses) — shipping one
without checking its license would violate the brief's own "라이선스가 불명확한 에셋은 사용하지
않는다" rule. Rather than guess, this build ships the procedural mesh, which is honest about what
it is and fully licensed (self-generated code).

## How to swap in a real GLB later

The segment-group contract downstream components rely on is: **a `<group name="LEFT_ARM">` (etc.
for the other four) somewhere in the scene graph, each containing the mesh(es) that make up that
region**, so `HumanBody.jsx`'s click/hover handlers and `BodyMapWorkspace`'s color-by-segment logic
keep working unchanged. To swap in a licensed GLB:

1. Verify the license explicitly permits this use (including redistribution inside a built web app).
2. Load it with `useGLTF` (`@react-three/drei`, already a dependency) instead of `HumanBody.jsx`'s
   procedural geometry.
3. In the source GLB/rig, group or tag the meshes covering each of the five regions so they can be
   selected by name (e.g. rename mesh nodes in Blender before export, or map bone influences to the
   five regions) and wrap each region's meshes in a `<group name="LEFT_ARM">` etc. wrapper the same
   way `HumanBody.jsx` does now.
4. `BodyScene.jsx`, `BodyMapWorkspace.jsx`, `bodyMapColors.js`, and `SegmentDetailPanel.jsx` need no
   changes — they only depend on the five group names and the click/hover callback contract.
