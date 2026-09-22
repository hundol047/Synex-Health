# Synex Health

대학 건강센터에서 측정되는 체성분 및 건강데이터를 통합하여 사용자의 신체 상태를 3D Body Map으로
시각화하고, AI가 이를 분석해 개인 맞춤형 운동 및 건강관리 방향을 제공하며, 재측정 결과에 따라
관리전략을 자동으로 조정하는 AI 기반 개인 건강관리 플랫폼입니다.

핵심 흐름(Closed loop): **측정 → 이해(3D 시각화 + AI 분석) → 실행(맞춤 운동) → 재측정 → 개선(루틴
자동 재설계)**.

> Synex Health는 [SynexAgent](https://github.com/hundol047/YMAS-GPT-6-Astra)(의료진 대상 Clinical
> Copilot MVP)와 자매 서비스입니다. 이 저장소는 SynexAgent의 아키텍처 패턴(RBAC 인증, 감사 로그,
> API 클라이언트, adapter 구조, FastAPI+React/Vite 스택)을 재사용하되, 학생/건강센터 대상의 완전히
> 새로운 Health 기능을 구현합니다. SynexAgent 저장소 자체는 수정하지 않았습니다.


## 이번 업데이트 (v2)

- **개인별 운동 추천**: 체중·키·골격근량·측정 변화, 목표·경험·시간·장소·장비·제약 및 실제 수행 피드백을 반영. 결정 이유·시간·자료 출처를 화면에 표시합니다. 모든 사람에게 최적임을 입증한 처방은 아닙니다.
- **14개 운동 동작 모션**: 자체 제작 애니메이션, 재생·정지·느린 재생·구간 이동·좌우 반전 및 단계별 자세 안내. 외부 영상 URL이나 API 없이 동작합니다.
- **재측정 후 계획 갱신**: 프로필 화면에서 측정값 입력 → 기존 루틴 자동 재검토. 통증·문진 문제로 갱신이 차단되면 이전 계획을 최신 계획으로 오인하지 않도록 표시합니다.
- **남녀 3D 인체 모형**: 프로필 성별에 따라 어깨·허리·골반·팔다리 비율이 달라집니다. 미지정은 중립 모형. 손·발·얼굴, 정면·후면·좌우 보기 제공.
- **학교 선택**: 20개 학교/캠퍼스 검색·선택, 학교 추가 요청, 관리자 추가 등록, 상담사 소속 배정. 공식 학교·장비 연동은 `미연결`로 명시합니다.
- **학교별 공유**: 해당 학교 + 공유 동의 학생만 상담사가 조회. 측정 ID나 루틴 ID를 직접 요청해도 같은 권한 검사 적용.
- **오류 수정**: 타인 운동 프로필 덮어쓰기 차단, 누락 데이터를 개선으로 계산하던 오류, 좌우 동일한데 한쪽을 약하다고 하던 오류, 장비 미선택 시 덤벨 추천, 시간·제약 무시, 운동 기록 중복·완료율 왜곡, 서버 재시작 시 프로필 초기화 등.

설계 근거와 한계: [운동 알고리즘](docs/EXERCISE_ALGORITHM.md) · [학교 연동 준비](docs/SCHOOLS.md) · [인체 모형](docs/BODY_3D.md).

### 확인 순서

1. `/health/profile`: 학교 선택 → 공유 동의 선택 → 저장. 성별/운동환경 입력 후 아래 저장 버튼 클릭.
2. 같은 화면에서 결과지의 체중·키·골격근량·부위값 입력.
3. `/health/body`: 성별 인체 모형과 정면/후면/좌우 및 부위 선택 확인.
4. `/health/routine`: 루틴 생성 → 추천 이유 확인 → 운동의 **동작 보기** → **동작 재생**.
5. `/health/workout`: 완료·난이도·통증 기록. 재측정 후 새로운 루틴 조정 이유 확인.
6. 데모 역할을 상담사로 바꾸어 동의한 같은 학교 학생만 보이는지 확인.

## 아키텍처

