# 출시 보완 현황 · 2026-10-01

## 구현한 변경

- 운동 43종에서 74종으로 확장: 맨몸 42종, 장비 32종. 맨몸/헬스장 탭, 한국어 부위·장비 검색, 12개씩 더 보기. 덤벨·밴드는 집에서도 가능하다고 명시.
- 프로필에 맨몸만/장비 우선/혼합 선택. 머신 종류를 개별 선택하며, 없는 장비나 집에 없는 헬스장 전용 머신은 추천하지 않음. 고급 바벨 3종은 라이브러리에서 안내하되 자동 추천하지 않음.
- 모든 추가 운동에 단계별 설명·주의점·개념 시범. 기구 지지가 필요한 운동은 지지점이 표시되는 2D 안내로 제한. 실제 기계 규격·개인 생체역학의 재현이 아님.
- 미전송 운동 기록은 IndexedDB AES-GCM 암호화, 비추출 CryptoKey로 저장. 서버가 확인한 동일 계정으로 로그인한 뒤 복구. 토큰은 저장하지 않음. 앱/브라우저 데이터 삭제·OS 저장소 회수는 별도 손실 가능성이 있으므로 서버 전송 상태 표시.
- 서버의 논리 운동 ID + mutation ID + revision CAS로 재전송 중복/다른 기기 덮어쓰기 방지. 충돌 시 두 기록을 보여주고 사용자가 선택. 명시적 로그아웃/계정 삭제는 대기 기록과 키 제거. 인증 만료는 삭제하지 않고 잠금.
- 첫 화면에서 체성분 입력 → 운동 계획 → 운동 시작으로 안내. 규칙 기반 해설임을 표시하고 운동 화면 주요 용어를 한국어로 정리.
- 평균 데이터 등록 도구는 출처·사용 권한 검토·검토자·측정 방식·호환 장비·코호트·단위·중복 검증. 운영에서는 호환 장비명이 불명확한 측정에 평균을 적용하지 않음.
- 자세 분석은 프레임 밖 관절/낮은 신뢰도에서 안내 중단, 런지의 굽힌 무릎 기준 및 프레스의 머리 위 조건 반영. 관절 인식 신뢰도를 자세 정확도로 표시하지 않음.
- 결제 웹훅 변수명을 실제 코드의 REVENUECAT_WEBHOOK_AUTH로 통일. Plus 운영은 RevenueCat 모드를 필수로 검사. 동시 갱신 시 오래된 결제 상태로 덮어쓰지 않도록 CAS 추가.
- /healthz, /readyz 추가. 암호화 PostgreSQL 백업 도구, 실제 외부 검증 증거 파일 검사 및 출시 차단 절차 추가.

## 외부에서 완료해야 하는 항목

현재 저장소에 실제 배포 자격증명, 라이선스가 검토된 평균 데이터, 동의받은 실제 사람의 자세 평가 데이터, 서명 키, 스토어 상품 설정이 제공되지 않았습니다. 아래는 완료로 표시하지 않습니다.

1. 운영 OIDC/DB/HTTPS 도메인·이메일 및 운영자 정보 연결. 일반 OIDC 계정 경로와 학교 선택 경로의 실제 콜백 확인.
2. 라이선스 검토한 실측 비교군 데이터 확보 및 검토. 없으면 이전의 나와 비교 기능으로 출시 범위를 정하며 평균값을 만들지 않음.
3. 실제 iPhone/Android 출시 빌드에서 권한 거절, 복귀·잠금·종료, 로그인, 오프라인 후 재시작, 발열/프레임, 저장 공간 부족, 계정 삭제 검증.
4. 동의받은 실제 평가 데이터에서 자세 추정/반복 오차 측정. 테스트 픽스처로 임상 정확도나 실사용 정확도를 주장하지 않음.
5. 유료 출시 시 실제 스토어 구매·복원·해지·환불·계정 전환·웹훅 지연 테스트. 무료 모드는 결제 비활성화 유지.
6. 백업 원격 보관·보존 주기·복구 훈련, 장애 알림 수신 테스트, 개인정보 처리업체 및 실제 SDK 고지 확인.

## 실행 방법

- 평균 데이터: `cd backend` 후 `PYTHONPATH=. python scripts/import_references.py /protected/references.json`으로 검증, 검토한 동일 파일에만 `--apply`를 추가. 등록 단위 dataset_id의 기존 행을 원자적으로 교체합니다. 공급자의 실제 장비명과 사용자의 입력 장비명이 일치해야 합니다.
- 자세 평가: `cd frontend` 후 `node scripts/evaluate-pose.mjs /protected/labelled-landmarks.json /protected/report.json`. 보고서는 운동별 반복/유지시간 오차·카메라 인식률과 장비/조명/각도별 집계를 제공합니다. 올바른 자세 분류 정확도를 대신하지 않습니다.
- 평가 JSON: `{real_data_attested, reviewer, sessions:[{participant_id, exercise, device, lighting, view, expected_reps 또는 expected_seconds, frames:[{time_ms, landmarks, expected_visible}]}]}`. 식별 불가능한 참여자 코드 사용. 좌표는 앱과 동일한 x/y 단위(프레임 폭 기준), 시간은 증가하는 ms입니다. 원본·평가 데이터는 git에 올리지 않습니다.
- 백업: `DATABASE_URL`과 수신자 공개키 `BACKUP_AGE_RECIPIENT`를 보호된 환경으로 주입한 후 `python scripts/backup-postgres.py /protected/backups/date.dump.age`. PostgreSQL 클라이언트와 age 필요. DB 비밀번호를 명령 인자나 결과에 출력하지 않습니다.
- 복구 검증: 접근 제한된 임시 환경에서 `age -d -i /protected/age-key -o /protected/restore.dump /protected/backups/date.dump.age` 후, 운영과 분리된 빈 DB에 `pg_restore --no-owner --no-acl`로 복원합니다. 로그인 식별·측정·기록·삭제 상태와 스키마 버전을 확인하고 임시 평문과 검증 DB를 폐기합니다. 운영 DB에 덮어쓰지 않습니다.
- 출시: `RELEASE_EVIDENCE_MANIFEST=/protected/evidence/manifest.json python scripts/release-check.py`. 증거 없는 상태는 실패가 정상입니다. 증거 스키마는 RELEASE_OPERATIONS.md 참조.

## 보호 범위

기기 저장 암호화는 동일 출처의 악성 스크립트, 악성 확장, 기기 전체 탈취를 방어하는 하드웨어 보안 저장소가 아닙니다. 네이티브 Keychain/Keystore 하드웨어 바인딩은 구현하지 않았습니다. 재시작 후 오프라인 상태에서 인증을 건너뛰어 기록을 열지 않으며, 연결 후 동일 계정 로그인부터 필요합니다. 응답 캐시는 여전히 메모리 전용입니다.

공개 운동 안내 참고: Mayo Clinic strength-training video collection https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/strength-training/art-20046031 , leg press https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/leg-press/vid-20084684 . 본 앱의 설명과 시범은 자체 작성이며 공급기관의 검증/인증을 뜻하지 않습니다.
