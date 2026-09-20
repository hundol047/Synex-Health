"""CSVProvider: bulk-import measurements from a CSV export (e.g. a health center's own spreadsheet
of a semester's scale readings). Column headers must match BodyCompositionCreateRequest's field
names; segment columns are optional and named '<segment>_lean_kg' / '<segment>_fat_kg', e.g.
'LEFT_ARM_lean_kg'. Unknown/missing columns are left as None rather than guessed."""
from __future__ import annotations
import csv, io

from ..schemas import BodyCompositionMeasurement, SegmentMeasurement, Segment
from ..store import HealthStore, new_id, now
from .base import HealthDataProvider

_FLOAT_FIELDS = ['weight', 'height', 'bmi', 'skeletal_muscle_mass', 'body_fat_mass', 'body_fat_percentage',
                  'fat_free_mass', 'total_body_water', 'basal_metabolic_rate', 'visceral_fat_level', 'smi']


class CSVProvider(HealthDataProvider):
    name = 'csv'

    def __init__(self, store: HealthStore):
        self.store = store

    def get_user_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        return self.store.list_measurements(user_id)

    def normalize_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        segments = []
        for seg in Segment:
            lean = raw.get(f'{seg.value}_lean_kg')
            fat = raw.get(f'{seg.value}_fat_kg')
            if lean or fat:
                segments.append(SegmentMeasurement(
                    segment=seg,
                    lean_mass_kg=float(lean) if lean not in (None, '') else None,
                    fat_mass_kg=float(fat) if fat not in (None, '') else None,
                ))
        fields = {f: (float(raw[f]) if raw.get(f) not in (None, '') else None) for f in _FLOAT_FIELDS}
        return BodyCompositionMeasurement(
            id=new_id('MEAS'), user_id=user_id, measurement_date=raw['measurement_date'],
            device_name=raw.get('device_name', ''), source='csv', segments=segments, created_at=now(), **fields,
        )

    def import_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        return self.store.add_measurement(self.normalize_measurement(user_id, raw))

    def import_csv(self, user_id: str, csv_text: str) -> list[BodyCompositionMeasurement]:
        reader = csv.DictReader(io.StringIO(csv_text))
        rows = list(reader)
        if not rows or any(not row.get('measurement_date') for row in rows):
            raise ValueError('measurement_date required')
        measurements = [self.normalize_measurement(user_id, row) for row in rows]
        # Parse and validate the complete batch before any writes.
        return [self.store.add_measurement(m) for m in measurements]
