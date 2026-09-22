"""Contract-injected InBody adapter. No guessed vendor URL or field mapping.
A deployment must implement Contract for its signed official API specification.
"""
from __future__ import annotations
import hashlib, os, time
from typing import Protocol
from urllib.parse import urlparse
import httpx
from ..schemas import BodyCompositionMeasurement, BodyCompositionCreateRequest
from ..store import now
from .base import HealthDataProvider, ProviderNotConfigured

class Contract(Protocol):
    def request(self, external_subject: str) -> tuple[str, dict]: ...
    def readings(self, response: dict) -> list[dict]: ...
    def normalize(self, raw: dict) -> tuple[str, dict]: ...

class ProviderFailure(RuntimeError):
    pass

class InBodyProvider(HealthDataProvider):
    name = 'inbody'
    def __init__(self, store=None, contract: Contract | None=None, client=None, sleep=time.sleep):
        self.store, self.contract, self.client, self.sleep = store, contract, client, sleep
        self.url=os.getenv('INBODY_API_BASE_URL','').rstrip('/')
        self.key=os.getenv('INBODY_API_KEY','')
        self.timeout=min(30,max(1,float(os.getenv('INBODY_TIMEOUT_SECONDS','10'))))
    def configured(self):
        return bool(self.store and self.contract and self.key and urlparse(self.url).scheme=='https' and urlparse(self.url).hostname)
    def _ready(self):
        if not self.configured():
            raise ProviderNotConfigured('InBody 미연결: 공식 계약 adapter, HTTPS API URL, API key 및 외부 계정 매핑이 필요합니다. 수동/CSV 입력을 이용하세요.')
    def get_user_measurements(self, user_id):
        self._ready()
        return self.store.list_measurements(user_id)
    def normalize_measurement(self, user_id, raw):
        self._ready()
        external_id, values=self.contract.normalize(raw)
        if not isinstance(external_id,str) or not external_id.strip() or len(external_id)>200:
            raise ValueError('external measurement id required')
        validated=BodyCompositionCreateRequest(**values)
        key=hashlib.sha256(f'inbody|{user_id}|{external_id}'.encode()).hexdigest()
        return BodyCompositionMeasurement(**{**validated.model_dump(),'id':'INBODY-'+key,'user_id':user_id,'source':'inbody','external_measurement_id':external_id,'created_at':now()})
    def import_measurement(self,user_id,raw):
        m=self.normalize_measurement(user_id,raw)
        old=self.store.get_measurement(m.id)
        return old or self.store.add_measurement(m)
    def sync(self,user_id,external_subject):
        self._ready()
        path,params=self.contract.request(external_subject)
        # Contract supplies a relative path only, no redirects or user-controlled URLs.
        if not path.startswith('/') or path.startswith('//') or '://' in path or '..' in path:
            raise ProviderFailure('Invalid contract path')
        owned=self.client is None
        client=self.client or httpx.Client(timeout=self.timeout,follow_redirects=False)
        try:
            for attempt in range(3):
                try:
                    r=client.get(self.url+path,params=params,headers={'Authorization':'Bearer '+self.key},timeout=self.timeout)
                except (httpx.TimeoutException,httpx.TransportError):
                    if attempt==2:raise ProviderFailure('timeout') from None
                    self.sleep(.25*2**attempt);continue
                if r.status_code==429 or r.status_code>=500:
                    if attempt==2:raise ProviderFailure('rate_limited' if r.status_code==429 else 'unavailable')
                    try:delay=min(2,max(.25,float(r.headers.get('Retry-After','.5'))))
                    except ValueError:delay=.5
                    self.sleep(delay);continue
                if r.status_code!=200:raise ProviderFailure('authorization_or_contract_error')
                try:
                    rows=self.contract.readings(r.json())
                    if len(rows)>1000:raise ValueError('batch too large')
                    # Validate complete batch first; transaction commits all or nothing.
                    readings=[self.normalize_measurement(user_id,row) for row in rows]
                    with self.store.connect() as db:
                        for m in readings:
                            db.execute('INSERT OR IGNORE INTO measurements VALUES (?,?,?,?,?)',(m.id,m.user_id,m.measurement_date,m.model_dump_json(),m.created_at))
                    return readings
                except (ValueError,KeyError,TypeError):raise ProviderFailure('invalid_payload') from None
        finally:
            if owned:client.close()
