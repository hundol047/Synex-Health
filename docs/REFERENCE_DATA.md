# Reference data and evidence

IMPLEMENTED: registered segment reference data retains sex/age/height applicability, lean/fat bounds, unit, source, publication, version, effective date and interpretation. Production/non-demo analysis excludes demo sources and incomplete provenance; admin registration requires provenance and valid bounds. UI displays actual value, reference range and provenance. Missing reference remains missing.

VERIFIED: production filtering tests and baseline comparison tests. No population-specific real reference dataset has been licensed or registered here. EXTERNAL SETUP REQUIRED: institution-approved dataset and population/device applicability review. Device-reported percent remains marked as device data. Existing percent color deadbands are product display rules, not diagnostic thresholds.

Evidence registry: backend/app/health/evidence.json. Deterministic recommendations only use registered sources. Each entry distinguishes general activity guidance from the product's unvalidated personalization/pose heuristics; no fabricated year or citation is filled in. This registry does not certify exercise efficacy. New institution ranges must be reviewed before insertion.


Status definitions: VERIFIED means a named automated/browser check passed; IMPLEMENTED / NOT DEVICE VERIFIED means code exists without physical-device evidence; EXTERNAL SETUP REQUIRED needs operator systems; NOT IMPLEMENTED means no working feature is claimed.
