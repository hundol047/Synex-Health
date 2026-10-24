# 출시 보완 작업

## 인증
AUTH_MODE 기본값을 없앴습니다. 누락·오타로 서버가 시작하지 않습니다. demo는 SYNEX_ALLOW_DEMO=true와 12자 이상 DEMO_ACCESS_CODE가 필요하고, 데모 외 사용자 또는 건강기록이 DB에 있으면 시작하지 않습니다. 접근 코드 누락·오류는 401, IP별 1분간 10회 실패 후 429입니다. 다중 워커 배포의 분산 제한은 게이트웨이에서 추가해야 합니다. 데모를 실사용자 서버로 사용하지 않습니다.

기본값 제거 위치: services/release_config.py, services/auth.py, services/persistent_login.py, health/billing.py, health/reference.py, health/store.py, health/router.py, main.py. 웹 코드 저장은 탭 sessionStorage/메모리이며 localStorage에 저장하지 않습니다. 역할 전환에도 접근 코드가 필요합니다. 출시 빌드의 데모 차단을 유지합니다.

## 건강정보 동의
GET /api/consents는 현재 버전·이력을 반환합니다. POST /api/consents는 privacy_collection, sensitive_health, age_14_or_over를 모두 true로 받아 버전별 기록을 추가합니다. POST /api/consents/withdraw는 철회 기록을 추가합니다. 일반 수정으로 과거 동의를 덮어쓰지 않으며 계정 삭제에서는 삭제합니다. SQLite/PostgreSQL 스키마 마이그레이션은 v5입니다.

동의 없이 차단되는 HTTP 경로: PUT /api/health/profile, POST /api/body-composition, POST /api/body-composition/import-csv, PUT /api/body-map/reference-group, POST /api/health-agent/analyze, POST /api/health-agent/chat, PUT /api/exercise-profile, POST /api/exercise-routines/generate, POST /api/workouts, POST /api/exercise-routines/{id}/replace/{exercise}/{replacement}, PUT /api/goals, POST /api/integrations/inbody/sync, GET /api/advanced/pose, PUT /api/health/school (공유 활성화), POST /api/schools/request. 403 detail.code는 SENSITIVE_CONSENT_REQUIRED입니다. 스케줄러도 동의를 확인합니다. 상담사 목록/상세 접근은 학생 동의가 없으면 숨깁니다. 철회 후 내보내기·삭제와 공유 철회는 가능합니다.

체크박스는 기본 미선택입니다. 서버에서 만 14세 미만 생년월일을 차단하고 버전이 바뀌면 재동의를 요구합니다. 이미 철회한 데모 동의를 재시작으로 되살리지 않습니다. 운영 RETENTION_POLICY 공란/명백한 placeholder는 시작을 차단합니다.

## 운동 분석 및 정직한 출시 제한
74개 카탈로그 ID에 분석 프로필을 연결했습니다. 기존 분석기와 추가 16개 움직임 계열의 관절 관찰 규칙을 사용합니다. 모든 운동이 독립적으로 임상 검증되었다는 뜻은 아닙니다. 보이지 않는 관절, 낮은 신뢰도, 프레임 끊김에서 판정을 보류합니다. 운동명만 바꾼 고정 문장이 아니라 관찰 가능한 각도·비대칭·기울기 등에 따라 교정 메시지를 선택합니다. 미세한 스트레칭, 기구 궤적, 실제 힘·근활성·통증은 카메라로 측정할 수 없습니다.

POSE_COACHING_ENABLED=false로 비활성화할 수 있습니다. 운영/파일럿에서 켜려면 POSE_VALIDATION_REPORT의 commit_sha가 BUILD_COMMIT과 같아야 하며 동의한 실제 영상, 검토자, 데이터 해시, HTTPS 증거 위치, 74개 운동별 표본 목표 충족 및 detection_recall/correction_precision 각각 0.90 이상이 필요합니다. 현재 이런 증거는 제공되지 않았습니다. 파일 값만 채운 보고서는 검증을 대신하지 않으며 운영자가 원자료와 검토 기록을 확인해야 합니다.

## 결정된 운영 표시
- 운영 표시명: Synex Health 운영팀 (법적 사업자 신원 검증과 별개)
- 문의: hundol047@gmail.com
- 건강정보 보유: 계정 삭제 또는 데이터 삭제 요청 시까지
- 서버: 소유권·TLS·배포 확인 없는 도메인은 만들지 않았습니다. PUBLIC_API_URL 등 실제 HTTPS 주소가 필요합니다.

## 외부에서 완료해야 하는 출시 조건
실제 운영 OIDC/기관별 API 계약·인증, PostgreSQL 호스팅·백업 복구 및 만료 정책, 사업자 신원과 법률 검토, 실기기 카메라·발열·권한·접근성 QA, 앱스토어 서명/구독 계정, 실제 영상 분석 평가가 남아 있습니다. 3D는 설명용 모델이며 실제 체형 스캔이나 검증된 부위별 인체 측정으로 표시하지 않습니다. 이 작업은 출시 승인이나 실제 기관 연동 완료를 의미하지 않습니다.

의존성 보완: Vite/Vitest를 보안 수정 버전으로 갱신했습니다. Capacitor CLI의 xcode 도구가 사용하는 UUID는 CommonJS v4 API를 유지하는 11.1.1로 범위를 한정해 override했습니다. npm audit에서 전체 의존성 취약점 0건을 확인했으며 Android/iOS Capacitor sync가 통과했습니다. 이 결과는 향후 취약점 부재를 보장하지 않습니다.

검증: 백엔드·프런트엔드 자동 테스트, Chromium 브라우저 15개 시나리오, 프로덕션 번들 빌드, Capacitor Android/iOS 동기화, 비밀값 스캔, npm audit를 실행했습니다. 브라우저 검증에는 가상 카메라 사용·중지, 74개 운동 목록, 오프라인 전송 재개, 암호화 임시 입력 복원, 모바일 이동과 3D 표시가 포함됩니다. 실제 휴대전화 촬영이나 74개 운동의 사람 동작 정확도를 검증한 결과는 아닙니다.
