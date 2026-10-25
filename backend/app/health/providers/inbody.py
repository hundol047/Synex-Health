"""Contract-injected InBody adapter. No guessed vendor URL or field mapping.
A deployment configures a JSON contract or implements its official API protocol.
"""
from __future__ import annotations
import hashlib, json, os, re, time
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse
import httpx
from ..schemas import BodyCompositionMeasurement, BodyCompositionCreateRequest
from ..store import now
from .base import HealthDataProvider, ProviderNotConfigured

@dataclass(frozen=True)
class MeasurementRequest:
    """Read-only measurement query defined by the institution's signed contract."""
    path: str
    method: str = 'GET'
    params: dict | None = None
    json: dict | None = None

class Contract(Protocol):
    def request(self, external_subject: str) -> MeasurementRequest | tuple[str, dict]: ...
    def readings(self, response: dict) -> list[dict]: ...
    def normalize(self, raw: dict) -> tuple[str, dict]: ...

class ProviderFailure(RuntimeError):
    def __init__(self,message,retry_after=0):
        super().__init__(message)
        self.retry_after=retry_after

class InBodyProvider(HealthDataProvider):
    name = 'inbody'
    def __init__(self, store=None, contract: Contract | None=None, client=None, sleep=time.sleep, *, settings=None, scope='global'):
        self.store, self.contract, self.client, self.sleep = store, contract, client, sleep
        settings = settings if settings is not None else {'base_url':os.getenv('INBODY_API_BASE_URL',''), 'api_key':os.getenv('INBODY_API_KEY','')}
        self.url=settings.get('base_url','').rstrip('/')
        self.key=settings.get('api_key','')
        self.account=settings.get('account','')
        self.auth_style=settings.get('auth_style','bearer')
        self.api_key_header=settings.get('api_key_header','X-API-Key')
        self.name=settings.get('source','inbody')
        self.scope=scope
        self.timeout=min(30,max(1,float(os.getenv('INBODY_TIMEOUT_SECONDS','10'))))
    def configured(self):
        url=urlparse(self.url)
        return bool(self.store and self.contract and self.key and url.scheme=='https' and url.hostname
                    and not (url.username or url.password or url.query or url.fragment)
                    and self.auth_style in ('bearer','lookinbody_kr','api_key')
                    and isinstance(self.api_key_header,str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9-]{1,79}',self.api_key_header)
                    and self.api_key_header.lower() not in ('host','content-length','cookie','connection','transfer-encoding')
                    and (self.auth_style!='lookinbody_kr' or self.account))
    def _ready(self):
        if not self.configured():
            raise ProviderNotConfigured('기관 측정 서버가 연결되지 않았습니다. 기관의 공식 API 설정과 계정 연결이 필요합니다. 직접 입력하거나 CSV 파일을 가져올 수 있습니다.')
    def get_user_measurements(self, user_id):
        self._ready()
        return self.store.list_measurements(user_id)
    def normalize_measurement(self, user_id, raw):
        self._ready()
        external_id, values=self.contract.normalize(raw)
        if not isinstance(external_id,str) or not external_id.strip() or len(external_id)>200:
            raise ValueError('external measurement id required')
        validated=BodyCompositionCreateRequest(**values)
        namespace='inbody' if self.scope=='global' else 'inbody|'+self.scope
        key=hashlib.sha256(f'{namespace}|{user_id}|{external_id}'.encode()).hexdigest()
        return BodyCompositionMeasurement(**{**validated.model_dump(),'id':'INBODY-'+key,'user_id':user_id,'source':self.name,'external_measurement_id':external_id,'created_at':now()})
    def import_measurement(self,user_id,raw):
        m=self.normalize_measurement(user_id,raw)
        old=self.store.get_measurement(m.id)
        return old or self.store.add_measurement(m)
    def _response(self,client,query):
        if isinstance(query,tuple):query=MeasurementRequest(query[0],params=query[1])
        if not isinstance(query,MeasurementRequest):raise ProviderFailure('Invalid contract request')
        path=query.path
        # Contract supplies a relative path only, no redirects or user-controlled URLs.
        if not path.startswith('/') or path.startswith('//') or '://' in path or '..' in path or any(c in path for c in '\\?#\r\n'):
            raise ProviderFailure('Invalid contract path')
        if query.method not in ('GET','POST') or (query.method=='GET' and query.json is not None):
            raise ProviderFailure('Invalid measurement query method')
        headers={'Account':self.account,'API-KEY':self.key} if self.auth_style=='lookinbody_kr' else {self.api_key_header:self.key} if self.auth_style=='api_key' else {'Authorization':'Bearer '+self.key}
        for attempt in range(3):
            try:
                r=client.request(query.method,self.url+path,params=query.params,json=query.json,headers=headers,timeout=self.timeout,follow_redirects=False)
            except (httpx.TimeoutException,httpx.TransportError):
                if attempt==2:raise ProviderFailure('timeout') from None
                self.sleep(.25*2**attempt);continue
            if r.status_code==429 or r.status_code>=500:
                retry=r.headers.get('Retry-After','60' if r.status_code==429 else '.5')
                try:delay=max(.25,float(retry))
                except ValueError:
                    from email.utils import parsedate_to_datetime
                    try:delay=max(.25,parsedate_to_datetime(retry).timestamp()-time.time())
                    except (ValueError,TypeError,OverflowError):delay=60
                if attempt==2 or delay>2:raise ProviderFailure('rate_limited_retry_later' if r.status_code==429 else 'unavailable',retry_after=delay)
                self.sleep(delay);continue
            if r.status_code!=200:raise ProviderFailure('authorization_or_contract_error')
            if len(r.content)>8*1024*1024:raise ProviderFailure('payload_too_large')
            return r.json()

    def sync(self,user_id,external_subject):
        self._ready()
        owned=self.client is None
        client=self.client or httpx.Client(timeout=self.timeout,follow_redirects=False)
        try:
            query=self.contract.request(external_subject)
            readings=[];seen=set();finished=False
            for _ in range(getattr(self.contract,'max_pages',1)):
                if isinstance(query,tuple):query=MeasurementRequest(query[0],params=query[1])
                if not isinstance(query,MeasurementRequest):raise ProviderFailure('Invalid contract request')
                fingerprint=json.dumps([query.path,query.method,query.params,query.json],sort_keys=True)
                if fingerprint in seen:raise ProviderFailure('repeated_page')
                seen.add(fingerprint)
                response=self._response(client,query)
                rows=self.contract.readings(response)
                if not isinstance(rows,list) or len(readings)+len(rows)>1000:raise ValueError('batch too large')
                for row in rows:
                    verify=getattr(self.contract,'verify_subject',None)
                    if verify:verify(row,external_subject)
                    readings.append(self.normalize_measurement(user_id,row))
                next_page=getattr(self.contract,'next_request',None)
                query=next_page(response,query) if next_page else None
                if query is None:finished=True;break
            if not finished:raise ProviderFailure('page_limit_exceeded')
            # Nothing is written until all pages, subjects and units validate.
            unique={m.id:m for m in readings}
            with self.store.connect() as db:
                for m in unique.values():
                    db.execute('INSERT OR IGNORE INTO measurements VALUES (?,?,?,?,?)',(m.id,m.user_id,m.measurement_date,m.model_dump_json(),m.created_at))
            return list(unique.values())
        except (ValueError,KeyError,TypeError,IndexError,OverflowError):raise ProviderFailure('invalid_payload') from None
        finally:
            if owned:client.close()
