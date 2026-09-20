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
from pydantic import BaseModel, Field


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
    id: str
    name: str
    email: str = ''
    role: Role = Role.student
    gender: str = 'unspecified'  # 'male' | 'female' | 'unspecified' -- only used for reference-range lookup
    birth_date: Optional[str] = None
    height: Optional[float] = None  # cm
    created_at: str = Field(default_factory=_now)


# --- Body composition -------------------------------------------------------------------------
class SegmentMeasurement(BaseModel):
    segment: Segment
    lean_mass_kg: Optional[float] = None
    lean_reference_percent: Optional[float] = None
    fat_mass_kg: Optional[float] = None
    fat_reference_percent: Optional[float] = None


class BodyCompositionMeasurement(BaseModel):
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


class BodyCompositionCreateRequest(BaseModel):
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
    days_per_week: int = 3
    minutes_per_session: int = 40
    exercise_location: str = 'gym'  # 'gym' | 'home' | 'outdoor'
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
    days_per_week: int = 3
    exercises: list[RoutineExercise] = Field(default_factory=list)
    generated_by: str = 'deterministic'  # 'deterministic' | 'llm'


# --- Workout log -------------------------------------------------------------------------------
class WorkoutLog(BaseModel):
    id: str
    user_id: str
    routine_id: Optional[str] = None
    date: str
    exercise_name: str
    sets_completed: Optional[int] = None
    reps_completed: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[str] = None  # 'easy' | 'moderate' | 'hard'
    completed: bool = True
    memo: str = ''
    created_at: str = Field(default_factory=_now)


class WorkoutLogCreateRequest(BaseModel):
    routine_id: Optional[str] = None
    date: str
    exercise_name: str
    sets_completed: Optional[int] = None
    reps_completed: Optional[str] = None
    duration: Optional[str] = None
    difficulty: Optional[str] = None
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
