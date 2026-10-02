# 계정 로그인 연결

일반 계정과 학교 계정은 함께 사용할 수 있습니다. 앱은 서버의 `/api/auth/config`에서 공개 설정을 읽습니다. 설정이 없으면 로그인 버튼을 비활성화하며 데모 계정으로 대신 로그인하지 않습니다. 비밀번호는 Synex에서 수집하지 않고 인증 서비스의 회원가입·로그인·비밀번호 재설정 화면을 이용합니다.

## 인증 서비스 등록

Auth0 같은 OIDC 서비스에 운영자 소유 계정으로 앱을 등록합니다. 실제 서비스 계정 생성, 이메일 발송 도메인, 개인정보 설정은 운영자가 완료해야 합니다.

1. 웹용 **Single Page Application / public client**를 만들고 Authorization Code + PKCE를 사용합니다. 클라이언트 비밀키를 요구하는 앱 유형을 사용하지 않습니다.
2. Synex API를 등록하고 JWT RS256 또는 ES256 액세스 토큰을 사용합니다. API 식별자가 `OIDC_AUDIENCE`입니다. Auth0에서는 이 audience를 요청해야 JWT API 토큰이 발급됩니다.
3. 허용 Callback URL에 `https://실제앱주소/auth/callback`을 정확히 등록합니다. Allowed Web Origins/CORS에도 실제 웹 Origin을 등록하여 브라우저의 토큰 교환을 허용합니다.
4. 모바일은 별도의 **Native public client**를 만들고 앱에 등록된 scheme의 `앱scheme://auth/callback`을 추가합니다. Android/iOS 클라이언트가 같은 앱 등록을 공유할 수 없는 서비스는 플랫폼별 설정이 추가로 필요합니다. 실제 기기 로그인을 확인하기 전에는 모바일 출시 완료로 간주하지 않습니다.
5. 이메일/비밀번호 회원가입과 비밀번호 재설정을 인증 서비스에서 활성화합니다. 소셜 로그인은 해당 서비스의 별도 연결 설정을 완료한 경우에만 나타납니다.

공식 흐름: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce

## 서버 환경 변수

호스팅 서비스의 비공개 환경 변수 설정에 입력합니다. 아래 값은 설명용이며 그대로 배포하지 않습니다.

```dotenv
AUTH_MODE=oidc
OIDC_ISSUER=https://인증서비스도메인/
OIDC_AUDIENCE=등록한-API-식별자
OIDC_CLIENT_ID=웹-public-client-id
OIDC_NATIVE_CLIENT_ID=모바일-public-client-id
OIDC_REDIRECT_URLS=["https://실제앱주소/auth/callback","com.실제등록한앱://auth/callback"]
OIDC_REFRESH_ENABLED=false
SYNEX_HEALTH_DEMO_SEED=false
```

issuer의 마지막 `/`까지 discovery 문서와 토큰의 `iss` 값과 정확히 일치해야 합니다. native scheme은 `VITE_APP_SCHEME` 및 실제 iOS/Android 등록과 일치시킵니다. 공개 클라이언트 ID만 사용하며 client secret은 앱에 넣지 않습니다. 기존 `VITE_OIDC_ISSUER`/`VITE_OIDC_CLIENT_ID` 대신 서버 설정을 사용하므로 설정 변경에 프런트엔드 재빌드는 필요 없습니다.

`OIDC_REFRESH_ENABLED=true`는 인증 서비스에서 회전형 refresh token과 offline access를 구성한 뒤 사용합니다. IdP 토큰은 메모리에만 유지합니다. 선택형 로그인 유지를 켜지 않으면 앱 재실행/웹 새로고침 시 다시 로그인해야 합니다. 계정 삭제 시 Synex 건강 기록은 삭제되지만 인증 서비스 계정 삭제는 별도입니다.

## 확인

- `/api/auth/config`가 `configured: true`를 반환하는지 확인합니다. 비밀키와 관리자 매핑은 응답에 포함되지 않아야 합니다.
- 새 계정 가입 → 로그인 → 본인 프로필과 운동 기록 저장 → 로그아웃 → 다른 계정으로 로그인하여 기록이 섞이지 않는지 확인합니다.
- 취소·만료된 로그인은 오류 안내 후 재시도가 가능해야 합니다.
- 운영 배포에는 별도로 PostgreSQL, 운영자/지원 연락처, 약관·개인정보처리방침 URL 등 `.env.release.example`의 필수 설정이 필요합니다.

## 선택형 로그인 유지

로그인 화면에서 **이 기기에서 로그인 유지**를 선택하면 Synex 서버가 최대 8시간 유효한 세션을 발급합니다. 기본값은 꺼짐입니다. 웹은 Secure/HttpOnly/SameSite=Lax 쿠키, Android/iOS는 `@aparajita/capacitor-secure-storage`의 기기 보안 저장소를 사용합니다. iOS에서는 iCloud 동기화와 다른 기기로의 백업 복원을 허용하지 않습니다. IdP 비밀번호·refresh token은 영구 저장하지 않습니다. 로그인 유지 세션 자체로 새로운 세션을 만들 수 없으며 관리자·상담사 계정은 이 기능을 사용할 수 없습니다.

웹은 앱과 API를 같은 사이트에서 HTTPS로 제공하고 프런트엔드 Origin을 `SYNEX_CORS_ORIGINS`에 정확히 등록해야 합니다. 다른 사이트 간 쿠키는 브라우저 정책상 보장하지 않습니다. 모바일 저장소가 잠겼거나 오류가 나면 일반 저장소로 우회하지 않고 다시 로그인하도록 안내합니다. 로그아웃은 서버 세션 폐기와 기기 저장소 삭제를 수행합니다. 서버에 연결하지 못하면 로그아웃 완료로 표시하지 않습니다. 인증 서비스 자체의 SSO 로그인 상태까지 종료하는 기능은 아닙니다.

공식 SDK: https://github.com/aparajita/capacitor-secure-storage
