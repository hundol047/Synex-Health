"""Pydantic models for Synex Health.

Mirrors the field names in the product spec exactly (section 7 of the implementation brief) so the
frontend, the store, and the AI Health Agent all speak the same vocabulary. Nothing here invents
per-muscle data -- SegmentMeasurement is limited to the five regions an actual body-composition
analyzer reports (left_arm, right_arm, trunk, left_leg, right_leg); see docs/DATA_ACCURACY.md.
"""
from __future__ import annotations
from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Literal


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Role(str, Enum):
    student = 'student'
    counselor = 'counselor'
    admin = 'admin'


class Segment(str, Enum):
    LEFT_ARM = 'LEFT_ARM'
    RIGHT_ARM = 'RIGHT_ARM'
    TRUNK = 'TRUNK'
    LEFT_LEG = 'LEFT_LEG'
    RIGHT_LEG = 'RIGHT_LEG'


SEGMENTS: list[Segment] = [Segment.LEFT_ARM, Segment.RIGHT_ARM, Segment.TRUNK, Segment.LEFT_LEG, Segment.RIGHT_LEG]
SEGMENT_LABEL_KO = {
    Segment.LEFT_ARM: '왼팔', Segment.RIGHT_ARM: '오른팔', Segment.TRUNK: '몸통',
    Segment.LEFT_LEG: '왼다리', Segment.RIGHT_LEG: '오른다리',
}


class Goal(str, Enum):
    MUSCLE_GAIN = 'MUSCLE_GAIN'
    FAT_MANAGEMENT = 'FAT_MANAGEMENT'
    GENERAL_FITNESS = 'GENERAL_FITNESS'
    BALANCE = 'BALANCE'
    GENERAL_HEALTH = 'GENERAL_HEALTH'


class ExperienceLevel(str, Enum):
    BEGINNER = 'BEGINNER'
    INTERMEDIATE = 'INTERMEDIATE'
    ADVANCED = 'ADVANCED'


