"""Institution and age-based individual market assumptions with traceable counts."""
import csv
from pathlib import Path
from decimal import Decimal, ROUND_FLOOR

SOURCE_URL = 'https://www.kedi.re.kr/khome/main/announce/selectBroadAnnounceForm.do?selectTp=0&board_sq_no=3&article_sq_no=36467'
EDUCATION_TABLES_URL = 'https://eiec.kdi.re.kr/policy/materialView.do?num=285801'
GYM_SOURCE_URL = 'https://www.spoinfo.or.kr/board/boardFileDownAct.do?fileSeq=3201'
POPULATION_SOURCE_URL = 'https://gsis.kwdi.re.kr/statHtml/statHtml.do?orgId=338&tblId=DT_GIABRM17_001'
SCHOOL_TYPES = {'일반대학':188,'교육대학':10,'전문대학':126,'산업대학':2,'기술대학':1,'각종학교':2,'전공대학':3,'사내대학':7,'기능대학':9}
SCHOOLS = sum(SCHOOL_TYPES.values())
GYMS = 15_548
with (Path(__file__).resolve().parent / 'sources/population-2025-ages14-65.csv').open() as source:
    POPULATION_ROWS = list(csv.DictReader(source))
assert [int(row['age_in_years']) for row in POPULATION_ROWS] == list(range(14, 66))
assert all(int(row['total']) == int(row['male']) + int(row['female']) for row in POPULATION_ROWS)
POPULATION = sum(int(row['total']) for row in POPULATION_ROWS)
SAM_SHARE = Decimal('0.10')

def segment(total, monthly_fee, target):
    serviceable = int((Decimal(total) * SAM_SHARE).to_integral_value(rounding=ROUND_FLOOR))
    return {'tam':total,'sam':serviceable,'som':target,'monthlyFeeWon':monthly_fee,
            'annualPotentialWon':{k:n*monthly_fee*12 for k,n in [('tam',total),('sam',serviceable),('som',target)]}}

TIERS = {'gym':segment(GYMS,490_000,30),'university':segment(SCHOOLS,990_000,5)}
INSTITUTION = {k:sum(t[k] for t in TIERS.values()) for k in ['tam','sam','som']}
INSTITUTION.update(tiers=TIERS,annualPotentialWon={k:sum(t['annualPotentialWon'][k] for t in TIERS.values()) for k in ['tam','sam','som']})
INDIVIDUAL = segment(POPULATION,9900,500)
MODEL = {
 'scope':'기관은 전국 신고 헬스장과 캠퍼스형 대학 스포츠센터 후보군, 개인은 국내 만 14~65세 주민등록 인구',
 'statisticsDates':{'gyms':'2024-12-31','schools':'2026-04-01','population':'2025-12-31'},'checkedAt':'2026-11-01',
 'sources':{'schools':SOURCE_URL,'schoolTypes':EDUCATION_TABLES_URL,'gyms':GYM_SOURCE_URL,'population':POPULATION_SOURCE_URL},
 'schoolTypes':SCHOOL_TYPES,'schoolCentersPerSchoolAssumption':1,'gymUniversityOverlapAssumption':0,
 'samShareAssumption':str(SAM_SHARE),'somHorizonMonthsAfterLaunch':24,
 'individualAgeRange':{'minInclusive':14,'maxInclusive':65,'ageDefinition':'만 나이'},
 'individualPopulationBasis':'2025년 말 주민등록 인구, 등록외국인 제외',
 'institution':INSTITUTION,'individual':INDIVIDUAL,
}

def hundred_million(won, places=2):
    return f'{won/100_000_000:,.{places}f}'.rstrip('0').rstrip('.')

