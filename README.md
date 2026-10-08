# Synex Health 맨몸운동 카메라 코칭 수정판

[APK 다운로드](https://github.com/hundol047/Synex-Health/raw/refs/heads/synex-apk-bodyweight-20261008/Synex-Health-bodyweight-coach.apk) · 약 31.6 MiB

![APK 설치용 QR](https://raw.githubusercontent.com/hundol047/Synex-Health/synex-apk-bodyweight-20261008/Synex-Health-install-QR.png)

APK를 열어 설치하세요. 기존 `Synex Health 수정판`과 동일한 앱 ID·서명이므로 앱을 지우지 않고 업데이트할 수 있습니다.

홈 → 맨몸운동 카메라 코치 → 운동 선택 → 코칭 시작.

위쪽에는 3D 운동 시범과 단계 설명, 아래쪽에는 카메라 영상·스켈레톤·교정할 부위를 표시합니다. 스쿼트, 런지, 사이드 런지, 푸시업, 플랭크, 힙힌지, 글루트 브리지 7종을 지원합니다. 전후면 카메라 전환과 선택형 음성 안내가 있습니다.

로그인·분석 서버 없이 모델과 WASM을 기기에서 실행합니다. 영상을 녹화·저장·전송하지 않습니다. 전신과 지지점이 보이도록 폰을 고정하고 화면의 촬영 방향을 따르세요. 불확실한 관절은 판정을 보류합니다.

자동 테스트 263개, 모바일 E2E 6개, 실제 모델의 로컬 추론을 확인했습니다. 실제 휴대폰 실행과 실제 사람 운동의 교정 정확도는 직접 검증하지 않았습니다. 관절 추적에 따른 참고 안내입니다.

[검증 기록](VERIFICATION.md) · [사용/개발 안내](docs/BODYWEIGHT_POSE_COACH.md) · [체크섬](SHA256SUMS)

소스 커밋: 35b369e168eaeb464997b88661268ff858dc2bf6. 이 브랜치에 소스와 설치 파일을 함께 보관합니다.
