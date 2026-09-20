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
│       health_agent.py         AI Health Agent (deterministic 기본, ANTHROPIC_API_KEY 설정 시 LLM 모드)
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
│       components/body3d/      절차적으로 생성된 인체 실루엣 3D Body Map (5개 측정 부위 기준)
│       lib/                    bodyMapColors.js (모드별 색상 매핑)
└── docs/                    DATA_ACCURACY.md / PROVIDERS.md / BODY_3D.md
```

## 실행 방법

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 필요시 값 수정 (기본값만으로도 데모 모드 완전 동작)
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
| `HEALTH_AGENT_MODE` | `deterministic` | `deterministic`\|`llm` (llm은 `ANTHROPIC_API_KEY` 필요, 미설정/실패 시 자동으로 deterministic으로 폴백) |
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
  키를 확보하면 두 클래스에 HTTP 호출만 채우면 됩니다 — `HealthDataProvider` 인터페이스와 호출부는
  변경할 필요가 없습니다.
- **학교 SSO**: `AUTH_MODE=oidc`가 JWKS 기반 토큰 검증을 지원하지만, 실제 학교 IdP를 상대로 검증된
  적은 없습니다.
- **실제 기준(Reference) 데이터셋**: 현재 `ReferenceRange`는 데모용 placeholder이며 `source=demo`로
  명시됩니다. 실제 임상/통계 기준 데이터를 관리자가 `POST /api/admin/reference-ranges`로 등록하면
  즉시 반영됩니다(코드 변경 불필요).
- **3D Body Map 에셋**: 라이선스가 확인되지 않은 GLB를 사용하지 않기 위해, 현재는 5개 측정 부위를
  매끄럽게 lofting하여 절차적으로 생성한 인체 실루엣 메시를 사용합니다(로봇/마네킹 조립 방식 아님).
  실제 라이선스가 확인된 GLB 자산이 확보되면 `docs/BODY_3D.md`의 절차에 따라 교체할 수 있습니다.
