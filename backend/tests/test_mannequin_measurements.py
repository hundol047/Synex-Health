import pytest
from pydantic import ValidationError
from app.health.schemas import BodyCompositionCreateRequest, BodyCompositionMeasurement


def test_girth_and_bone_fields_survive_measurement_serialization():
    values = dict(measurement_date='2026-01-01', weight=60, height=165,
                  skeletal_muscle_mass=24, body_fat_percentage=25,
                  chest_circumference=90, waist_circumference=75,
                  hip_circumference=96, bone_mass=2.4, mineral_mass=3.0)
    request = BodyCompositionCreateRequest(**values)
    stored = BodyCompositionMeasurement(id='shape', user_id='test', **request.model_dump())
    assert {key: stored.model_dump()[key] for key in values} == values


def test_rejects_wrong_girth_units_and_impossible_muscle_fat_combination():
    values = dict(measurement_date='2026-01-01', weight=60,
                  skeletal_muscle_mass=24, body_fat_percentage=25)
    with pytest.raises(ValidationError):
        BodyCompositionCreateRequest(**values, waist_circumference=.75)
    with pytest.raises(ValidationError):
        BodyCompositionCreateRequest(**{**values, 'body_fat_percentage': 90})
