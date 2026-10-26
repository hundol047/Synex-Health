# Hand surface and in-card demonstration review

The user requested a detailed wrist/finger review, removal of nipple-like chest details and a demonstration that opens inside the current exercise card instead of a separate modal.

## Corrections

- Digit assignment now follows the shared canonical hand topology. Previously profile-dependent position thresholds could assign adjacent vertices of one finger to different digits; the thumb's hard distance cutoff also split neighboring vertices.
- Finger bending blends continuously across the web and constrains neighboring surface edges. Original wrist and proximal palm vertices remain fixed. Support hands remain open and untouched by the finger-curl operation.
- The mesh's forearm rotation inherits the authored hand roll when there is no explicit forearm frame, avoiding a sudden twist at the wrist seam.
- Loaded equipment grips follow the forearm instead of fixed world-up/down directions. Before this correction, some bench/floor press and leg-press wrist angles exceeded 50 degrees. Equipment anchors are recalculated from the same palm frame.
- Seated march, ankle pump, hamstring stretch, seated calf and wall-sit hands follow the forearm instead of bending downward independently.
- The shared display body fits a smooth local chest surface around the small modeled chest detail. Both exercise avatars and body-composition mannequins use it. Vertex count, face indices, X/Y coordinates and distant body regions stay intact.
- The exercise modal and portal were removed. The demonstration now replaces the header/preview area inside the same routine card, before descriptions and record inputs. It autoplays, stays on the same URL, and closing restores the user's card position. Guided workout views retain their own timer controls.

## Verification approach

`HandSurfaceQuality.test.js` checks both profiles for finger-edge stretch spikes, aligned loaded wrists throughout equipment poses, continuous hand/forearm roll, and bounded local chest changes. Existing tests check 104 motions (74 exercises + 30 recovery stretches) across 240 time samples, planted palms, wall support and equipment contacts.

`frontend/scripts/audit-hand-surfaces.mjs` creates four isolated hand/forearm views at two phases for each of the 104 motions (208 frames), plus chest views. These are diagnostic crops: the intentional cuts at the upper forearm are not missing geometry in the app. This is a surface and animation audit, not clinical certification of exercise biomechanics.

`exercise-inline-demo.spec.js` checks a 360×640 viewport, visible playing motion without a dialog or route change, folding/reopening and return to the same card position. `all-exercise-renders.spec.js` checks all 74 complete exercise surfaces at three phases.

## Completed validation (2026-10-27 KST)

- Frontend unit suite: 90 files, 559 tests passed. After the final smaller chest patch and focused-card scroll guard, the affected surface and upgrade tests passed again (8 tests).
- Personal production build passed after the final application changes.
- Final browser run: all 74 exercises rendered at three phases, the inline mobile demonstration test passed, and cat-cow/bird-dog floor-support tests passed (3 browser tests, 7 minutes).
- The hand audit generated 208 frames covering all 104 motions. Contact-sheet review and enlarged equipment-hand views informed the corrections; final male/female chest views were checked separately after narrowing the smoothing patch.

These checks validate generated geometry and browser behavior. They do not establish physical-phone performance or clinical motion accuracy. A newly signed APK must be built and published separately before these changes reach installed copies.
