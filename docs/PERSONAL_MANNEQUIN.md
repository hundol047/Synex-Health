# Personal InBody composition mannequin

`/health/body` opens **내 체성분 마네킹**. Enter actual result-sheet height,
weight, body-fat percentage and skeletal-muscle mass in `/health/profile`.
Optional measured chest, waist and hip circumferences refine the shape. Saving
links directly to the mannequin. Values remain in the existing encrypted
device document and its user-controlled export.

The existing CC0 MakeHuman topology has smooth, bounded composition deformation
and continuous torso-girth constraints. This translucent anatomical illustration
is independent of the dressed exercise avatar. Fat and muscle affect different
envelopes; height sets scale. Girth constraints use triangle/plane perimeter
lengths. Rotation, zoom, region selection, opacity, reference layers and an
illustrative skeleton are available. Demand rendering pauses in the background.

This is **not a 3D scan or a validated anatomical reconstruction**. Composition
totals and girths do not identify fat distribution, face, skeletal dimensions
or individual muscle anatomy. Authored shape coefficients are not population
means. Missing fields retain the base shape and are identified in the UI.
Extreme inputs use bounded shape adjustments; records retain entered numbers.
Regional lean mass is not relabelled SMM, and total SMM is never divided into
invented regional kg.

`bone_mass` (device-reported estimated bone mass) and `mineral_mass` (result-sheet
minerals) are separate optional records. Neither determines bone thickness or
skeletal geometry. InBody minerals are not silently relabelled bone mass.
The server API supports the additional manual fields; old records remain valid.

## Published comparison and verification depth

Janssen I, Heymsfield SB, Wang ZM, Ross R. **Skeletal muscle mass and distribution
in 468 men and women aged 18–88 yr.** *J Appl Physiol*. 2000;89(1):81–88.
DOI **10.1152/jappl.2000.89.1.81**.
[PubMed PMID 10904038](https://pubmed.ncbi.nlm.nih.gov/10904038/).

Reported sex-specific whole-body MRI means used here: **men 33.0 kg, women
21.0 kg**. **468** is the entire study count, not each sex's count. No Korean,
age-specific, height-matched, regional or InBody/BIA mean is claimed. These are
comparison values, not healthy targets or clinical thresholds. This feature
does not register a reviewed clinical dataset in the existing server reference
registry; that registry's provenance/review requirements remain unchanged.

**Verification route, 2026-10-08:** the cloud proxy denied PubMed, Europe PMC and
publisher requests with CONNECT 403. Citation and numbers were checked against
the explicit abstract transcription in the public reference patient's `sources`
entry of `open-anesthesia-sim`, pinned at commit
`d231018056b759ba9ea4672aae63a0d03951a61f`:
[public transcription](https://github.com/stuthedew/open-anesthesia-sim/blob/d231018056b759ba9ea4672aae63a0d03951a61f/src/anesthesia_sim/data/patients/reference_adult.json).
That entry records its own PubMed abstract retrieval and distinguishes kg from
litres. **This session did not directly read the original abstract/paper.**
The UI exposes verification depth and both links. This is secondary-source
confirmation, not independent primary-source or clinical validation. No code
from the external research repositories was copied.

The saved environment draft adds precise PubMed/PMC, NCBI eutils, Europe PMC
and publisher domains, preserving the pose-model domain. Draft saving does not
activate network policy. Original-source checking can resume after environment
configuration review/save/publish.

Comparison requires known sex and birth date, with age calculated on the
measurement date within **18–88**. Missing age/sex and minors retain their own
model without a mean. The reference retains actual height, weight, fat and
girths and changes total SMM. It is a **muscle-only comparison model**, not a
sampled average person's full body. If mean SMM exceeds fat-free mass under
entered weight/fat conditions, only the numerical comparison appears.

## Validation

Unit checks cover age/eligibility, independent fat/muscle deformation, matched
pose/height, torso perimeters, bone/mineral separation and encrypted restore.
Browser tests use real WebGL at **393×852 and 360×640**: two independent smooth
transparent surfaces with different leg volume, opacity, front/back, skeleton,
own-only mode, no server API calls, operation with browser network disabled
after load, and persistence after reload. Dev-server document reload requires
local HTTP; Android packages its document/assets. Screenshots are visually
inspected, including the pelvis silhouette and horizontal overflow.

The first-launch storage fix and seven-movement bodyweight camera coach remain
included. Physical Android camera, GPU performance and shape similarity have
not been measured on the user's phone. APK updates keep the personal app ID
and signing certificate, increase the version code, and bundle model/WASM and
mannequin geometry offline.
