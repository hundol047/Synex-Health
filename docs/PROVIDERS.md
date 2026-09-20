# HealthDataProvider adapters

`backend/app/health/providers/base.py` defines the `HealthDataProvider` interface every
body-composition data source implements: `get_user_measurements`, `get_latest_measurement`,
`import_measurement`, `normalize_measurement`.

| Provider | File | Status | Notes |
|---|---|---|---|
| `MockProvider` | `providers/mock.py` | **Working** | Two hand-authored demo readings (section 33), used only to seed the bundled demo student. Every measurement it produces is tagged `source='mock'` and the frontend shows a demo badge. |
| `ManualProvider` | `providers/manual.py` | **Working** | Backs `POST /api/body-composition` — a student or counselor types in numbers read off a printed slip. |
| `CSVProvider` | `providers/csv_provider.py` | **Working** | Backs `POST /api/body-composition/import-csv` — bulk import from a spreadsheet export. Column headers must match `BodyCompositionCreateRequest` field names; segment columns are `<SEGMENT>_lean_kg` / `<SEGMENT>_fat_kg`. |
| `InBodyProvider` | `providers/inbody.py` | **Structural placeholder** | We do not hold InBody API credentials or an integration agreement in this environment. Every method raises `ProviderNotConfigured` (surfaced as HTTP 501) rather than calling a made-up endpoint. Wiring a real integration means: setting `INBODY_API_BASE_URL`/`INBODY_API_KEY`, and implementing the two HTTP calls per InBody's official Lookin'Body/API documentation — the `HealthDataProvider` interface and `normalize_measurement()` contract don't need to change. |
| `BiogramProvider` | `providers/biogram.py` | **Structural placeholder** | Same rationale as InBody — no real Biogram credentials/agreement exist here. Raises `ProviderNotConfigured` until `BIOGRAM_API_BASE_URL`/`BIOGRAM_API_KEY` are set and the real API calls are implemented. |

No provider silently returns fabricated data if it isn't really connected — see
`main.py`'s `provider_not_configured_handler` for how `ProviderNotConfigured` becomes a clean 501
instead of a stack trace or (worse) fake success.