SOURCES = [
 ('S8','대학 모집단 · 2026년 교육기본통계','교육부·한국교육개발원, 2026.04.01 기준. 고등교육기관 416개교에서 방송·원격·사이버 23개교와 독립 대학원 등 45개교를 제외한 캠퍼스형 학부기관 후보군 348개교를 산정했습니다(별첨 표 14·15, PDF 18·19쪽). 센터 수를 조사한 값이 아닙니다. 개인용 인구는 별도 S11을 사용했습니다.',EDUCATION_TABLES_URL),
 ('S9','전국 헬스장 · 2025 전국 등록·신고 체육시설업 현황','문화체육관광부, 2025 발간자료 / 2024년 말 기준. 국민체육진흥공단 공개 원문 PDF 12·13쪽에서 체력단련장업 15,548개소를 확인했습니다. 신고 업종 통계이며 모든 PT·요가·필라테스 업종을 포함하는 값이나 2026년 현재 영업 중인 시설 수는 아닙니다.',GYM_SOURCE_URL),
 ('S10','확대 시장·차등 구독료 산정 가정','헬스장 월 49만 원, 대학 스포츠센터 월 99만 원, 개인 월 9,900원의 가격 가설입니다. 기관은 대학당 센터 1곳과 시설 간 중복 없음, 개인은 만 14~65세 전체 인구의 직접 구독 가능성을 상한으로 가정했습니다. SAM 각 10%, SOM 출시 후 24개월에 헬스장 30곳·대학 5곳·개인 500명은 검증할 가정·목표입니다. 금액은 12개월 유지 시의 연환산 잠재 이용료이며 시장 간 단순 합산은 하지 않습니다.','팀 0713 시장 모델 · docs/pitch-0713/market.py · 2026.11.01'),
 ('S11','개인 모집단 · 2025년 말 전국 1세별 주민등록 인구',f'한국여성정책연구원 성인지통계의 「주민등록 인구(성/행정구역(시군구)/연령1세별)」, 표 DT_GIABRM17_001을 조회했습니다. 행정안전부 주민등록 통계이며 전국·전체 성별·2025년·만 14~65세를 양 끝 나이 포함 52개 연령으로 합산한 {POPULATION:,}명입니다. 표 주석의 기준은 매년 말일 만 나이이며 자료 갱신일은 2026.04.01입니다. 등록외국인은 제외되는 통계입니다. 2026년 현재 인구나 유료 수요 실측값이 아닙니다. 1세별 발췌값은 sources/population-2025-ages14-65.csv에 저장했습니다.',POPULATION_SOURCE_URL),
]

