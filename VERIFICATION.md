# Synex Health 수정판 검증 기록

검증 일시: 2026-10-07 UTC

- APK: `Synex-Health-storagefix.apk`
- 앱 이름: `Synex Health 수정판`
- 앱 ID: `com.synex.health.personal.storagefix`
- 버전: `1.0.storagefix` / `2026100701`
- APK SHA-256: `cd3b7b6ce679850d1b44b9a1d966da5d63a2532dbeb9d665d2e8863fdc423677`
- QR 주소: `com.synex.health.personal.storagefix://auth/callback`

## 확인 완료

- 프런트엔드 단위·컴포넌트 테스트: 49개 파일, 218개 테스트 통과.
- 개인용 브라우저 E2E: 3개 테스트 통과. 첫 안내 종료 후 홈 진입, 일시적 저장소 실패 후 재시도, 입력 기록의 재실행 후 복원을 확인.
- 개인용 웹 빌드와 Android APK 빌드 성공. APK 서명, 앱 ID, 이름, 버전, 포함된 웹 자산 및 SecureStorage 플러그인 확인.
- 전달한 APK를 Android 15 / API 35 Google APIs 및 AOSP ATD 에뮬레이터에 설치 성공.
- QR 이미지를 독립 QR 디코더로 읽어 위 주소와 일치함을 확인.
- Android에서 위 주소의 VIEW/BROWSABLE 인텐트가 수정판 MainActivity를 선택함을 확인. Google APIs 에뮬레이터의 직접 실행 결과는 `Status: ok`, 대상은 `com.synex.health.personal.storagefix/com.synex.health.MainActivity`.
- 검증 중 전달한 APK의 SHA-256은 변경되지 않음. 테스트용 APK와 에뮬레이터 설정만 별도로 조정.

## 완료하지 못한 검증

Android에서 첫 안내를 끝내고 홈에 진입하는 과정, 실제 네이티브 암호화 키 생성·복원, 프로세스를 종료한 후 QR로 홈을 다시 여는 과정은 통과로 확인하지 못함. 사용자의 실제 휴대폰은 직접 테스트하지 않음.

이 클라우드에는 KVM 가속이 없어 Android를 소프트웨어 에뮬레이션으로 실행했다. 두 Android 이미지 모두 WebView 렌더러가 SIGTRAP으로 종료되었다. 자동 테스트는 WebView 응답 시간 초과 또는 프로세스 종료로 실패했고, 직접 WebView 검사도 연결이 종료되어 완료하지 못했다. 테스트 도구의 대기 시간 연장, 앱 사전 컴파일 및 에뮬레이터 실행 설정 조정으로도 해결되지 않았다.

앱 코드와 분리된 확인으로 AOSP 기본 `org.chromium.webview_shell` 앱에 정적 HTML을 열었으나, 이 샘플도 10:38 UTC에 SIGTRAP과 다음 오류로 종료되었다:

`Render process (2378)'s crash wasn't handled by all associated webviews, triggering application crash.`

따라서 APK 설치 및 QR의 Android 앱 연결 확인을 Android 홈 진입 성공이나 모든 휴대폰에서의 정상 동작 확인으로 해석하면 안 된다.

## 수정 내용

저장소 요청에 제한 시간과 취소 처리를 추가하고, 같은 계정의 실패한 초기화를 재시도할 수 있도록 수정했다. 늦은 응답은 취소된 화면을 활성화하지 않는다. 암호화 키 저장 응답이 누락되면 저장된 동일 키를 확인해 복구하며, 진행 중인 키 쓰기를 새 키로 덮어쓰지 않는다. 기존 데이터를 삭제하거나 평문 저장으로 전환하지 않는다.

수정판은 별도 앱 ID를 사용하므로 기존 앱을 덮어쓰거나 그 앱의 기록을 삭제하지 않는다. 기존 앱의 기록은 수정판으로 자동 이전되지 않는다.
