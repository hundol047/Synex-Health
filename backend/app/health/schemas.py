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
    visceral_fat_level: Optional[float] = None
    smi: Optional[float] = None
    device_name: str = ''
    source: str = 'manual'
    segments: list[SegmentMeasurement] = Field(default_factory=list)


# --- Reference ranges --------------------------------------------------------------------------
class ReferenceRange(BaseModel):
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
    source: str = 'demo'  # 'demo' unless an admin has registered a real reference dataset


# --- Exercise profile / routines ----------------------------------------------------------------
class ExerciseProfile(BaseModel):
    user_id: str
    experience_level: ExperienceLevel = ExperienceLevel.BEGINNER
    goal: Goal = Goal.GENERAL_HEALTH
    days_per_week: int = Field(default=3, ge=1, le=7)
    minutes_per_session: int = Field(default=40, ge=10, le=180)
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
class WorkoutLog(BaseModel):
    routine_exercise_id: Optional[str] = None
    day_number: Optional[int] = None
    id: str
    user_id: str
    routine_id: Optional[str] = None
    date: str
    exercise_name: str
    sets_completed: Optional[int] = None
    reps_completed: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[Literal['easy', 'moderate', 'hard', 'pain']] = None  # 'easy' | 'moderate' | 'hard'
    completed: bool = True
    memo: str = ''
    created_at: str = Field(default_factory=_now)


class WorkoutLogCreateRequest(BaseModel):
    routine_exercise_id: Optional[str] = None
    day_number: Optional[int] = Field(default=None, ge=1, le=7)
    routine_id: Optional[str] = None
    date: str
    exercise_name: str
    sets_completed: Optional[int] = None
    reps_completed: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[Literal['easy', 'moderate', 'hard', 'pain']] = None
    completed: bool = True
    memo: str = ''


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
