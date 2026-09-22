"""ManualProvider: a student or counselor types in body-composition numbers by hand (e.g. reading
them off a printed InBody slip after a health-center visit). This is the provider the
POST /api/body-composition endpoint uses by default -- see routers/body_composition.py."""
from __future__ import annotations
import hashlib,json
from ..schemas import BodyCompositionMeasurement, SegmentMeasurement
from ..store import HealthStore, new_id, now
from .base import HealthDataProvider


class ManualProvider(HealthDataProvider):
    name = 'manual'

    def __init__(self, store: HealthStore):
        self.store = store

    def get_user_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        return self.store.list_measurements(user_id)

    def normalize_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        segments = [SegmentMeasurement(**s) for s in raw.get('segments', [])]
        return BodyCompositionMeasurement(
            id='MANUAL-'+hashlib.sha256((user_id+'|'+json.dumps(raw,sort_keys=True,default=str)).encode()).hexdigest()[:32], user_id=user_id, measurement_date=raw['measurement_date'],
            weight=raw.get('weight'), height=raw.get('height'), bmi=raw.get('bmi'),
            skeletal_muscle_mass=raw.get('skeletal_muscle_mass'), body_fat_mass=raw.get('body_fat_mass'),
            body_fat_percentage=raw.get('body_fat_percentage'), fat_free_mass=raw.get('fat_free_mass'),
            total_body_water=raw.get('total_body_water'), basal_metabolic_rate=raw.get('basal_metabolic_rate'),
            visceral_fat_level=raw.get('visceral_fat_level'), smi=raw.get('smi'),
            device_name=raw.get('device_name', ''), source='manual', segments=segments, created_at=now(),
        )

    def import_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        m = self.normalize_measurement(user_id, raw)
        return self.store.get_measurement(m.id) or self.store.add_measurement(m)