METHOD = [
 ('기관 시장의 전국 확대','기관용은 전국 신고 헬스장과 대학 스포츠센터를 대상으로 확대했습니다. 헬스장은 문체부의 체력단련장업 통계 15,548개소(2024년 말)를 사용했습니다. 공공 체육시설 전체, 모든 PT·요가·필라테스 사업자나 미신고 업소까지 포함한 수는 아닙니다.'),
 ('대학 스포츠센터 후보군의 산정','2026년 고등교육기관 416개교에서 방송통신 1개교·사이버 20개교·원격 평생교육시설 2개교와 대학원대학·사내대학원 등 45개교를 제외해 캠퍼스형 학부기관 348개교를 후보군으로 삼았습니다. 일반 188 + 교육 10 + 전문 126 + 산업 2 + 기술 1 + 각종 2 + 전공 3 + 사내 7 + 기능 9 = 348입니다. 이 계산은 실제 스포츠센터 전수조사가 아니며 학교당 센터 1곳을 가정했습니다. 일부 분교 포함, 캠퍼스별 센터 수, 외부 위탁 운영과 독립 구매 권한을 실사해야 합니다.'),
 ('TAM · 전체 기관 시장의 상한 가정',f'헬스장 {GYMS:,}곳과 대학센터 후보 {SCHOOLS:,}곳을 합친 {INSTITUTION["tam"]:,}개 계약 단위를 가정했습니다. 헬스장 {GYMS:,} × 490,000원 × 12개월 = {TIERS["gym"]["annualPotentialWon"]["tam"]:,}원, 대학 {SCHOOLS} × 990,000원 × 12개월 = {TIERS["university"]["annualPotentialWon"]["tam"]:,}원입니다. 합계 {INSTITUTION["annualPotentialWon"]["tam"]:,}원, 약 {hundred_million(INSTITUTION["annualPotentialWon"]["tam"])}억 원은 모든 가정이 충족될 때의 연간 잠재 이용료입니다. 실제 시장 매출이나 계약 전망이 아닙니다.'),
 ('SAM · 도입 조건 충족 비율의 가정',f'헬스장과 대학 후보군 각각의 10%가 운영 수요, 담당자·예산, 디지털 운영·정보 처리 조건을 갖춘다고 가정했습니다. 소수점 버림으로 헬스장 {TIERS["gym"]["sam"]:,}곳과 대학 {TIERS["university"]["sam"]}곳, 합계 {INSTITUTION["sam"]:,}곳입니다. 두 요금을 각각 적용한 연간 잠재 이용료는 {INSTITUTION["annualPotentialWon"]["sam"]:,}원, 약 {hundred_million(INSTITUTION["annualPotentialWon"]["sam"])}억 원입니다. 10%는 수요 조사 결과나 실제 유료 전환율이 아닙니다.'),
 ('SOM · 출시 후 24개월 목표',f'헬스장 30곳과 대학 스포츠센터 5곳, 총 35곳을 목표로 제안했습니다. 기관 연환산 이용료는 30 × 490,000원 × 12 + 5 × 990,000원 × 12 = {INSTITUTION["annualPotentialWon"]["som"]:,}원, 약 {hundred_million(INSTITUTION["annualPotentialWon"]["som"])}억 원입니다. 첫 대학 실증 이후 헬스장 300곳·대학 50곳 접촉과 각각 10% 유료 전환을 가정한 실행 목표입니다. 접촉·전환 실적은 없으며 영업 비용과 지원 인력, 유지율을 확인해 조정해야 합니다.'),
 ('구독료 상향과 제안 범위','헬스장용 월 49만 원은 회원 운동 코칭과 직원 확인·운영 지원을, 대학용 월 99만 원은 센터 단위 운영·권한 관리와 기관 연결 지원을 제안하는 가격입니다. 제공 범위와 구현 상태는 계약 전 확인하며 사용량, 계정 수, 연동·초기 구축비는 별도로 산정합니다. 이 금액은 지불 의향이나 원가 조사로 확정된 단가가 아닙니다. 지원 시간·사용량·보안·운영비와 함께 가격을 검증하겠습니다.'),
 ('개인 TAM · 국내 만 14~65세 전체로 확대',f'2025년 말 전국 주민등록 인구를 1세별로 합산했습니다. 만 14세 {int(POPULATION_ROWS[0]["total"]):,}명과 만 65세 {int(POPULATION_ROWS[-1]["total"]):,}명을 모두 포함한 52개 연령, 총 {POPULATION:,}명입니다. 모든 연령의 남녀 합계와 표의 전국 전체 인구 51,117,378명을 대조했습니다. 등록외국인은 제외되며 15~64세 생산연령인구와 다른 범위입니다. 개인 월 9,900원 × 12개월 = 연 118,800원을 적용하면 TAM은 {POPULATION:,} × 118,800원 = {INDIVIDUAL["annualPotentialWon"]["tam"]:,}원, 약 {INDIVIDUAL["annualPotentialWon"]["tam"]/1_000_000_000_000:.2f}조 원입니다. 전원이 유료 이용하는 경우의 잠재 상한이며 실제 운동 인구나 유료 가입자, 검증된 시장 매출이 아닙니다.'),
 ('개인 SAM · 이용 조건 충족 비율의 가정',f'전체 만 14~65세 모집단 중 스마트폰 기반 운동 코칭 수요·이용 여건과 직접 구독 의향을 갖춘 비율을 기존처럼 10%로 가정했습니다. 소수점 버림으로 {INDIVIDUAL["sam"]:,}명이며 연환산 잠재 이용료는 {INDIVIDUAL["sam"]:,} × 9,900원 × 12개월 = {INDIVIDUAL["annualPotentialWon"]["sam"]:,}원, 약 {hundred_million(INDIVIDUAL["annualPotentialWon"]["sam"])}억 원입니다. 10%는 통계상 운동 참여율이나 실측 유료 전환율이 아니며 연령별 수요·기기 접근성·지불 의향 조사로 교체할 가정입니다.'),
 ('개인 SOM · 기존 500명 목표와 새 요금',f'출시 후 24개월 내 개인 직접 유료 회원 {INDIVIDUAL["som"]:,}명 목표는 유지했습니다. 월 9,900원 × 12개월로 연환산하면 {INDIVIDUAL["annualPotentialWon"]["som"]:,}원, 5,940만 원입니다. 직접 유입 10,000명 × 유료 전환 5%라는 검증 전 실행 가정이며 계약·매출·결제 구현을 의미하지 않습니다. 실제 고객 획득 비용과 월별 해지율, 가격 민감도를 확인해야 합니다.'),
 ('개인 가격·연령 확대와 초기 진입 순서','개인용 월 9,900원은 자세 확인, 운동 계획·기록, 회복 안내의 연결 경험에 대한 가격 제안입니다. 현재 지불 의향으로 입증된 단가가 아니므로 대체 앱, 이용 빈도와 유지율을 비교해 검증하겠습니다. 전체 잠재 연령은 만 14~65세로 넓혔지만 첫 실증은 대학의 성인 참여자부터 시작합니다. 청소년과 중장년층은 운동 난이도·안내 이해도·자세 분석의 연령별 검증이 필요하며, 미성년자의 유료 이용 계약과 건강정보 처리에 필요한 절차를 갖춘 뒤 확대합니다. TAM 확대가 전 연령의 서비스 출시 준비 완료를 뜻하지는 않습니다.'),
 ('중복·기준연도·도식 해석','대학 위탁 헬스장이 신고 체력단련장 통계에도 포함되면 기관 수가 중복됩니다. 학교당 센터 1곳과 시설 중복 없음은 상한 가정이며 사업장·운영주체와 실제 센터 존재를 확인해야 합니다. 기관 이용자와 개인 구독자도 겹칠 수 있어 두 시장 금액은 합산하지 않습니다. 통계 기준연도가 서로 다르므로 최신 운영·인구 현황을 확인해야 합니다. 원은 포함 관계를 나타내며 면적 비례가 아닙니다. 연환산 이용료는 첫해·24개월 누적 매출이 아니며 비용·환불·세금·할인을 반영하지 않았습니다.'),
]

