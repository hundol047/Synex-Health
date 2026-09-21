# Android · iOS · 구독 운영 가이드

## 구현 범위

기존 React 웹 UI를 Capacitor 8로 패키징하는 **하이브리드 앱**입니다. Android Studio 프로젝트(`frontend/android`)와 Xcode 프로젝트(`frontend/ios`)를 각각 생성했습니다. 3D, 운동 모션, 학교 선택, 체성분 기록 코드는 웹·두 앱이 공유합니다. Kotlin/Swift로 모든 화면을 따로 재작성한 앱은 아닙니다.

현재 검증: 웹 빌드, API·UI 테스트, Chromium 모바일 크기 브라우저 검증, 두 플랫폼 Capacitor sync. **서명된 APK/AAB/IPA, 실제 Android/iPhone 실행, 스토어 심사·실결제·실제 학교 SSO는 아직 검증하지 않았습니다.** 이 환경에는 Android SDK/JDK 21과 macOS/Xcode가 없습니다. 이미지 캡처는 실제 웹 화면이며 기기나 시뮬레이터 캡처가 아닙니다.

## 실행 및 빌드

1. `frontend`에서 `npm ci` 실행합니다.
2. 서버를 HTTPS로 배포하고 `frontend/.env.production.local`에 `VITE_API_BASE=https://<API origin>`를 설정합니다. 경로 끝의 `/api`는 넣지 않습니다. 앱은 번들 화면을 사용하며 원격 웹사이트 URL 전체를 WebView에 로드하지 않습니다.
3. 백엔드 `SYNEX_CORS_ORIGINS`에 운영 웹 주소, `capacitor://localhost`, `https://localhost`를 명시합니다. 와일드카드+쿠키 허용은 금지됩니다.
4. `npm run mobile:sync`로 번들을 빌드하고 두 플랫폼에 동기화합니다. 이 명령은 누락된 API 주소·HTTP·localhost를 차단합니다. 웹 개발은 기존 `npm run dev`를 사용합니다.
5. Android: JDK 21 및 Android SDK 36을 설치한 Android Studio에서 `npm run android`. 에뮬레이터/기기 실행 후 자체 서명 키로 AAB/APK를 생성합니다. 패키지 이름은 임시 `com.synex.health`이며 스토어 등록 전 소유자 결정이 필요합니다.
6. iOS: macOS/Xcode에서 `npm run ios`. Swift Package Manager 의존성을 해결하고 서명 Team·Bundle ID·In-App Purchase capability를 설정합니다. 시뮬레이터 실행 후 Archive/TestFlight로 기기를 검증합니다. Apple 개발자 계정은 연결되어 있지 않습니다.

생성된 `public` 웹 번들, Gradle 캐시, 비밀 키와 프로비저닝 파일은 Git에 올리지 않습니다. `npm run mobile:sync`로 재생성합니다. iOS와 Android의 앱 아이콘·시작 화면은 현재 플랫폼 템플릿 자산입니다. 최종 스토어 브랜드 자산은 출시 전에 교체해야 합니다.

## 로그인

`AUTH_MODE=demo`는 시연용이며 역할 전환을 제공합니다. `AUTH_MODE=oidc`에서는 역할 전환이 표시되지 않고 실제 계정 로그인 화면을 표시합니다. 운영 프런트엔드에 `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`를 지정하고 백엔드 `OIDC_ISSUER`, `OIDC_AUDIENCE`를 맞춥니다.

Authorization Code + PKCE(S256), state·10분 만료 검사, 시스템 브라우저를 사용합니다. IdP에서 public client 및 토큰 endpoint CORS를 설정해야 합니다. 리다이렉트 URI는 웹 `https://<web origin>/auth/callback`, 앱 `com.synex.health://auth/callback`입니다. 토큰을 URL이나 localStorage에 저장하지 않고 메모리에만 유지합니다. PKCE 임시 verifier/state는 sessionStorage에 저장 후 소모합니다. 앱 프로세스 종료·세션 만료 시 재로그인합니다. 자동 갱신/Keychain 장기 로그인은 구현하지 않았습니다. 서버는 RS256/ES256 서명과 sub/exp/iss/aud를 검증합니다. 실제 IdP 연동 시험이 필요합니다.

## 구독

