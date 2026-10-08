# Synex Health 맨몸운동 코칭 수정판 검증

검증 시각: 2026-10-08T15:56:18+09:00 (한국 시간)
소스: 35b369e168eaeb464997b88661268ff858dc2bf6
앱: Synex Health 수정판 / com.synex.health.personal.storagefix
버전: 1.1.bodyweight / 2026100801
APK: 33,145,984 bytes
SHA-256: 2ea00f03565fffe01bde9561b2ea0d73932c23a02d97a30550470efb8313e8c6

- 단위/컴포넌트 테스트 53파일, 263개 통과.
- 개인용 모바일 E2E 6개 통과: 상하 동일 높이, 7종 선택, 권한 거부/재시도, 외부통신 차단, 첫 실행과 저장소 복구 및 기록 보존.
- 실제 공식 사람 사진을 로컬 카메라 스트림에 입력한 최종 production CPU/WASM 워커 추론에서 33개 관절 추출, 화면의 스켈레톤 표시 확인. 오프라인에서도 분석 지속, 외부 요청 0건, 종료 시 카메라 트랙 해제.
- 7종 작성된 3D 동작의 관절 길이, 지지점, 화면 구도와 정상 동작의 반복수/교정 회귀 검사 통과. 7종 화면과 작은 휴대폰 바닥 동작 화면에서 전신 표시, 상하 동일 높이, 가로 넘침과 브라우저 오류 없음 확인.
- APK 빌드와 서명 검증 통과. 이전 수정판과 동일한 앱 ID/서명, 버전 코드 증가. 인증서 SHA-256: 35bc683c5c8e45464c100dad5cafa8d8c0af6806dd39370030020cc51a727d35.
- APK 웹 자산 195개를 최종 dist와 바이트 비교 확인. 모델 체크섬, localOnly true, API 주소 빈 값, 외부통신 CSP와 SecureStorage 플러그인 확인.
- 실제 휴대폰의 카메라·시작 과정·성능 및 실제 사람 운동의 교정 정확도는 직접 검증하지 않음. 이 클라우드의 소프트웨어 Android 에뮬레이터는 이전 검증에서 기본 WebView 샘플도 종료돼 네이티브 실행의 통과 근거로 사용하지 않음.

합성 동작 회귀 검사와 공식 사진 추론은 실제 운동 영상의 교정 정확도 검증을 대체하지 않습니다.

모델: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
모델 SHA-256: 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a
라이선스: Apache-2.0, docs/licenses/MediaPipe-Apache-2.0.txt
