"""MockProvider: deterministic, clearly-labeled demo body-composition data -- used only to seed the
bundled demo student (see health/demo_seed.py). Never presented to the UI as a real device reading;
every measurement it produces carries source='mock' and device_name='Demo Health Center Scale', and
the frontend surfaces a "데모 데이터" badge wherever source != a real provider (mock/manual with no
device is not marked demo; mock specifically is)."""
from __future__ import annotations
from ..schemas import BodyCompositionMeasurement, SegmentMeasurement, Segment
from ..store import HealthStore, new_id, now
from .base import HealthDataProvider

# Two real, hand-authored demo readings (section 33) -- never randomly generated, so the same demo
# story (좌우 하체 불균형 개선, 체지방 감소) reproduces identically every run.
DEMO_READINGS = [
    {
        'measurement_date': '2026-03-12', 'weight': 57.2, 'height': 165, 'bmi': 21.0,
        'skeletal_muscle_mass': 21.7, 'body_fat_mass': 15.9, 'body_fat_percentage': 27.8,
        'fat_free_mass': 41.3, 'total_body_water': 30.2, 'basal_metabolic_rate': 1310,
        'visceral_fat_level': 6, 'smi': 5.6, 'device_name': 'Demo Health Center Scale',
        'segments': [
            {'segment': 'LEFT_ARM', 'lean_mass_kg': 1.82, 'lean_reference_percent': 88, 'fat_mass_kg': 0.61, 'fat_reference_percent': 112},
            {'segment': 'RIGHT_ARM', 'lean_mass_kg': 1.91, 'lean_reference_percent': 92, 'fat_mass_kg': 0.58, 'fat_reference_percent': 108},
            {'segment': 'TRUNK', 'lean_mass_kg': 18.1, 'lean_reference_percent': 91, 'fat_mass_kg': 8.4, 'fat_reference_percent': 118},
            {'segment': 'LEFT_LEG', 'lean_mass_kg': 5.8, 'lean_reference_percent': 89, 'fat_mass_kg': 2.9, 'fat_reference_percent': 115},
            {'segment': 'RIGHT_LEG', 'lean_mass_kg': 6.2, 'lean_reference_percent': 95, 'fat_mass_kg': 2.7, 'fat_reference_percent': 109},
        ],
    },
    {
        'measurement_date': '2026-06-14', 'weight': 56.9, 'height': 165, 'bmi': 20.9,
        'skeletal_muscle_mass': 22.3, 'body_fat_mass': 14.9, 'body_fat_percentage': 26.3,
        'fat_free_mass': 42.0, 'total_body_water': 30.7, 'basal_metabolic_rate': 1332,
        'visceral_fat_level': 5, 'smi': 5.8, 'device_name': 'Demo Health Center Scale',
        'segments': [
            {'segment': 'LEFT_ARM', 'lean_mass_kg': 1.87, 'lean_reference_percent': 90, 'fat_mass_kg': 0.57, 'fat_reference_percent': 105},
            {'segment': 'RIGHT_ARM', 'lean_mass_kg': 1.95, 'lean_reference_percent': 94, 'fat_mass_kg': 0.55, 'fat_reference_percent': 102},
            {'segment': 'TRUNK', 'lean_mass_kg': 18.4, 'lean_reference_percent': 93, 'fat_mass_kg': 7.9, 'fat_reference_percent': 111},
            {'segment': 'LEFT_LEG', 'lean_mass_kg': 6.1, 'lean_reference_percent': 94, 'fat_mass_kg': 2.7, 'fat_reference_percent': 107},
            {'segment': 'RIGHT_LEG', 'lean_mass_kg': 6.3, 'lean_reference_percent': 97, 'fat_mass_kg': 2.6, 'fat_reference_percent': 105},
        ],
    },
]


class MockProvider(HealthDataProvider):
    name = 'mock'

    def __init__(self, store: HealthStore):
        self.store = store

    def get_user_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        return self.store.list_measurements(user_id)

    def normalize_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        segments = [SegmentMeasurement(**s) for s in raw.get('segments', [])]
        return BodyCompositionMeasurement(
            id=new_id('MEAS'), user_id=user_id, measurement_date=raw['measurement_date'],
            weight=raw.get('weight'), height=raw.get('height'), bmi=raw.get('bmi'),
            skeletal_muscle_mass=raw.get('skeletal_muscle_mass'), body_fat_mass=raw.get('body_fat_mass'),
            body_fat_percentage=raw.get('body_fat_percentage'), fat_free_mass=raw.get('fat_free_mass'),
            total_body_water=raw.get('total_body_water'), basal_metabolic_rate=raw.get('basal_metabolic_rate'),
            visceral_fat_level=raw.get('visceral_fat_level'), smi=raw.get('smi'),
            device_name=raw.get('device_name', ''), source='mock', segments=segments, created_at=now(),
        )

    def import_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        return self.store.add_measurement(self.normalize_measurement(user_id, raw))

    def seed_demo_readings(self, user_id: str) -> list[BodyCompositionMeasurement]:
        return [self.import_measurement(user_id, r) for r in DEMO_READINGS]
