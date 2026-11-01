"""Nationwide gym/university market assumptions, separate from official base counts."""
from decimal import Decimal, ROUND_FLOOR

SOURCE_URL = 'https://www.kedi.re.kr/khome/main/announce/selectBroadAnnounceForm.do?selectTp=0&board_sq_no=3&article_sq_no=36467'
EDUCATION_TABLES_URL = 'https://eiec.kdi.re.kr/policy/materialView.do?num=285801'
GYM_SOURCE_URL = 'https://www.spoinfo.or.kr/board/boardFileDownAct.do?fileSeq=3201'
SCHOOL_TYPES = {'일반대학':188,'교육대학':10,'전문대학':126,'산업대학':2,'기술대학':1,'각종학교':2,'전공대학':3,'사내대학':7,'기능대학':9}
SCHOOLS = sum(SCHOOL_TYPES.values())
GYMS = 15_548
STUDENTS = 1_867_757 + 504_897
SAM_SHARE = Decimal('0.10')

def segment(total, monthly_fee, target):
    serviceable = int((Decimal(total) * SAM_SHARE).to_integral_value(rounding=ROUND_FLOOR))
    return {'tam':total,'sam':serviceable,'som':target,'monthlyFeeWon':monthly_fee,
            'annualPotentialWon':{k:n*monthly_fee*12 for k,n in [('tam',total),('sam',serviceable),('som',target)]}}

TIERS = {'gym':segment(GYMS,490_000,30),'university':segment(SCHOOLS,990_000,5)}
INSTITUTION = {k:sum(t[k] for t in TIERS.values()) for k in ['tam','sam','som']}
INSTITUTION.update(tiers=TIERS,annualPotentialWon={k:sum(t['annualPotentialWon'][k] for t in TIERS.values()) for k in ['tam','sam','som']})
MODEL = {
 'scope':'기관은 전국 신고 헬스장과 캠퍼스형 대학 스포츠센터 후보군, 개인은 초기 일반·전문대학생 시장',
 'statisticsDates':{'gyms':'2024-12-31','schools':'2026-04-01'},'checkedAt':'2026-11-01',
 'sources':{'schools':SOURCE_URL,'schoolTypes':EDUCATION_TABLES_URL,'gyms':GYM_SOURCE_URL},
 'schoolTypes':SCHOOL_TYPES,'schoolCentersPerSchoolAssumption':1,'gymUniversityOverlapAssumption':0,
 'samShareAssumption':str(SAM_SHARE),'somHorizonMonthsAfterLaunch':24,
 'institution':INSTITUTION,'individual':segment(STUDENTS,4900,500),
}

def hundred_million(won, places=2):
    return f'{won/100_000_000:,.{places}f}'.rstrip('0').rstrip('.')

SOURCES = [
 ('S8','대학 모집단 · 2026년 교육기본통계','교육부·한국교육개발원, 2026.04.01 기준. 고등교육기관 416개교에서 방송·원격·사이버 23개교와 독립 대학원 등 45개교를 제외한 캠퍼스형 학부기관 후보군 348개교를 산정했습니다(별첨 표 14·15, PDF 18·19쪽). 센터 수를 조사한 값이 아닙니다. 개인용은 일반대학·전문대학 재적학생 2,372,654명입니다.',EDUCATION_TABLES_URL),
 ('S9','전국 헬스장 · 2025 전국 등록·신고 체육시설업 현황','문화체육관광부, 2025 발간자료 / 2024년 말 기준. 국민체육진흥공단 공개 원문 PDF 12·13쪽에서 체력단련장업 15,548개소를 확인했습니다. 신고 업종 통계이며 모든 PT·요가·필라테스 업종을 포함하는 값이나 2026년 현재 영업 중인 시설 수는 아닙니다.',GYM_SOURCE_URL),
 ('S10','확대 시장·차등 구독료 산정 가정','헬스장 월 49만 원, 대학 스포츠센터 월 99만 원, 개인 월 4,900원의 가격 가설입니다. 대학당 센터 1곳과 시설 간 중복 없음의 가정으로 TAM을 산정했습니다. SAM 각 10%, SOM 출시 후 24개월에 헬스장 30곳·대학 5곳·개인 500명은 검증할 가정·목표입니다. 금액은 12개월 유지 시의 연환산 잠재 이용료이며 시장 간 단순 합산은 하지 않습니다.','팀 0713 시장 모델 · docs/pitch-0713/market.py · 2026.11.01'),
]