```
Synex Health
├── backend/                FastAPI (Python)
│   app/
│     main.py                CORS, lifespan(demo seed), 정적 프론트엔드 서빙
│     services/               auth.py(RBAC), audit.py, idempotency.py -- SynexAgent 재사용 패턴
│     health/
│       schemas.py             Pydantic 모델 (User/BodyCompositionMeasurement/SegmentMeasurement/
│                               ReferenceRange/ExerciseProfile/ExerciseRoutine/WorkoutLog/
│                               HealthAnalysis/CounselorNote/HealthMetric)
│       store.py                SQLite 기반 저장소 (감사로그와 동일한 hand-rolled repository 패턴)
│       providers/              HealthDataProvider adapter: Mock/Manual/CSV(동작) + InBody/Biogram(구조만, 501)
│       comparison.py           좌우 균형·기준 비교·재측정 델타 계산 (순수 함수)
│       exercise_engine.py      운동 루틴 생성 엔진 + JSON 스키마 검증 + fallback
│       health_agent.py         AI Health Agent (deterministic 기본, ANTHROPIC_API_KEY 및 ANTHROPIC_MODEL 설정 시 분석/대화 LLM 모드)
│       router.py               /api/* 엔드포인트
│       demo_seed.py            데모 계정/측정/기준값 시드
│   prompts/                    health_analysis.md / exercise_generation.md / progress_analysis.md /
│                               counselor_summary.md
│   tests/test_health.py        CRUD/비교/밸런스/루틴 JSON 검증/AI fallback/RBAC 테스트
├── frontend/                React 19 + Vite + react-router-dom
│   src/
│     shared/                  공통 레이아웃, UI 컴포넌트, 디자인 토큰(White+Blue), API 클라이언트
│     health/
│       pages/                  /health, /health/body, /health/comparison, /health/routine,
│                               /health/workout, /health/progress, /health/agent, /health/profile,
│                               /health-center (건강센터 상담사)
│       components/body3d/      CC0 인체 표면 메시 기반 3D Body Map (5개 측정 부위 기준)
│       lib/                    bodyMapColors.js (모드별 색상 매핑)
└── docs/                    DATA_ACCURACY.md / PROVIDERS.md / BODY_3D.md
```

## 실행 방법

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# 테스트 실행 시: pip install pytest
# 기본값으로 데모 실행 가능. 외부 AI/OIDC 설정은 환경변수로 전달하세요.
# .env.example은 설정 예시이며 .env 파일은 자동으로 로드되지 않습니다.
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 , /api 요청은 자동으로 backend:8000 으로 프록시됨
```

프로덕션 빌드(백엔드가 정적 파일까지 서빙):

```bash
cd frontend && npm run build   # frontend/dist 생성
cd ../backend && python -m uvicorn app.main:app --port 8000   # http://localhost:8000 에서 전체 앱 서빙
```

### 환경변수

`backend/.env.example` 참고. 주요 항목:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `AUTH_MODE` | `demo` | `demo`\|`oidc` |
| `HEALTH_AGENT_MODE` | `deterministic` | `deterministic`\|`llm` (llm은 `ANTHROPIC_API_KEY`와 계정에서 사용 가능한 `ANTHROPIC_MODEL` 필요, 미설정/실패 시 자동으로 deterministic으로 폴백) |
| `SYNEX_CORS_ORIGINS` | `http://localhost:5173,...` | 프론트엔드 dev 서버 |
| `SYNEX_HEALTH_DEMO_SEED` | `true` | 데모 학생/상담사/기준값 자동 시드 |

Docker: `docker-compose up --build` (backend/frontend를 하나의 이미지로 빌드해 `:8000`에서 서빙).

## 데모 로그인

실제 로그인 화면 대신 데모 모드 역할 전환(우측 상단 학생/상담사 토글)을 사용합니다 — SynexAgent의
데모 모드 인증 패턴과 동일한 접근입니다.

