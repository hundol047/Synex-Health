# 학교별 체성분 기록 연결 준비

국내 대학은 기존 20개 선택 목록에 없는 학교도 `POST /api/admin/schools`로 등록할 수 있습니다. 승인된 기관의 연결 설정을 서버에 추가하면 앱 코드를 학교마다 수정할 필요가 없습니다. **모든 대학과 계약·연결된 상태는 아닙니다.** 학교의 허락 외에도 실제 API 제공 여부, 기관 계정과 키, 측정 항목 명세, 학생 계정 매핑, 개인정보 처리 범위 확인이 필요합니다. API를 제공하지 않는 기관은 결과지 직접 입력·지원 CSV를 사용합니다.

현재 배포하는 개인용 APK는 `VITE_LOCAL_ONLY=true`이며 학교 서버에 접속하지 않습니다. 아래 기능은 서버 운영 버전에 적용됩니다. 승인 후 학교 인증과 측정 서버를 배포하고 서버 주소가 설정된 앱을 배포해야 실제 자동 수집을 사용할 수 있습니다.

## 승인 후 기관을 추가하는 절차

1. 기관과 체성분 데이터 이용 범위·철회·보관 조건을 확정하고 승인 문서의 내부 HTTPS 주소를 보관합니다. 이 주소는 승인 이력의 참조이며 진위를 자동 인증하는 기능은 아닙니다.
2. [설정 예제](../backend/config/institution-api.example.json)를 복사하고 공식 명세의 경로·인증·항목·단위를 입력합니다. 아래 지원 범위의 HTTPS JSON API는 `contract` 설정만으로 연결되며 기관마다 Python 코드를 작성할 필요가 없습니다. 다른 규격은 기존 `contract_factory`를 사용합니다. 부위별 제지방을 골격근량으로 바꾸어 저장하면 안 됩니다. 공개되지 않은 조회 URL이나 응답 필드는 추측하지 않습니다.
3. 학교 ID와 캠퍼스를 등록하고 아래 학교별 JSON을 `INBODY_SCHOOL_CONFIGS_JSON`에 설정합니다. 실제 키와 계정은 서버 비밀 환경변수로만 주입합니다. 학교마다 승인받은 계정과 접속 URL을 사용합니다.
4. 학교 SSO 또는 승인된 검증 흐름으로 소속을 확인하고, 관리자가 `PUT /api/admin/users/{uid}/inbody-mapping`으로 해당 기관의 학생 식별자를 매핑합니다. 새로운 연결 ID로 교체하면 매핑을 다시 해야 합니다.
5. 사용자가 ‘측정 기록 가져오기’를 실행하여 자신의 실제 결과지와 날짜·단위·수치를 대조합니다. `CONFIGURED`는 설정 완료, `MAPPED`는 계정 매핑 완료이며, 조회에 성공한 뒤에만 `SYNCED`가 됩니다. 센터에 기록을 공유하는 동의는 가져오기와 별개입니다. 서버 예약 동기화는 별도로 승인·운영해야 합니다.
6. 연결 철회 시 학교의 `enabled`를 `false`로 바꾸면 해당 학교만 중지됩니다. 기관 키를 교체할 때 서버 비밀 값을 갱신합니다. **다른 기관 계정으로 변경할 때는 `connection_id`도 새 값으로 바꿉니다.**

```json
{
  "approved-school-campus": {
    "enabled": true,
    "connection_id": "center-contract-v1",
    "approval_reference": "https://internal.example.org/approvals/replace-with-real-record",
    "base_url": "https://replace-with-contracted-api.example.org",
    "api_key_env": "APPROVED_CAMPUS_INBODY_KEY",
    "account_env": "APPROVED_CAMPUS_INBODY_ACCOUNT",
    "auth_style": "lookinbody_kr",
    "contract_factory": "institution_contracts.approved_campus:Contract"
  }
}
```

위 예시는 실제 접속 가능한 기관 정보가 아닙니다. `contract_factory`는 운영자가 검토하여 서버에 설치한 Python 모듈이며 앱 요청으로 받지 않습니다. 한국 LookinBody 인증은 공개 가이드에 명시된 `Account`, `API-KEY` 헤더를 지원합니다. 조회 명세가 POST인 경우 `MeasurementRequest(path, method='POST', json={...})`를 반환하며, GET인 경우 `params`를 사용합니다. 이 인터페이스는 **조회 전용**이며 등록·삭제 요청에는 사용하지 않습니다. `auth_style: bearer`와 기존 GET 튜플 계약도 지원합니다.

## 학교 간 데이터 분리