METHOD = [
 ('기관 시장의 전국 확대','기관용은 전국 신고 헬스장과 대학 스포츠센터를 대상으로 확대했습니다. 헬스장은 문체부의 체력단련장업 통계 15,548개소(2024년 말)를 사용했습니다. 공공 체육시설 전체, 모든 PT·요가·필라테스 사업자나 미신고 업소까지 포함한 수는 아닙니다.'),
 ('대학 스포츠센터 후보군의 산정','2026년 고등교육기관 416개교에서 방송통신 1개교·사이버 20개교·원격 평생교육시설 2개교와 대학원대학·사내대학원 등 45개교를 제외해 캠퍼스형 학부기관 348개교를 후보군으로 삼았습니다. 일반 188 + 교육 10 + 전문 126 + 산업 2 + 기술 1 + 각종 2 + 전공 3 + 사내 7 + 기능 9 = 348입니다. 이 계산은 실제 스포츠센터 전수조사가 아니며 학교당 센터 1곳을 가정했습니다. 일부 분교 포함, 캠퍼스별 센터 수, 외부 위탁 운영과 독립 구매 권한을 실사해야 합니다.'),
 ('TAM · 전체 기관 시장의 상한 가정',f'헬스장 {GYMS:,}곳과 대학센터 후보 {SCHOOLS:,}곳을 합친 {INSTITUTION["tam"]:,}개 계약 단위를 가정했습니다. 헬스장 {GYMS:,} × 490,000원 × 12개월 = {TIERS["gym"]["annualPotentialWon"]["tam"]:,}원, 대학 {SCHOOLS} × 990,000원 × 12개월 = {TIERS["university"]["annualPotentialWon"]["tam"]:,}원입니다. 합계 {INSTITUTION["annualPotentialWon"]["tam"]:,}원, 약 {hundred_million(INSTITUTION["annualPotentialWon"]["tam"])}억 원은 모든 가정이 충족될 때의 연간 잠재 이용료입니다. 실제 시장 매출이나 계약 전망이 아닙니다.'),
 ('SAM · 도입 조건 충족 비율의 가정',f'헬스장과 대학 후보군 각각의 10%가 운영 수요, 담당자·예산, 디지털 운영·정보 처리 조건을 갖춘다고 가정했습니다. 소수점 버림으로 헬스장 {TIERS["gym"]["sam"]:,}곳과 대학 {TIERS["university"]["sam"]}곳, 합계 {INSTITUTION["sam"]:,}곳입니다. 두 요금을 각각 적용한 연간 잠재 이용료는 {INSTITUTION["annualPotentialWon"]["sam"]:,}원, 약 {hundred_million(INSTITUTION["annualPotentialWon"]["sam"])}억 원입니다. 10%는 수요 조사 결과나 실제 유료 전환율이 아닙니다.'),
 ('SOM · 출시 후 24개월 목표',f'헬스장 30곳과 대학 스포츠센터 5곳, 총 35곳을 목표로 제안했습니다. 기관 연환산 이용료는 30 × 490,000원 × 12 + 5 × 990,000원 × 12 = {INSTITUTION["annualPotentialWon"]["som"]:,}원, 약 {hundred_million(INSTITUTION["annualPotentialWon"]["som"])}억 원입니다. 첫 대학 실증 이후 헬스장 300곳·대학 50곳 접촉과 각각 10% 유료 전환을 가정한 실행 목표입니다. 접촉·전환 실적은 없으며 영업 비용과 지원 인력, 유지율을 확인해 조정해야 합니다.'),
 ('구독료 상향과 제안 범위','헬스장용 월 49만 원은 회원 운동 코칭과 직원 확인·운영 지원을, 대학용 월 99만 원은 센터 단위 운영·권한 관리와 기관 연결 지원을 제안하는 가격입니다. 제공 범위와 구현 상태는 계약 전 확인하며 사용량, 계정 수, 연동·초기 구축비는 별도로 산정합니다. 이 금액은 지불 의향이나 원가 조사로 확정된 단가가 아닙니다. 지원 시간·사용량·보안·운영비와 함께 가격을 검증하겠습니다.'),
 ('개인용 시장과 산식','개인 직접 구독은 초기 일반·전문대학생 2,372,654명을 기준으로 유지했습니다. 재적학생에 휴학생·학사학위 취득 유예생이 포함됩니다. 월 4,900원 × 12개월 가정으로 TAM 139,512,055,200원(약 1,395억 원), SAM 10% 버림 237,265명·13,951,182,000원(약 139.5억 원), SOM 직접 유료 회원 500명·29,400,000원(2,940만 원)입니다. 개인 SOM은 직접 유입 10,000명 × 유료 전환 5%라는 검증 전 실행 가정이며 결제 기능 구현을 의미하지 않습니다.'),
 ('중복·기준연도·도식 해석','대학의 위탁 헬스장이 체력단련장업 통계에도 들어 있으면 중복될 수 있습니다. 현재 두 모집단을 사업장 단위로 대조하지 않았으므로 시설 간 중복이 없고 대학마다 센터 1곳이 있다고 놓은 상한 시나리오입니다. 실제 도입 대상은 사업장·운영주체별로 중복을 제거하고 센터 존재를 확인해야 합니다. 기관 이용자와 개인 유료 회원의 시장 금액도 단순 합산하지 않습니다. 헬스장과 대학의 기준연도가 다르며 최근 휴·폐업을 반영한 실사도 필요합니다. 원은 포함 관계를 표시하며 면적 비례가 아닙니다. 금액은 목표 고객이 12개월 유지되는 경우의 연환산 이용료로, 출시 첫해 또는 24개월 누적 매출이 아니며 비용·환불·세금·할인을 반영하지 않았습니다.'),
]

