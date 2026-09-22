# v2 검증 기록

2026-09-20 로컬 검증입니다. 실제 학교 시스템·InBody/Biogram API·외부 AI 계정 연결 검증과 임상 유효성 검증은 포함하지 않습니다.

- Python API/알고리즘 회귀 테스트: 43개 통과.
- React/동작/학교 선택 테스트: 12개 통과.
- Vite 프로덕션 빌드 통과.
- 브라우저에서 학교 선택·공유 동의 초기화 및 저장, 남성/여성 3D 렌더링, 후면 보기, 운동 모션 재생/정지, 390px 모바일 가로 넘침 확인.
- 기존 타인 운동 프로필 덮어쓰기, 타 학교 상담사 목록/직접 ID 조회/메모 접근, 누락 부위의 거짓 개선, 같은 좌우의 약한 쪽 지정, 장비·제약·시간 반영, 잘못된 측정값, CSV 부분 저장, 운동 중복 기록, 통증 시 생성 차단, 재측정 자동 재생성, 재시작 프로필 보존을 검증.

인체 모형은 성별별 비율을 가진 표준 설명용 인간형 3D 모델이며 개인 스캔이나 임상 해부학 데이터가 아닙니다. 모션은 자세 이해를 위한 자체 제작 개념 애니메이션입니다. 운동 규칙은 공공 활동 지침을 참고한 제품 휴리스틱이므로 전문가 검토와 실증이 필요합니다.

실행:

```bash
cd backend
python -m pip install -r requirements.txt pytest
python -m pytest -q
```

```bash
cd frontend
npm ci
npm test
npm run build
```

## 모바일·구독 추가 검증 (2026-09-20)

- 백엔드 50개, 프런트엔드 17개: 합계 67개 테스트 통과.
- Vite production build와 Capacitor Android/iOS sync 통과.
- API 주소 없는 `npm run mobile:sync`가 의도대로 종료하여 잘못된 기기용 번들 생성을 차단하는 것을 확인.
- 브라우저: 구독 데모 활성화 → 갱신 해제(기간 유지) → 리포트 조회 → 데모 종료 → 리포트 차단 확인.
- 390px 화면에서 프로필·구독·3D·루틴·리포트 가로 넘침 없음. 운동 모션 재생 진행 확인. 페이지 JavaScript 오류 없음.
- 테스트: 데모 권한과 실제 결제 분리, 계정별 격리, 미연결 구독 차단, 만료·환불·sandbox 차단, webhook 인증·역순 이벤트 재조회, 외부 결제 API 실패 시 차단, 구매 복원 후 서버 확인, SDK 계정 전환.
- 추가 수정: 기간에 데이터가 없을 때 전체 기록을 대신 표시하던 그래프 오류, 부위별 제지방 명칭, 모바일 5개 메뉴·네트워크 끊김 안내, 운영 환경 데모 역할 전환 숨김.
- **미검증**: 실제 기기/에뮬레이터, Android 네이티브 컴파일·서명, Xcode 컴파일·서명, 실제 OIDC 제공자 로그인, Apple/Google sandbox 결제·스토어 심사. 웹 캡처를 네이티브 앱 캡처로 해석하면 안 됩니다.

## 인체 표면 메시·터치 조작 (2026-09-21)

- 웹 테스트 19개 통과. 인체 메시 정점/삼각형 인덱스, 남녀 형상 차이, 해부학적 좌우를 검증했습니다.
- Vite build 통과. Chromium에서 남녀 인체 표면을 직접 렌더링해 확인했습니다.
- CDP 터치 이벤트로 한 손가락 드래그 시 카메라 위치가 변하는 것, 두 손가락 간격 확장 시 카메라 거리가 줄어드는 것을 검증했습니다.
- 회전 후 정면 버튼 반복 클릭 시 같은 카메라 위치로 돌아오는 것을 검증했습니다. 관성 때문에 복귀 위치가 달라지던 문제를 수정했습니다.
- 브라우저 JavaScript 오류 없음. 실기기 검증을 대신하는 결과는 아닙니다.


## September 2026 extension

The current digital-twin, 44-motion catalog, pose, native adapters and verification limits are documented in [DIGITAL_TWIN_UPGRADE.md](DIGITAL_TWIN_UPGRADE.md). Earlier verification results above describe the previous implementation.
