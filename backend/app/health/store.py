"""SQLite-backed persistence for Synex Health.

Same hand-rolled-repository shape as SynexAgent's services/audit.py and services/repositories.py --
no ORM, one small class per resource, easy to later swap the backing store without changing callers.
Unlike SynexAgent's Clinical Workspace (which keeps patient data in-memory via an EMR adapter),
Health data is genuinely persisted here: measurements/routines/workouts must survive a server
restart between a student's first measurement and their re-measurement weeks later.
"""
import json, os, sqlite3, uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from .schemas import (
    HealthUser, BodyCompositionMeasurement, SegmentMeasurement, ReferenceRange, ExerciseProfile,
    ExerciseRoutine, RoutineExercise, WorkoutLog, HealthAnalysis, CounselorNote, Segment,
)

DEFAULT_PATH = Path(__file__).resolve().parents[2] / 'data' / 'health.sqlite3'


def new_id(prefix: str) -> str:
    return f'{prefix}-{uuid.uuid4().hex[:12]}'


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class HealthStore:
    def __init__(self, path=None):
        self.path = str(path or os.getenv('SYNEX_HEALTH_DB_PATH', DEFAULT_PATH))
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('''CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, role TEXT NOT NULL,
                gender TEXT, birth_date TEXT, height REAL, created_at TEXT NOT NULL)''')
            db.execute('''CREATE TABLE IF NOT EXISTS measurements (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, measurement_date TEXT NOT NULL,
                payload TEXT NOT NULL, created_at TEXT NOT NULL)''')
            db.execute('CREATE INDEX IF NOT EXISTS idx_meas_user_date ON measurements(user_id, measurement_date)')
            db.execute('''CREATE TABLE IF NOT EXISTS reference_ranges (
                id TEXT PRIMARY KEY, payload TEXT NOT NULL)''')
            db.execute('''CREATE TABLE IF NOT EXISTS exercise_profiles (
                user_id TEXT PRIMARY KEY, payload TEXT NOT NULL)''')
            db.execute('''CREATE TABLE IF NOT EXISTS routines (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)''')
            db.execute('CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id, created_at)')
            db.execute('''CREATE TABLE IF NOT EXISTS workouts (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL, payload TEXT NOT NULL)''')
            db.execute('CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date)')
            db.execute('''CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, measurement_id TEXT NOT NULL,
                payload TEXT NOT NULL, created_at TEXT NOT NULL)''')
            db.execute('''CREATE TABLE IF NOT EXISTS counselor_notes (
                id TEXT PRIMARY KEY, student_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL)''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        try:
            with db:
                yield db
        finally:
            db.close()

    # --- Users -----------------------------------------------------------------------------
    def upsert_user(self, u: HealthUser) -> HealthUser:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO users VALUES (?,?,?,?,?,?,?,?)',
                       (u.id, u.name, u.email, u.role.value if hasattr(u.role, 'value') else u.role,
                        u.gender, u.birth_date, u.height, u.created_at))
        return u

    def get_user(self, user_id: str) -> HealthUser | None:
        with self.connect() as db:
            row = db.execute('SELECT id,name,email,role,gender,birth_date,height,created_at FROM users WHERE id=?', (user_id,)).fetchone()
        if row is None:
            return None
        return HealthUser(id=row[0], name=row[1], email=row[2] or '', role=row[3], gender=row[4] or 'unspecified',
                           birth_date=row[5], height=row[6], created_at=row[7])

    def list_students(self) -> list[HealthUser]:
        with self.connect() as db:
            rows = db.execute("SELECT id,name,email,role,gender,birth_date,height,created_at FROM users WHERE role='student'").fetchall()
        return [HealthUser(id=r[0], name=r[1], email=r[2] or '', role=r[3], gender=r[4] or 'unspecified',
                            birth_date=r[5], height=r[6], created_at=r[7]) for r in rows]

    # --- Measurements ------------------------------------------------------------------------
    def add_measurement(self, m: BodyCompositionMeasurement) -> BodyCompositionMeasurement:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO measurements VALUES (?,?,?,?,?)',
                       (m.id, m.user_id, m.measurement_date, m.model_dump_json(), m.created_at))
        return m

    def list_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        with self.connect() as db:
            rows = db.execute('SELECT payload FROM measurements WHERE user_id=? ORDER BY measurement_date ASC', (user_id,)).fetchall()
        return [BodyCompositionMeasurement.model_validate_json(r[0]) for r in rows]

    def get_measurement(self, measurement_id: str) -> BodyCompositionMeasurement | None:
        with self.connect() as db:
            row = db.execute('SELECT payload FROM measurements WHERE id=?', (measurement_id,)).fetchone()
        return BodyCompositionMeasurement.model_validate_json(row[0]) if row else None

    def latest_measurement(self, user_id: str) -> BodyCompositionMeasurement | None:
        items = self.list_measurements(user_id)
        return items[-1] if items else None

    def previous_measurement(self, user_id: str, before_id: str) -> BodyCompositionMeasurement | None:
        items = self.list_measurements(user_id)
        idx = next((i for i, m in enumerate(items) if m.id == before_id), None)
        if idx is None or idx == 0:
            return None
        return items[idx - 1]

    # --- Reference ranges --------------------------------------------------------------------
    def add_reference_range(self, r: ReferenceRange) -> ReferenceRange:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO reference_ranges VALUES (?,?)', (r.id, r.model_dump_json()))
        return r

    def list_reference_ranges(self) -> list[ReferenceRange]:
        with self.connect() as db:
            rows = db.execute('SELECT payload FROM reference_ranges').fetchall()
        return [ReferenceRange.model_validate_json(r[0]) for r in rows]

    def find_reference(self, *, gender: str, age: int | None, height: float | None, segment: Segment) -> ReferenceRange | None:
        candidates = [r for r in self.list_reference_ranges() if r.segment == segment and (r.gender == 'any' or r.gender == gender)]
        if age is not None:
            candidates = [r for r in candidates if r.age_min <= age <= r.age_max] or candidates
        if height is not None:
            in_height = [r for r in candidates if (r.height_min is None or height >= r.height_min) and (r.height_max is None or height <= r.height_max)]
            if in_height:
                candidates = in_height
        return candidates[0] if candidates else None

    # --- Exercise profile ----------------------------------------------------------------------
    def upsert_profile(self, p: ExerciseProfile) -> ExerciseProfile:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO exercise_profiles VALUES (?,?)', (p.user_id, p.model_dump_json()))
        return p

    def get_profile(self, user_id: str) -> ExerciseProfile | None:
        with self.connect() as db:
            row = db.execute('SELECT payload FROM exercise_profiles WHERE user_id=?', (user_id,)).fetchone()
        return ExerciseProfile.model_validate_json(row[0]) if row else None

    # --- Routines --------------------------------------------------------------------------------
    def add_routine(self, r: ExerciseRoutine) -> ExerciseRoutine:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO routines VALUES (?,?,?,?)', (r.id, r.user_id, r.model_dump_json(), r.created_at))
        return r

    def list_routines(self, user_id: str) -> list[ExerciseRoutine]:
        with self.connect() as db:
            rows = db.execute('SELECT payload FROM routines WHERE user_id=? ORDER BY created_at DESC', (user_id,)).fetchall()
        return [ExerciseRoutine.model_validate_json(r[0]) for r in rows]

    def get_routine(self, routine_id: str) -> ExerciseRoutine | None:
        with self.connect() as db:
            row = db.execute('SELECT payload FROM routines WHERE id=?', (routine_id,)).fetchone()
        return ExerciseRoutine.model_validate_json(row[0]) if row else None

    def latest_routine(self, user_id: str) -> ExerciseRoutine | None:
        items = self.list_routines(user_id)
        return items[0] if items else None

    # --- Workouts ------------------------------------------------------------------------------
    def add_workout(self, w: WorkoutLog) -> WorkoutLog:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO workouts VALUES (?,?,?,?)', (w.id, w.user_id, w.date, w.model_dump_json()))
        return w

    def list_workouts(self, user_id: str) -> list[WorkoutLog]:
        with self.connect() as db:
            rows = db.execute('SELECT payload FROM workouts WHERE user_id=? ORDER BY date DESC', (user_id,)).fetchall()
        return [WorkoutLog.model_validate_json(r[0]) for r in rows]

    # --- Analyses -------------------------------------------------------------------------------
    def add_analysis(self, a: HealthAnalysis) -> HealthAnalysis:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO analyses VALUES (?,?,?,?,?)',
                       (a.id, a.user_id, a.measurement_id, a.model_dump_json(), a.created_at))
        return a

    def latest_analysis(self, user_id: str) -> HealthAnalysis | None:
        with self.connect() as db:
            row = db.execute('SELECT payload FROM analyses WHERE user_id=? ORDER BY created_at DESC LIMIT 1', (user_id,)).fetchone()
        return HealthAnalysis.model_validate_json(row[0]) if row else None

    # --- Counselor notes --------------------------------------------------------------------------
    def add_counselor_note(self, n: CounselorNote) -> CounselorNote:
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO counselor_notes VALUES (?,?,?,?)', (n.id, n.student_id, n.model_dump_json(), n.created_at))
        return n

    def list_counselor_notes(self, student_id: str) -> list[CounselorNote]:
        with self.connect() as db:
            rows = db.execute('SELECT payload FROM counselor_notes WHERE student_id=? ORDER BY created_at DESC', (student_id,)).fetchall()
        return [CounselorNote.model_validate_json(r[0]) for r in rows]