SLIDE = dict(
 id='market',seconds=60,kicker='06 · MARKET SIZE',
 title='기관과 개인으로 나눈 TAM · SAM · SOM',
 subtitle='기관은 전국 헬스장·대학센터, 개인은 초기 대학생 시장입니다.',
 script='기관 시장을 전국 헬스장과 대학 스포츠센터로 확대했습니다. 문체부 통계의 신고 헬스장 1만 5천548곳과, 교육통계에서 추린 캠퍼스형 대학 348곳을 기준으로 삼았습니다. 대학은 학교당 센터 한 곳을 가정한 후보군입니다. 헬스장 월 49만 원, 대학 월 99만 원을 적용하면 전체 기관 시장의 연간 잠재 이용료는 약 956억 원입니다. 실제 센터 존재와 시설 간 중복은 도입 전 확인해야 합니다. 유효 시장은 각 후보군의 10퍼센트로 가정했고, 출시 후 24개월 목표는 헬스장 30곳과 대학 5곳으로 연환산 약 2억 3천580만 원입니다. 오른쪽 개인용은 초기 대학생 시장을 기준으로 합니다. 가격과 전환 비율은 검증할 가정이며 두 시장은 합산하지 않습니다.',
)

QA_OVERRIDES = {
 3: ('기관 범위는 넓혔는데 왜 대학부터 시작합니까?','대학 한 곳에서 측정과 운동 프로그램의 연결 경험을 먼저 검증하고, 전국 헬스장으로 확장하려는 순서입니다. 대학 실증의 결과가 헬스장에도 그대로 적용된다고 전제하지 않으며 헬스장 운영자의 업무, 회원 코칭 수요와 지불 의향을 따로 확인하겠습니다.'),
 4: ('돈을 내는 고객은 개인입니까, 기관입니까?','기관용은 헬스장 운영자 또는 대학 스포츠·건강센터의 구매 부서가 계약하는 방식입니다. 개인용은 사용자가 직접 선택하는 구독 플랜입니다. 기관이 제공하는 계정에 개인 이용료를 중복 청구하는 방식으로 계산하지 않습니다.'),
 14: ('헬스장 월 49만 원과 대학 월 99만 원의 근거는 무엇입니까?','기관 범위와 운영 지원을 나눠 상향한 가격 가설입니다. 헬스장에는 회원 코칭·직원 확인·운영 지원, 대학에는 센터 운영·권한 관리·기관 연결 지원 범위를 제안합니다. 실제 지불 의향이나 원가 조사로 확정된 가격은 아닙니다. 제공 가능 범위, 사용량과 계정 수, 지원 시간, 별도 연동 비용을 검증해 조정하겠습니다.'),
 15: ('확대한 TAM·SAM·SOM을 어떻게 계산했습니까?','신고 헬스장 15,548곳에 월 49만 원, 대학센터 후보 348곳에 월 99만 원을 각각 곱하고 12개월로 연환산했습니다. 대학당 센터 한 곳과 시설 중복 없음의 가정에서 TAM은 약 955.56억 원입니다. SAM은 각 10%를 버림한 헬스장 1,554곳·대학 34곳, 약 95.41억 원입니다. SOM은 24개월 목표인 헬스장 30곳·대학 5곳, 약 2.36억 원입니다. 실제 센터 유무와 중복, 수요는 별도 검증해야 합니다.'),
}
