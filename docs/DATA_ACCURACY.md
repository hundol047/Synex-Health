# Data accuracy rules

Synex Health only ever stores and displays values that a body-composition analyzer actually
reports. This is enforced in a few concrete places, not just as a convention:

1. **`SegmentMeasurement` (`backend/app/health/schemas.py`) has exactly five fields per segment**:
   `lean_mass_kg`, `lean_reference_percent`, `fat_mass_kg`, `fat_reference_percent`, keyed to one of
   the five `Segment` enum values (`LEFT_ARM`, `RIGHT_ARM`, `TRUNK`, `LEFT_LEG`, `RIGHT_LEG`). There
   is no field for an individual muscle (biceps, quadriceps, hamstrings, ...) anywhere in the schema
   — `backend/tests/test_health.py::test_no_fabricated_muscle_fields` asserts this directly so a
   future change can't silently add one.
2. **The AI Health Agent never names an individual muscle.** `backend/prompts/health_analysis.md`
   states this as a hard rule, and the deterministic fallback in `health_agent.py` only ever
   composes sentences from the five segment labels (`SEGMENT_LABEL_KO`). Compare:
   - ❌ "왼쪽 대퇴사두근이 부족합니다." (never produced)
   - ✅ "왼쪽 하체의 측정값이 오른쪽보다 상대적으로 낮습니다." (the actual phrasing style)
   `test_health_agent_never_names_individual_muscles` checks this for the deterministic path.
3. **Reference ranges are explicit about their provenance.** `ReferenceRange.source` defaults to
   `'demo'` and the demo values seeded in `health/demo_seed.py` are loosely-typical placeholder
   bands, not a validated clinical dataset — the frontend must show a "데모 기준 데이터" badge
   wherever `source == 'demo'`. An admin can register a real dataset via
   `POST /api/admin/reference-ranges` with no code change.
4. **A missing value is `null`, never estimated.** Every numeric field in `BodyCompositionMeasurement`
   is `Optional`; `comparison.py`'s delta functions return `None` rather than computing a delta from
   a missing prior value, and the frontend renders "측정되지 않음" / "비교할 데이터 없음" instead of
   inventing a number.
