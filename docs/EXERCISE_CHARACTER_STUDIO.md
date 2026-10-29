# Exercise character studio

Profile links to `/health/character`. The page edits a local cosmetic preference with a live exercise scene. Saving applies the same preferences to exercise demonstrations. Unsaved changes are guarded. Storage errors show a recoverable message; invalid saved data falls back to validated defaults. Measurements, calorie inputs and body-composition comparisons are not written by this editor.

Implemented: male/female base surfaces, three face-outline presets, arbitrary hair/skin/top/bottom colors, bounded chest/hip/waist/shoulder surface adjustments, original textured materials and a Three.js toon material variant. The preview can play squat, wall push-up and shoulder-roll demonstrations. Main exercise scenes retain red muscle guidance. The editor hides that overlay to make clothing colors visible.

This is a customization implementation, not the requested high-fidelity VTuber asset set. It does not include long hair geometry, sculpted anime faces, facial expressions/tracking, VRM import, multiple garment meshes, or unrestricted body proportions. Body support and equipment fit across every customized extreme have not been certified. Surface morphs preserve all vertex heights and rig joint definitions and use a bounded range; this is not a full collision solution. No commercial reference artwork or celebrity likeness is included.

Validation: focused tests cover normalization, malformed storage, persistence separated from health data, finite bounded morphs in both profiles, surface materials and exercise playback. A WebGL browser test covers selecting a female toon character, changing hair/face/chest, saving, reloading and seeing the saved style in the exercise library without shader errors. A personal build is generated separately; the existing downloadable APK is unchanged.


## Generated head and wardrobe update

New head details are original procedural geometry: a scalp shell fitted to the selected body, projected hair locks in short/side-part/bun styles, eyebrows and layered sclera/iris/pupil/catchlight meshes. They follow the same authored head quaternion as the body. Locks are merged to keep draw calls down. No external celebrity or game mesh was redistributed. Eye color and head close-up controls are available.

Wardrobe selection includes tee/tank/long sleeves and leggings/shorts/joggers. Rest-space fragment masks produce smooth sleeve and hem boundaries rather than triangle-shaped material edges. Joggers expand the existing garment surface locally; skin is not rendered as a second intersecting shell. This is fitted clothing, not a cloth simulation or a catalog of separate high-poly garments. Shader composition preserves red exercise-region guides on top of clothing.

Validation: 20 focused tests passed; the browser flow exercised outfit variants, face close-up in realistic and toon modes, persistence and exercise-library reuse without shader errors. Both face images and wardrobe screenshots were inspected. Initial floating locks and jagged hems were corrected. Commercial-game photorealism, long flowing hair and facial motion capture are not claimed; final APK publication remains separate.
