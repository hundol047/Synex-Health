# Digital Twin

IMPLEMENTED / NOT DEVICE VERIFIED: MakeHuman male/female/neutral surfaces, regional lean/fat morphs, independent height scaling, abdominal waist morph and shoulder muscle volume. Missing inputs retain a declared reference silhouette rather than being treated as zero. Safe clamps bound shape changes. Body/Muscle/Fat/Skeleton and clipping remain; Balance/Change are comparison color modes.

VERIFIED: finite meshes, complete garment partitions, all 44 motion deformation smoke tests, waist change without height change. This is not a 3D scan, tissue segmentation or physiological reconstruction. Skeleton is joint axes and Section cuts the surface mesh only. Age and visceral-fat level are not converted into speculative anatomy. Extreme-body visual sweeps on physical devices remain necessary.

BodyShapeProvider adapters are disabled by default. Local adapters require consent; remote adapters require separate upload consent and explicit retention selection. No reconstruction model, upload route or photo store is enabled; no fake inference is returned. Enabling a provider requires implementation and deletion/retention verification first.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
