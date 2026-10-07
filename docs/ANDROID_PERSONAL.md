# 개인용 안드로이드 (서버 배포 없음)

`fix/android-local` 브랜치의 별도 빌드입니다. 서버 주소, 학교 SSO, 일반 로그인 없이 기기 저장소를 연 뒤 홈에 들어갑니다. 실제 체성분 수동 입력, 남/여 3D 모형과 터치 회전, 기존 운동 동작 안내, 기본 운동 계획, 운동 기록, 변화 추적과 학교 소속 저장을 제공합니다.

건강 기록은 기존 AES-GCM 저장소에 암호화합니다. 안드로이드의 키는 Secure Storage로 관리하며 백업은 기존 설정대로 비활성화됩니다. 서버로 기록을 보내지 않습니다. 앱 삭제/기기 분실 시 기록을 복구할 수 없으므로 필요한 기록은 내보내세요. 실기기 암호화·회전·저장 성능은 아직 직접 검증하지 않았습니다.

추천은 `device-basic-v1` 기본 규칙입니다. 기존 서버의 전체 알고리즘과 동일하지 않습니다. 입력한 체중/키, 골격근량의 이전 측정 대비 변화, 경험, 장소, 기구, 시간, 목표와 최근 통증/부담을 반영합니다. 제한 사항 또는 안전 문진이 있으면 자동 생성을 중단합니다. 근육량에서 적정 중량을 추정하거나 검증된 평균 수치를 만들어 내지 않습니다.

학교 선택은 자기 신고 소속입니다. 건강센터 공유, 자동 InBody 연동, 학교 상담, 원격 AI 대화와 구독 결제는 제공하지 않습니다. 무료 개인용 기능입니다. 서버 모드의 인증은 그대로 유지되며 서버 인증 실패 시 개인용으로 전환하지 않습니다.

## 설치 파일

GitHub Actions의 `Android Personal APK (no deployment)` 실행에서 APK ZIP을 받습니다. ZIP을 풀어 `app-debug.apk`를 폰에 옮겨 설치합니다. 앱 ID는 `com.synex.health.personal`로 기존 앱과 분리됩니다. Play Store 등록/웹 배포를 수행하지 않습니다. 이 브랜치는 root/frontend `vercel.json`에서 자동 배포가 비활성화되어 있습니다.

## Windows에서 직접 APK 생성

Node.js, JDK 21, Android Studio와 SDK 36이 필요합니다. SDK의 경로를 `ANDROID_HOME`에 설정한 뒤 저장소 루트에서 PowerShell로 실행합니다.

```powershell
cd frontend
npm ci
npm run android:local
```

결과: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

`npm run build`만 실행하면 기본 서버 모드입니다. 개인용 APK는 반드시 `npm run android:local`로 생성합니다. 스토어용 release와 `VITE_LOCAL_ONLY=true`를 동시에 설정하면 빌드 검증에서 거부합니다.