- 학교별 JSON이 존재하면 미등록·비활성·잘못된 학교 설정은 연결하지 않습니다. 전역 키나 다른 학교 키로 대체하지 않습니다.
- 계정 매핑과 측정 레코드 ID에 학교와 연결 ID를 포함합니다. 두 학교가 동일한 외부 ID를 발급해도 서로 덮어쓰지 않습니다. 같은 연결 내의 계정을 다른 사용자에게 중복 매핑하는 것은 차단합니다.
- 기관 응답의 리다이렉트는 따라가지 않으며, 키를 응답·프런트엔드·APK에 포함하지 않습니다. 전체 측정 묶음을 검증한 뒤 저장하고 오류 시 기존 기록을 유지합니다.
- 관리자 화면의 설정 상태는 해당 학교 기준으로 표시합니다. 한 학교의 설정 완료를 다른 모든 학교의 연결 완료로 표시하지 않습니다.
- 전역 `INBODY_API_BASE_URL`, `INBODY_API_KEY`, `INBODY_CONTRACT_FACTORY`는 학교별 JSON이 없을 때 기존 단일 기관 배포 호환용으로만 사용됩니다.

## 코드 작성 없이 추가할 수 있는 API

등록 기관 ID를 레지스트리 키로 사용하므로 특정 대학·업체를 코드에 고정하지 않습니다. 서로 다른 기관이 서로 다른 조회 경로·인증·필드 설정을 가질 수 있습니다. `contract`와 `contract_factory`는 동시에 지정할 수 없습니다.

| 항목 | 설정으로 지원하는 범위 |
| --- | --- |
| 조회 | HTTPS GET 또는 조회 전용 POST, JSON 응답 |
| 인증 | Bearer, 지정한 API 키 헤더(`auth_style: api_key`, `api_key_header`), LookinBody Account/API-KEY |
| 대상 계정 | 쿼리, JSON 본문의 직접 키, 경로의 `{subject}` |
| 응답 | JSON Pointer로 중첩 객체·배열 항목 지정 |
| 페이지 | 쿼리/본문 커서, 최대 50페이지·총 1,000건 |
| 단위 | 질량 kg/g/lb, 길이 cm/m/mm/in, 비율 percent/fraction |
| 날짜 | ISO 8601 또는 명시한 `strptime` 형식 |
| 측정 | 체중·키·골격근량·체지방률·체지방량·제지방량·체수분·뼈 무게·무기질량 등과 5개 부위 |

OAuth 토큰 자동 갱신, 전자서명, XML, 중첩 요청 본문, 페이지 번호 등 다른 규격은 별도 어댑터가 필요합니다. 어떤 기관이든 API 키 하나만으로 비공개 규격에 연결된다고 가정하지 않습니다. 각 응답 기록에는 대상 계정 확인용 식별자가 있어야 합니다. 없는 규격은 공식 계약에 따른 별도 어댑터에서 소유권 확인을 구현합니다.

예제의 대학 ID·주소·조회 경로·필드는 모두 **가상 규격**입니다. 기관 공식 명세로 교체하고 사용하지 않는 항목·페이지 설정은 삭제합니다. 실제 키는 서버 비밀 환경변수에 넣고 `api_key_env`에는 **변수 이름만** 적습니다. 승인한 기관만 `enabled: true`로 바꾸고 `INBODY_SCHOOL_CONFIGS_JSON`에 전체 JSON을 설정한 뒤 서버를 재시작합니다.

### 연결 전 오프라인 매핑 확인

기관이 제공한 비식별 예제 응답으로 아래 검사를 실행합니다. 네트워크·DB 저장을 사용하지 않으며 계정·측정값·키를 출력하지 않습니다.

```bash
cd backend
.venv/bin/python -m scripts.validate_institution_contract \
  --registry config/institution-api.example.json \
  --institution replace-with-registered-campus-id \
  --sample config/institution-response.example.json \
  --subject fictional-member
```

`sample_valid`는 해당 예제 매핑의 검사 통과만 의미합니다. 실제 조회 성공은 기관 서버 배포 후 확인합니다. 필드의 `required`로 필수 여부를 지정하며 ID·날짜는 필수이고 최소 하나의 체성분 수치가 필요합니다. 없는 선택 항목을 0으로 만들지 않습니다. 부위별 제지방량과 골격근량, 뼈 무게와 무기질량을 구분합니다.

JSON 계약은 각 기록의 계정 식별자를 검사합니다. 다른 사람의 기록이나 잘못된 수치·날짜·단위, 페이지 반복·상한 초과가 있으면 **전체 가져오기를 취소**합니다. 페이지 설정이 있으면 마지막 페이지에도 커서 키가 있어야 하며 `null`/빈 문자열로 끝납니다. 응답의 다음 페이지 URL은 따라가지 않고 같은 공식 경로에 커서 값만 전달합니다.

검증: `cd backend && .venv/bin/python -m pytest tests/test_json_institution_contract.py tests/test_school_providers.py tests/test_extensions.py tests/test_pilot_readiness.py -q`. 모의 기관 응답으로 설정만으로 연결·단위 변환·페이지 수집·소유권·기관 분리·철회·오류 시 저장 취소를 검사합니다. 실제 대학의 운영 서버 연결 성공을 의미하지 않습니다.

공식 자료와 확인된 국내 센터는 [KOREAN_UNIVERSITY_CONNECTIONS.md](KOREAN_UNIVERSITY_CONNECTIONS.md)를 참고하세요.