- **학생**: 김지민 (`student-jimin`) — 측정 2건(2026-03-12, 2026-06-14), 운동 프로필, 기준값 시드됨
- **상담사**: `counselor-demo` — 학생 로스터 조회, 3D Body/비교/AI 요약, 상담 메모 작성 가능
- **관리자**: `admin-demo` — 기준값(ReferenceRange) 등록 권한 (API로만 노출, UI 없음)

## 테스트

```bash
cd backend && source .venv/bin/activate && python -m pytest -q
cd frontend && npm test
```

## 알려진 제약 / 향후 실제 연동이 필요한 부분

- **InBody / Biogram 공식 API**: 이 환경에는 공식 API 인증정보·연동 계약이 없어 `InBodyProvider`/
  `BiogramProvider`는 구조만 준비되어 있고 호출 시 501을 반환합니다 (`docs/PROVIDERS.md`). 실제
  키·승인된 API 사양·학교별 사용자 매칭·동의 절차를 확보한 뒤 어댑터와 호출 경로를 구현하고 검증해야 합니다.
- **학교 SSO**: `AUTH_MODE=oidc`가 JWKS 기반 토큰 검증을 지원하지만, 실제 학교 IdP를 상대로 검증된
  적은 없습니다.
- **실제 기준(Reference) 데이터셋**: 현재 `ReferenceRange`는 데모용 placeholder이며 `source=demo`로
  명시됩니다. 실제 임상/통계 기준 데이터를 관리자가 `POST /api/admin/reference-ranges`로 등록하면
  즉시 반영됩니다(코드 변경 불필요).
- **3D Body Map 에셋**: MakeHuman CC0 성인 인체 표면 메시를 사용합니다. 남성·여성·중립 외형,
  얼굴·손가락·발가락과 연속적인 관절 표면을 표시합니다. 한 손가락 회전·두 손가락 확대/축소를
  지원합니다. 개인 스캔·임상 해부학 모델은 아닙니다. 출처·재생성 방법은 [3D 모형 문서](docs/BODY_3D.md)에 있습니다.

## Android · iOS 앱 / 멤버십

`frontend/android`와 `frontend/ios`에 Capacitor 기반 Android Studio·Xcode 프로젝트를 추가했습니다. `frontend`에서 `npm ci`, 운영 HTTPS API 설정 후 `npm run mobile:sync`로 앱 번들을 동기화합니다. `npm run android` / `npm run ios`로 각 IDE에서 실행합니다. 서명·실기기 검증·스토어 등록은 별도입니다.

`/health/subscription`에서 Free/Plus와 구독 상태를 확인합니다. Free 기능은 유지되며 Plus는 서버에서 구독 권한을 확인한 월별 리포트를 제공합니다. 결제 미연결 상태가 기본입니다. 개발 시 `AUTH_MODE=demo BILLING_MODE=demo`로 무과금 시연을 사용할 수 있습니다. 실제 구매/복원은 RevenueCat·스토어 연결 후 앱에서 제공합니다.

설정, 인증, 구독 검증 구조, 아직 검증하지 않은 항목은 [모바일·구독 가이드](docs/MOBILE_AND_SUBSCRIPTIONS.md)에 정리했습니다.

## Digital Twin / Exercise Coach 확장

체성분 기반 부위별 morph, 설명용 레이어·단면, Before/After 카메라 동기화,
44개 운동 및 사람형 3D 동작 시범, 스쿼트 카메라 코치, 목표·캘린더,
개인정보 삭제/내보내기, 다학교 SSO/provider adapter, HealthKit/Health Connect,
로컬 알림과 운영용 PostgreSQL 전환 구조를 추가했습니다.

구현 범위·외부 연결 조건·설치·라이선스·미검증 항목은
[docs/DIGITAL_TWIN_UPGRADE.md](docs/DIGITAL_TWIN_UPGRADE.md)를 확인하세요.
카메라 모델은 `cd frontend && npm run pose:setup` 후 빌드해야 합니다.
실제 인체 스캔·의료 해부학·임상적으로 검증된 운동 처방을 제공하는 서비스는 아닙니다.
