"""Seeds the bundled demo accounts (section 33) -- one demo student with two real hand-authored
measurements (see providers/mock.py's DEMO_READINGS), one demo counselor, one demo admin. Runs once
at startup; idempotent (re-running on an already-seeded DB just no-ops via INSERT OR REPLACE on the
same ids)."""
from __future__ import annotations
from .schemas import HealthUser, ExerciseProfile, Goal, ExperienceLevel, Segment, ReferenceRange
from .store import HealthStore, new_id
from .providers.mock import MockProvider

DEMO_STUDENT_ID = 'student-jimin'
DEMO_COUNSELOR_ID = 'counselor-demo'
DEMO_ADMIN_ID = 'admin-demo'


def seed_demo_data(store: HealthStore) -> None:
    accounts = [
        HealthUser(id=DEMO_STUDENT_ID, name='김지민', email='jimin.demo@university.ac.kr', role='student', gender='female',
                   birth_date='2005-04-02', height=165, school_id='yonsei-mirae', share_with_center=True),
        HealthUser(id=DEMO_COUNSELOR_ID, name='건강센터 상담사', role='counselor', school_id='yonsei-mirae'),
        HealthUser(id=DEMO_ADMIN_ID, name='관리자', role='admin'),
    ]
    for account in accounts:
        if store.get_user(account.id) is None:
            store.upsert_user(account)

    if not store.list_measurements(DEMO_STUDENT_ID):
        MockProvider(store).seed_demo_readings(DEMO_STUDENT_ID)

    if not store.get_profile(DEMO_STUDENT_ID):
        store.upsert_profile(ExerciseProfile(user_id=DEMO_STUDENT_ID, experience_level=ExperienceLevel.BEGINNER,
                                              goal=Goal.BALANCE, days_per_week=3, minutes_per_session=40,
                                              exercise_location='gym', available_equipment=['dumbbell'],
                                              limitations=[], preferences=['하체 균형 개선']))

    # Demo reference ranges (explicitly source='demo' -- see ReferenceRange docstring / section 13).
    # Loosely typical young-adult-female lean/fat mass bands per segment; NOT a validated clinical
    # dataset -- an admin can register a real one via POST /api/admin/reference-ranges without any
    # code change (find_reference() in store.py always prefers whatever is registered).
    if not store.list_reference_ranges():
        demo_bands = {
            Segment.LEFT_ARM: (2.0, 0.55), Segment.RIGHT_ARM: (2.05, 0.55),
            Segment.TRUNK: (19.5, 7.0), Segment.LEFT_LEG: (6.4, 2.4), Segment.RIGHT_LEG: (6.4, 2.4),
        }
        for seg, (lean_mean, fat_mean) in demo_bands.items():
            store.add_reference_range(ReferenceRange(
                id=new_id('REF'), gender='female', age_min=18, age_max=29, height_min=150, height_max=175,
                segment=seg, lean_mean=lean_mean, lean_lower=lean_mean * 0.85, lean_upper=lean_mean * 1.15,
                fat_mean=fat_mean, fat_lower=fat_mean * 0.7, fat_upper=fat_mean * 1.3, source='demo'))