# --- User -----------------------------------------------------------------------------------
class HealthUser(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    id: str
    name: str
    email: str = ''
    role: Role = Role.student
    school_id: Optional[str] = None
    share_with_center: bool = False
    gender: Literal['male', 'female', 'unspecified'] = 'unspecified'  # body model and reference-range lookup
    birth_date: Optional[str] = None
    height: Optional[float] = Field(default=None, ge=50, le=250)  # cm
    created_at: str = Field(default_factory=_now)


# --- Body composition -------------------------------------------------------------------------
class SegmentMeasurement(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    segment: Segment
    lean_mass_kg: Optional[float] = Field(default=None, ge=0)
    lean_reference_percent: Optional[float] = Field(default=None, ge=0)
    fat_mass_kg: Optional[float] = Field(default=None, ge=0)
    fat_reference_percent: Optional[float] = Field(default=None, ge=0)


class MeasurementValidation(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    @field_validator('measurement_date', check_fields=False)
    @classmethod
    def valid_measurement_date(cls, value):
        parsed = date.fromisoformat(value)
        if parsed > date.today():
            raise ValueError('미래 날짜의 측정값은 입력할 수 없습니다.')
        return parsed.isoformat()

    @model_validator(mode='after')
    def coherent_measurement(self):
        for name in ('weight', 'height', 'skeletal_muscle_mass', 'body_fat_mass', 'fat_free_mass',
                     'total_body_water', 'bmi', 'basal_metabolic_rate', 'visceral_fat_level', 'smi'):
            value = getattr(self, name, None)
            if value is not None and value < 0:
                raise ValueError(f'{name}: 음수는 허용되지 않습니다.')
        if self.weight is not None and self.weight == 0:
            raise ValueError('체중은 0보다 커야 합니다.')
        if self.height is not None and not 50 <= self.height <= 250:
            raise ValueError('키는 cm 단위로 입력하세요 (50–250).')
        if self.body_fat_percentage is not None and not 0 <= self.body_fat_percentage <= 100:
            raise ValueError('체지방률은 0–100% 범위입니다.')
        if self.weight is not None:
            for name in ('skeletal_muscle_mass', 'body_fat_mass', 'fat_free_mass', 'total_body_water'):
                value = getattr(self, name, None)
                if value is not None and value > self.weight:
                    raise ValueError(f'{name}: 체중보다 클 수 없습니다.')
        if len({s.segment for s in self.segments}) != len(self.segments):
            raise ValueError('측정 부위가 중복되었습니다.')
        return self


class BodyCompositionMeasurement(MeasurementValidation):
    external_measurement_id: Optional[str] = None
    id: str
    user_id: str
    measurement_date: str  # ISO date
    weight: Optional[float] = None
    height: Optional[float] = None
    bmi: Optional[float] = None
    skeletal_muscle_mass: Optional[float] = None
    body_fat_mass: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    fat_free_mass: Optional[float] = None
    total_body_water: Optional[float] = None
    basal_metabolic_rate: Optional[float] = None
    waist_circumference: Optional[float] = Field(default=None,ge=30,le=250,allow_inf_nan=False)
    visceral_fat_level: Optional[float] = None
    smi: Optional[float] = None
    device_name: str = ''
    source: str = 'manual'  # provider name: mock | manual | csv | inbody | biogram
    segments: list[SegmentMeasurement] = Field(default_factory=list)
    created_at: str = Field(default_factory=_now)


class BodyCompositionCreateRequest(MeasurementValidation):
    measurement_date: str
    weight: Optional[float] = None
    height: Optional[float] = None
    bmi: Optional[float] = None
    skeletal_muscle_mass: Optional[float] = None
    body_fat_mass: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    fat_free_mass: Optional[float] = None
    total_body_water: Optional[float] = None
    basal_metabolic_rate: Optional[float] = None
    waist_circumference: Optional[float] = Field(default=None,ge=30,le=250,allow_inf_nan=False)
    visceral_fat_level: Optional[float] = None
    smi: Optional[float] = None
    device_name: str = ''
    source: str = 'manual'
    segments: list[SegmentMeasurement] = Field(default_factory=list)


# --- Reference ranges --------------------------------------------------------------------------
class ReferenceRange(BaseModel):
    source_url: Optional[str] = None
    license_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    measurement_method: Optional[str] = None
    compatible_device_names: list[str] = Field(default_factory=list)
    model_config = ConfigDict(allow_inf_nan=False)
    id: str
    gender: str  # 'male' | 'female' | 'any'
    age_min: int
    age_max: int
    height_min: Optional[float] = None
    height_max: Optional[float] = None
    segment: Segment
    lean_mean: Optional[float] = None
    lean_lower: Optional[float] = None
    lean_upper: Optional[float] = None
    fat_mean: Optional[float] = None
    fat_lower: Optional[float] = None
    fat_upper: Optional[float] = None
    publication: Optional[str] = None
    version: Optional[str] = None
    effective_date: Optional[str] = None
    unit: str = 'kg'
    interpretation: str = '설명용 참고 범위이며 진단 기준이 아닙니다.'
    source: str = 'demo'  # never used in production average comparisons
    dataset_id: Optional[str] = None
    reference_population: Optional[str] = None
    sample_size: Optional[int] = Field(default=None, gt=0)
    bmi_min: Optional[float] = Field(default=None, gt=0)
    bmi_max: Optional[float] = Field(default=None, gt=0)
    weight_min: Optional[float] = Field(default=None, gt=0)
    weight_max: Optional[float] = Field(default=None, gt=0)
    skeletal_muscle_mean: Optional[float] = Field(default=None, gt=0)
    body_fat_mean: Optional[float] = Field(default=None, ge=0)

    @model_validator(mode='after')
    def valid_reference(self):
        for lo, hi in [('age_min','age_max'), ('height_min','height_max'), ('bmi_min','bmi_max'),
                       ('weight_min','weight_max'), ('lean_lower','lean_upper'), ('fat_lower','fat_upper')]:
            a, b = getattr(self, lo), getattr(self, hi)
            if a is not None and b is not None and a > b:
                raise ValueError('Reference lower bound exceeds upper bound')
        for key in ('lean_mean','fat_mean','lean_lower','lean_upper','fat_lower','fat_upper'):
            v = getattr(self,key)
            if v is not None and v < 0: raise ValueError('Negative reference mass')
        if self.effective_date: date.fromisoformat(self.effective_date)
        return self


# --- Exercise profile / routines ----------------------------------------------------------------
class ExerciseProfile(BaseModel):
    user_id: str
    experience_level: ExperienceLevel = ExperienceLevel.BEGINNER
    goal: Goal = Goal.GENERAL_HEALTH
    days_per_week: int = Field(default=3, ge=1, le=7)
    minutes_per_session: int = Field(default=40, ge=10, le=180)
    training_mode: Literal['mixed','bodyweight','equipment'] = 'mixed'
    exercise_location: Literal['gym', 'home', 'outdoor'] = 'gym'  # 'gym' | 'home' | 'outdoor'
    available_equipment: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    preferences: list[str] = Field(default_factory=list)
    # Safety screening (section 21) -- if any is true, routine generation is refused server-side.
    safety_chest_pain: bool = False
    safety_fainting: bool = False
    safety_breathlessness: bool = False
    safety_acute_injury: bool = False
    safety_medical_restriction: bool = False


class RoutineExercise(BaseModel):
    training_type: str = 'bodyweight'
    equipment: list[str] = Field(default_factory=list)
    dose_type: str = 'reps'
    hold_seconds: Optional[int] = None
    exercise_id: Optional[str] = None
    motion_id: Optional[str] = None
    instructions: list[str] = Field(default_factory=list)
    cautions: list[str] = Field(default_factory=list)
    target_regions: list[str] = Field(default_factory=list)
    intensity: str = ''
    estimated_minutes: float = 0
    day_number: int
    exercise_name: str
    sets: Optional[int] = None
    reps: Optional[str] = None
    duration: Optional[str] = None
    rest_seconds: Optional[int] = None
    reason: str = ''


class ExerciseRoutine(BaseModel):
    id: str
    user_id: str
    created_at: str = Field(default_factory=_now)
    based_on_measurement_id: Optional[str] = None
    goal: str = ''
    summary: str = ''
    duration_weeks: int = 6
    days_per_week: int = Field(default=3, ge=1, le=7)
    exercises: list[RoutineExercise] = Field(default_factory=list)
    generated_by: str = 'deterministic'  # 'deterministic' | 'llm'
    algorithm_version: str = 'legacy'
    rationale: list[str] = Field(default_factory=list)
    notices: list[str] = Field(default_factory=list)
    input_snapshot: dict = Field(default_factory=dict)
    day_minutes: dict[str, float] = Field(default_factory=dict)
    progression: str = ''
    sources: list[dict[str, str]] = Field(default_factory=list)
    schedule: list[str] = Field(default_factory=list)


# --- Workout log -------------------------------------------------------------------------------
class WorkoutSet(BaseModel):
    # External load only; bodyweight and unknown load remain null, never inferred.
    weight_kg: Optional[float] = Field(default=None, ge=0, le=1000, allow_inf_nan=False)
    reps: int = Field(ge=0, le=1000)
    kind: Literal['working', 'warmup'] = 'working'


class WorkoutLog(BaseModel):
    request_checksum: Optional[str] = None
    completion_status: Optional[Literal['not_started','partial','completed','stopped']] = None
    time_zone: str = Field(default='UTC', max_length=80)
    performed_seconds: Optional[float] = Field(default=None, ge=0, le=86400, allow_inf_nan=False)
    timed_sets_seconds: list[float] = Field(default_factory=list, max_length=100)

    @field_validator('time_zone')
    @classmethod
    def valid_zone(cls, value):
        from .workout_rules import workout_zone
        workout_zone(value)
        return value

    @field_validator('timed_sets_seconds')
    @classmethod
    def valid_times(cls, values):
        import math
        if any(not math.isfinite(v) or v < 0 or v > 86400 for v in values) or sum(values) > 86400:
            raise ValueError('시간 기록은 0–86400초 범위여야 합니다.')
        return values

    exercise_catalog_id: Optional[str] = None
    set_records: list[WorkoutSet] = Field(default_factory=list, max_length=100)
    revision: int = Field(default=1, ge=1)
    mutation_id: Optional[str] = None
    rpe: Optional[int] = Field(default=None,ge=1,le=10)
    pain: Optional[int] = Field(default=None,ge=0,le=10)
    pose_evaluation: Optional[dict] = None
    actual_minutes: Optional[float] = Field(default=None, ge=0, le=1440, allow_inf_nan=False)
    routine_exercise_id: Optional[str] = None
    day_number: Optional[int] = None
    id: str
    user_id: str
    routine_id: Optional[str] = None
    date: str
    exercise_name: str
    sets_completed: Optional[int] = Field(default=None,ge=0,le=100)
    reps_completed: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[Literal['easy', 'moderate', 'hard', 'pain']] = None  # 'easy' | 'moderate' | 'hard'
    completed: bool = True
    memo: str = Field(default='',max_length=2000)
    created_at: str = Field(default_factory=_now)


class WorkoutLogCreateRequest(BaseModel):
    time_zone: str = Field(default='UTC', max_length=80)
    performed_seconds: Optional[float] = Field(default=None, ge=0, le=86400, allow_inf_nan=False)
    timed_sets_seconds: list[float] = Field(default_factory=list, max_length=100)

    @field_validator('time_zone')
    @classmethod
    def valid_zone(cls, value):
        from .workout_rules import workout_zone
        workout_zone(value)
        return value

    @field_validator('timed_sets_seconds')
    @classmethod
    def valid_times(cls, values):
        import math
        if any(not math.isfinite(v) or v < 0 or v > 86400 for v in values) or sum(values) > 86400:
            raise ValueError('시간 기록은 0–86400초 범위여야 합니다.')
        return values

    set_records: list[WorkoutSet] = Field(default_factory=list, max_length=100)
    expected_revision: int = Field(default=0, ge=0)
    mutation_id: Optional[str] = Field(default=None, max_length=80)
    rpe: Optional[int] = Field(default=None,ge=1,le=10)
    pain: Optional[int] = Field(default=None,ge=0,le=10)
    pose_evaluation: Optional[dict] = None
    actual_minutes: Optional[float] = Field(default=None, ge=0, le=1440, allow_inf_nan=False)
    routine_exercise_id: Optional[str] = None
    day_number: Optional[int] = Field(default=None, ge=1, le=7)
    routine_id: Optional[str] = None
    date: str
    exercise_name: str
    sets_completed: Optional[int] = Field(default=None,ge=0,le=100)
    reps_completed: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[Literal['easy', 'moderate', 'hard', 'pain']] = None
    completed: bool = True
    memo: str = Field(default='',max_length=2000)


# --- AI Health Analysis --------------------------------------------------------------------------
class HealthAnalysis(BaseModel):
    id: str
    user_id: str
    measurement_id: str
    summary: str
    priority_area: list[str] = Field(default_factory=list)
    balance_analysis: str = ''
    body_fat_analysis: str = ''
    progress_analysis: str = ''
    recommendations: list[str] = Field(default_factory=list)
    counselor_questions: list[str] = Field(default_factory=list)
    generated_by: str = 'deterministic'
    created_at: str = Field(default_factory=_now)


class HealthAgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class CounselorNote(BaseModel):
    school_id: Optional[str] = None
    id: str
    student_id: str
    counselor_id: str
    note: str
    created_at: str = Field(default_factory=_now)


class CounselorNoteCreateRequest(BaseModel):
    note: str


# --- Generic HealthMetric (section 29 -- future expansion) ---------------------------------------
class HealthMetric(BaseModel):
    """Generic slot for future metric types (blood_pressure, blood_glucose, sleep, ...) that aren't
    body composition. Not populated by the MVP's demo data; exists so the schema/API surface doesn't
    need a breaking change when a new metric type is added."""
    id: str
    user_id: str
    metric_type: str
    measured_at: str
    value: dict = Field(default_factory=dict)
    source: str = 'manual'
