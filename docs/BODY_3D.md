# 3D 인체 표면 모형

2026-09-21: 분리된 절차형 몸통·팔다리와 구형 얼굴을 **MakeHuman hm08 기반 연속 표면 메시**로 교체했습니다. 얼굴, 목, 어깨, 팔꿈치, 손가락, 무릎과 발가락이 실제 사람의 표면 형태를 갖춥니다. 정점 13,380개·삼각형 26,756개입니다.

## 자산과 성별

- `assets/human-mesh.json`: 공유 토폴로지와 남성·여성 성인 표면 좌표. 평균 근육/체중의 young adult target 사용. 임의의 사용자 인종을 추정하지 않으며 원본의 세 가지 성인 ethnicity target을 동일 가중 평균합니다. 미지정 성별은 두 모형의 평균 표면입니다.
- 프로필 gender → API body_profile → 학생/비교/상담사 화면으로 전달합니다.
- `scripts/build-human-mesh.py /path/to/makehuman`으로 JSON을 재생성합니다. helper·joint 메시를 제외하고 body 표면만 추출하여 정규화/양자화합니다. 실행에 MakeHuman의 프로그램 코드는 사용하지 않습니다.
- 원본: https://github.com/makehumancommunity/makehuman (`human-mesh.json`의 revision에 커밋 고정). `makehuman/data/3dobjs/base.obj` 및 `makehuman/data/targets/macrodetails/` 내 성인 target 데이터.
- MakeHuman의 메시에 명시된 CC0(2020년 재공개) 자산입니다. [원본 자산 라이선스](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md) 및 동봉한 `assets/LICENSE.CC0.md`를 참조합니다. AGPL 프로그램 코드를 복사하지 않았습니다.

## 조작

- 한 손가락 드래그: 360도 좌우 회전과 상하 기울이기.
- 두 손가락 벌리기/모으기: 확대·축소. 이동(pan)은 비활성화하여 몸이 화면 밖으로 사라지지 않습니다.
- PC 마우스 드래그/휠도 지원합니다.
- Canvas의 touch-action:none으로 모형 영역에서만 브라우저 스크롤 대신 조작합니다. 모형 바깥에서 페이지 스크롤이 가능합니다.
- 정면/후면/좌우 버튼은 회전 후 반복 클릭해도 카메라를 되돌립니다. 관성 잔량을 비운 후 이동합니다.
- 5px를 초과한 드래그는 부위 선택으로 처리하지 않습니다.

## 표시 의미

부위 비교값은 표면색에 약하게 반영하고 선택 부위는 더 진하게 표시합니다. 실제 값은 부위 상세 패널/범례에서 확인합니다. 해부학적 왼쪽은 정면에서 화면 오른쪽입니다. 머리와 목에는 체성분 비교색을 적용하지 않습니다. 부위 경계는 표면 좌표 기반의 설명용 구획이며 개별 근육의 해부학적 경계가 아닙니다.

이 자산은 **일반적인 성인 외형**입니다. 사용자 스캔이나 환자의 신체 복원, 내부 장기·뼈·근육층·의학적 단면 데이터가 아닙니다. 체중/근육량만으로 실제 외형을 정확하게 복원한다고 표시하지 않습니다.
