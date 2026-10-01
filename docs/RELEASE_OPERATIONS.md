# 운영·검증 인수 기준

기본 무료 베타로 설정하고 실제 시스템 연결 후 증거를 채웁니다. 앱스토어 제출·상품 생성·유료 서비스 가입은 이 변경에서 수행하지 않았습니다.

## 실제로 연결할 것

- 운영 인증: 기본 OIDC 공급자 또는 학교별 공급자, 등록된 redirect URL, PKCE, audience/issuer. 토큰은 JS 메모리만 사용하므로 앱 재시작은 재로그인이 필요합니다.
- HTTPS API/약관/개인정보/고객지원 주소, 실제 사업자·문의 이메일·보유 기간. 자리표시자를 넣어 빌드 통과시키지 않습니다.
- PostgreSQL 마이그레이션 후 /readyz를 외부에서 감시. /healthz는 프로세스 생존만 의미합니다. /readyz의 503/연속 타임아웃을 운영 알림에 연결하고 실제 수신을 테스트합니다. 프록시 뒤 HTTPS 판정은 신뢰하는 프록시 IP만 허용합니다.
- 백업 도구를 호스팅 스케줄러에 연결하고 출력 파일을 암호화 상태로 별도 저장소에 보관합니다. 보유 기간, 키 관리자, 복구 담당자, 복구 목표 시간은 운영자가 결정합니다. 백업 성공과 실제 복구 성공을 별도 기록합니다. 사용자 삭제 후 백업 복구 시 삭제 기록 재적용 절차가 필요합니다.
- 결제 Plus 모드: 서버 REVENUECAT_SECRET_KEY, REVENUECAT_WEBHOOK_AUTH, REVENUECAT_PRODUCTS와 실제 offering/entitlement 설정, iOS/Android의 공개 SDK 키. 앱 안에서 결제한 테스트 계정별 복원·환불·해지·계정 변경을 확인합니다.

## 외부 증거 manifest

`release-evidence/`는 git에서 제외됩니다. 아래 항목을 실제 수행한 경우에만 `status: passed`로 기록합니다. 도구는 파일·해시·날짜를 검사하지만 실제 수행 여부는 검토자가 책임지고 확인합니다.

```json
{
  "checks": {
    "ios_device": {
      "status": "passed",
      "reviewer": "실제 검토자",
      "build_id": "실제 TestFlight 빌드 번호",
      "tested_at": "실제 검증 시각 ISO8601",
      "artifact": "ios-device-report.pdf",
      "sha256": "실제 파일 SHA256"
    }
  }
}
```

필수 키: ios_device, android_device, auth_lifecycle, offline_recovery, account_deletion, backup_restore, privacy_review, monitoring_alert, support_contact. Plus는 ios_purchase_restore_refund, android_purchase_restore_refund 추가. 한 플랫폼만 출시하려면 배포 범위와 gate 정책을 검토하고 별도로 변경해야 합니다. 현재 gate는 양쪽 출시 기준입니다.

실기기 보고서에는 기종/OS/빌드/조건/결과/증거를 기록합니다. 필수 시나리오: 카메라 거절→재허용, 홈 이동→복귀, 15분 사용 발열·응답성, 로그아웃→다른 계정, 비행기 모드 기록→앱 종료→연결→동일 계정 로그인, 공간 부족, 서버에 이미 반영됐지만 응답이 끊긴 경우, 다른 기기 기록 충돌, 계정 삭제 후 재접속·로컬 삭제, HealthKit/Health Connect 권한 거절. 웹 자동 테스트는 이 보고서를 대체하지 않습니다.

## 장애 대응

1. 잘못된 저장/권한 오류면 해당 기능의 새 요청을 운영에서 차단하고 상태를 고객지원에 게시합니다.
2. 사용자 건강값·토큰·결제 원문을 로그/문의로 수집하지 않습니다. 시간, 빌드, 오류 코드, 영향 범위를 확인합니다.
3. 직전 검증 빌드로 롤백하되 DB 스키마/Workout revision 프로토콜 호환성을 먼저 확인합니다. 구버전 클라이언트의 수정 요청은 409가 될 수 있으므로 이번 서버와 앱을 함께 배포하고 구버전 앱 업그레이드를 안내합니다.
4. 복구 후 기록·권한·삭제 상태를 검증하고 원인과 재발 방지를 기록합니다.

## 베타 확인

처음 가입한 사람이 설명 없이 체성분 입력, 운동 방식 설정, 루틴 생성, 운동 완료까지 진행하는지 관찰합니다. 미전송/충돌을 오해하지 않는지, 1주 후 다시 쓰는지 확인합니다. 동의 없는 행동분석 SDK는 추가하지 않았습니다.