- Free: 기존 체성분·3D·모션·맞춤 루틴·기록·학교 공유 기능 유지.
- Plus: 계정 본인의 월별 측정/운동 일수·완료 항목·체성분 변화 요약. 웹 브라우저에서 인쇄/PDF 저장 가능. 네이티브 앱은 리포트 조회를 지원하며 직접 PDF 내보내기는 미구현입니다.
- 구독 가격은 임의로 확정하지 않습니다. RevenueCat offering의 실제 스토어 `priceString`과 월/연 주기로 표시합니다.
- 기본 `BILLING_MODE=disabled`: 결제 버튼/유료 권한을 활성화하지 않습니다.
- 시연: `AUTH_MODE=demo BILLING_MODE=demo`일 때만 무과금 30일 데모 활성화·갱신 해제·종료·만료 시뮬레이션 API가 열립니다. 실제 무료 체험 상품이 아닙니다.
- 실결제: `AUTH_MODE=oidc BILLING_MODE=revenuecat`과 서버 키가 모두 있어야 합니다. 데모 인증에서는 실결제를 열지 않습니다.

### 실제 스토어 연결 순서

1. Apple/Google 개발자 콘솔에 앱을 등록하고 자동 갱신 구독 `synex_plus_monthly`, `synex_plus_yearly`를 생성합니다. 국가·가격·기간은 운영자가 결정합니다.
2. RevenueCat에 Android/iOS 앱과 스토어 인증을 연결합니다. 두 상품을 `plus` entitlement와 current offering의 월간/연간 package에 연결합니다. 다른 상품 ID 사용 시 백엔드 `REVENUECAT_PRODUCTS`도 변경합니다.
3. 프런트엔드 `VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY`에는 플랫폼별 **공개 SDK 키**만 넣습니다. 서버 `REVENUECAT_SECRET_KEY`에는 subscriber 조회 가능한 비밀 키를 설정합니다.
4. Webhook `https://<API origin>/api/billing/webhook/revenuecat`과 임의로 생성한 긴 Authorization 값을 RevenueCat에 설정하고 서버 `REVENUECAT_WEBHOOK_AUTH`와 일치시킵니다.
5. 복원 시 다른 계정으로 자동 이전되지 않도록 RevenueCat restore/transfer 정책을 검토합니다. 서버는 로그인 계정마다 무작위의 비공개 고객 ID를 만들며 이메일·학교·체성분을 결제 업체에 전달하지 않습니다.
6. Sandbox 서버에서만 `REVENUECAT_ALLOW_SANDBOX=true`로 구매·갱신·취소·복원·환불·만료를 실제 기기에서 검증한 후 운영에서는 false로 설정합니다.

SDK 구매 성공만으로 Plus를 부여하지 않습니다. 서버가 고정 RevenueCat API에서 현재 entitlement·허용 상품·만료·환불·sandbox 여부를 확인합니다. 본인 외 고객 ID를 클라이언트에서 전달할 수 없습니다. Webhook Authorization은 상수 시간 비교를 사용하며, 이벤트 본문 상태를 적용하지 않고 최신 subscriber를 재조회하므로 중복/역순 이벤트는 권한을 직접 조작할 수 없습니다. 상태 캐시는 최대 60초이며 그 안에는 환불 반영이 늦을 수 있습니다. 조회 실패 시 새 유료 권한은 부여하지 않습니다. 미래 갱신 중단은 이미 결제된 만료일까지 접근을 유지합니다. Web 결제 checkout은 미구현이며 웹은 계정에 연결된 유료 권한 조회·사용만 지원합니다.

유료 API `/api/billing/report`는 서버에서 구독을 검사합니다. 무료로 제공하는 원본 데이터로 사용자가 직접 분석하는 것을 막는 DRM은 아닙니다. 학교 소속 선택만으로 Plus나 실제 기관 연동 권한을 부여하지 않습니다.

## 출시 전 필요한 실물 자원

운영 HTTPS 서버, 학교 IdP 등록/승인, Apple/Google 개발자 계정과 스토어 상품, RevenueCat 연결, 서명 인증서, 운영자 정보·개인정보 처리방침·이용약관·고객지원 URL, 스토어 개인정보/데이터 안전성 신고, 계정·데이터 삭제 정책 및 삭제 플로우가 필요합니다. 이 문서는 구현 상태를 설명하며 법률 검토나 스토어 승인 보증이 아닙니다.

## 근거 문서

- https://capacitorjs.com/docs/getting-started
- https://www.revenuecat.com/docs/getting-started/installation/capacitor
- https://www.revenuecat.com/docs/api-v1
- https://www.revenuecat.com/docs/integrations/webhooks
- https://www.revenuecat.com/docs/customers/identifying-customers
