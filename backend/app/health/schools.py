"""School selection is self-reported affiliation, not campus SSO or vendor connectivity.
Institutions below are selectable directory entries, never claimed integration partners.
"""
from pydantic import BaseModel, Field

SCHOOLS = [
    ('yonsei-mirae', '연세대학교 미래캠퍼스', '강원 원주'),
    ('yonsei-sinchon', '연세대학교 신촌캠퍼스', '서울'),
    ('yonsei-international', '연세대학교 국제캠퍼스', '인천'),
    ('korea-seoul', '고려대학교 서울캠퍼스', '서울'),
    ('korea-sejong', '고려대학교 세종캠퍼스', '세종'),
    ('hongik-seoul', '홍익대학교 서울캠퍼스', '서울'),
    ('hongik-sejong', '홍익대학교 세종캠퍼스', '세종'),
    ('snu', '서울대학교', '서울'),
    ('hanyang-seoul', '한양대학교 서울캠퍼스', '서울'),
    ('hanyang-erica', '한양대학교 ERICA', '경기 안산'),
    ('skku', '성균관대학교', '서울·경기'),
    ('ewha', '이화여자대학교', '서울'),
    ('khu', '경희대학교', '서울·경기'),
    ('kangwon', '강원대학교', '강원'),
    ('kaist', '한국과학기술원(KAIST)', '대전'),
    ('postech', '포항공과대학교', '경북 포항'),
    ('pusan', '부산대학교', '부산·경남'),
    ('chungnam', '충남대학교', '대전'),
    ('chonnam', '전남대학교', '광주·전남'),
    ('jeonbuk', '전북대학교', '전북'),
]
BY_ID = {id: {'id': id, 'name': name, 'region': region, 'integration_status': 'not_connected',
              'integration_message': '학교 건강센터·SSO·측정장비 시스템은 아직 연결되지 않았습니다.',
              'membership_status': 'self_reported'} for id, name, region in SCHOOLS}

class SchoolSelection(BaseModel):
    school_id: str | None = None
    share_with_center: bool = False

class SchoolRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)


def body_model_profile(user):
    return {'gender': user.gender, 'height_cm': user.height,
            'model_type': 'illustrative_human', 'personal_scan': False}

class SchoolCreate(BaseModel):
    id: str = Field(pattern=r'^[a-z0-9][a-z0-9-]{1,59}$')
    name: str = Field(min_length=2, max_length=100)
    region: str = Field(default='', max_length=60)

class CounselorAssignment(BaseModel):
    school_id: str
