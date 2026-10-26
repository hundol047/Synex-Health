"""Keep server and device-only school identities consistent for selection and restore."""
import json
from pathlib import Path
from app.health.schools import SCHOOLS, BY_ID


def test_offline_and_server_directory_agree():
    root = Path(__file__).resolve().parents[2]
    local = json.loads((root / 'frontend/src/shared/lib/localSchools.json').read_text())
    assert [(s['id'], s['name'], s['region']) for s in local] == SCHOOLS
    assert len(BY_ID) == len(local)
    assert all(s['integration_status'] == 'not_connected' for s in BY_ID.values())
    centers = json.loads((root / 'frontend/src/health/data/universityCenters.json').read_text())['centers']
    assert all(c['schoolId'] in BY_ID for c in centers)