SLIDE = dict(
 id='market',seconds=60,kicker='06 · MARKET SIZE',
 title='기관과 개인으로 나눈 TAM · SAM · SOM',
 subtitle='기관은 전국 헬스장·대학센터, 개인은 국내 만 14~65세 시장입니다.',
 script='기관용과 개인용을 나누어 시장을 계산했습니다. 기관용은 신고 헬스장 1만 5천548곳과 대학센터 후보 348곳에 각각 월 49만 원과 99만 원을 적용해 연간 약 956억 원입니다. 학교당 센터 한 곳과 시설 중복 없음의 가정입니다. 개인용은 2025년 말 주민등록 통계의 만 14세부터 65세까지 약 3천638만 명으로 넓혔습니다. 월 9,900원 기준 TAM은 연간 약 4조 3천217억 원입니다. 이용 조건을 갖춘 비율 10퍼센트를 가정한 SAM은 약 4천322억 원입니다. 24개월 개인 유료회원 목표는 500명으로 유지하며 연환산 5천940만 원입니다. 첫 실증은 대학에서 시작합니다. 모두 잠재 이용료 또는 검증할 목표이며 두 시장을 합산하지 않습니다.',
)

QA_OVERRIDES = {
 4: ('돈을 내는 고객은 개인입니까, 기관입니까?','기관용은 헬스장 운영자 또는 대학 스포츠·건강센터의 구매 부서가 계약하는 방식입니다. 개인용은 사용자가 직접 선택하는 구독 플랜입니다. 기관이 제공하는 계정에 개인 이용료를 중복 청구하는 방식으로 계산하지 않습니다.'),
 3: ('만 14~65세가 시장인데 왜 대학부터 시작합니까?','TAM은 장기적으로 검토할 전체 연령의 잠재 상한이고, 첫 실증은 측정과 운동 프로그램의 접점이 있는 대학에서 성인을 대상으로 진행합니다. 대학의 결과를 청소년·중장년층 또는 헬스장에 그대로 적용하지 않습니다. 연령별 운동 난이도와 분석 성능, 미성년 유료 이용·정보 처리 절차와 고객 수요를 검증한 뒤 확대하겠습니다.'),
 14: ('개인 월 9,900원과 기관 구독료의 근거는 무엇입니까?','개인 월 9,900원은 자세 확인·계획·기록·회복을 연결하는 경험의 가격 가설입니다. 헬스장 월 49만 원과 대학 월 99만 원은 기관 운영·지원 범위를 나눈 제안입니다. 확정된 고객 단가가 아니며 대체 서비스, 이용 빈도·유지율, 계정 수와 지원 시간·연동 비용을 비교하고 실제 지불 의향을 검증하겠습니다.'),
 15: ('개인 TAM 약 4.32조 원은 과장된 수치 아닙니까?',f'2025년 말 주민등록 인구 중 만 14~65세 {POPULATION:,}명에 월 9,900원과 12개월을 곱한 전체 잠재 상한입니다. 실제 운동 참여자나 유료 수요로 측정한 시장은 아닙니다. SAM도 10% 가정인 {INDIVIDUAL["sam"]:,}명·약 4,322억 원이며, 24개월 개인 SOM은 500명·연환산 5,940만 원입니다. 기관 TAM 약 955.6억 원과 합산하지 않고, 실제 수요와 유지율이 확인되면 가정을 좁혀 수정하겠습니다.'),
}
