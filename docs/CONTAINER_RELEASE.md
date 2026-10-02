# 운영 컨테이너 빌드

`docker/Dockerfile`의 기본 target은 production입니다. 자세 분석 모델과 WASM을 설치하고 모델 SHA256을 검증합니다. 운영 빌드 설정이나 약관 정보가 빠지면 이미지 생성이 실패합니다. 비밀키와 데이터베이스 주소는 빌드 인자가 아니라 실행 환경에 넣습니다. `.dockerignore`로 로컬 환경 파일·데이터베이스·인증서·의존성 폴더를 이미지에서 제외합니다.

호스팅 빌드 설정에서 다음 **공개 값**을 build arguments로 전달합니다. 실행 시 환경 변수에만 넣어서는 이미 만들어진 HTML/JavaScript가 바뀌지 않습니다.

| build argument | 값 |
| --- | --- |
| VITE_API_BASE | 실제 HTTPS API 주소 |
| VITE_PRIVACY_URL | 실제 개인정보처리방침 URL |
| VITE_SUPPORT_URL | 실제 지원 URL |
| VITE_TERMS_URL | 실제 이용약관 URL |
| LEGAL_OPERATOR | 확정된 운영자명 |
| SUPPORT_EMAIL | 실제 지원 이메일 |
| RETENTION_POLICY | 확정된 보관·파기 정책 |
| VITE_LAUNCH_MODE | free (현재 웹 운영 컨테이너) |

웹 컨테이너는 `VITE_RELEASE_TARGET=web`을 지정하므로 iOS 식별자 없이 검증할 수 있습니다. 모바일 운영 빌드는 기존 bundle/scheme 검사를 유지합니다. 유료 웹 출시는 결제 흐름을 별도 검증하기 전까지 차단합니다.

런타임은 기본적으로 APP_ENV=production, AUTH_MODE=oidc, SYNEX_HEALTH_DEMO_SEED=false입니다. `.env.release.example`의 실제 PostgreSQL·로그인·CORS·운영자 설정을 전달해야 시작됩니다. 배포의 사전 실행 단계에서 backend를 작업 디렉터리로 하여 `PYTHONPATH=. python scripts/migrate.py`를 실행합니다. `/readyz`는 데이터베이스 스키마까지 확인합니다.

로컬 데모는 `docker compose up --build`를 사용합니다. compose는 development target을 명시합니다. CI는 실제 운영 이미지 빌드, 미설정 빌드/실행 거부, 모델·WASM·약관·SPA 응답을 검사합니다. CI용 도메인·운영자 값은 검사용이며 실제 배포 값이 아닙니다.
