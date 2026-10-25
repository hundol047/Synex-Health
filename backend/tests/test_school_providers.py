"""Mock official-contract transport; never calls or claims a real university API."""
import json
from datetime import date
import httpx
import pytest
from test_health import client

# The shared client fixture reloads app modules for each isolated database.
def inbody(*args,**kwargs):
    from app.health.providers.configured import inbody as factory
    return factory(*args,**kwargs)

def mapping_matches(*args):
    from app.health.providers.configured import mapping_matches as matches
    return matches(*args)


class ExampleContract:
    def request(self,subject):
        from app.health.providers.inbody import MeasurementRequest
        return MeasurementRequest('/contract-measurements',method='POST',json={'member':subject})
    def readings(self,response):return response['items']
    def normalize(self,raw):
        return raw['id'],{'measurement_date':str(date.today()),'weight':raw['weight']}


@pytest.fixture
def registry(monkeypatch):
    configs={sid:{'enabled':True,'connection_id':'approved-tenant-v1',
                 'approval_reference':f'https://approval.example.test/{sid}',
                 'base_url':f'https://{sid}.example.test','api_key_env':f'TEST_{sid.upper()}_KEY',
                 'account_env':f'TEST_{sid.upper()}_ACCOUNT','auth_style':'lookinbody_kr',
                 'contract_factory':'test_school_providers:ExampleContract'} for sid in ('first','second')}
    for sid in configs:
        monkeypatch.setenv(f'TEST_{sid.upper()}_KEY',f'{sid}-key')
        monkeypatch.setenv(f'TEST_{sid.upper()}_ACCOUNT',f'{sid}-account')
    monkeypatch.setenv('INBODY_SCHOOL_CONFIGS_JSON',json.dumps(configs))
    # A missing school must not fall back to these otherwise valid global keys.
    monkeypatch.setenv('INBODY_API_BASE_URL','https://global.example.test')
    monkeypatch.setenv('INBODY_API_KEY','global-key')
    monkeypatch.setenv('INBODY_CONTRACT_FACTORY','test_school_providers:ExampleContract')
    return configs


def test_each_school_uses_its_own_account_post_contract_and_measurement_namespace(client,registry):
    from app.health.router import store
    for sid in registry:
        adapter=inbody(store,sid)
        def handler(request):
            assert request.url.host==f'{sid}.example.test'
            assert request.method=='POST'
            assert json.loads(request.content)=={'member':'verified-opaque-member'}
            assert request.headers['Account']==f'{sid}-account'
            assert request.headers['API-KEY']==f'{sid}-key'
            assert 'Authorization' not in request.headers
            return httpx.Response(200,json={'items':[{'id':'same-vendor-id','weight':60}]})
        with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
            adapter.client=transport
            adapter.sync('student-jimin','verified-opaque-member')
            adapter.sync('student-jimin','verified-opaque-member')
    readings=[m for m in store.list_measurements('student-jimin') if m.source=='inbody']
    assert len(readings)==2
    assert readings[0].id!=readings[1].id


@pytest.mark.parametrize('sid',[None,'missing','snu'])
def test_missing_school_never_inherits_global_or_other_school_keys(client,registry,sid):
    from app.health.router import store
    adapter=inbody(store,sid)
    assert not adapter.configured()
    assert not adapter.key and not adapter.url


@pytest.mark.parametrize('change',[
    {'enabled':False},{'enabled':'true'},{'approval_reference':''},
    {'api_key_env':'MISSING_INSTITUTION_KEY'},{'account_env':'MISSING_INSTITUTION_ACCOUNT'},
    {'base_url':'http://unsafe.example.test'}, {'base_url':'https://user:secret@host.test'},
    {'auth_style':'unsupported'}, {'connection_id':''}, {'api_key':'raw-secret-not-allowed'},
    {'contract_factory':'nonexistent_contract_module:Factory'},
])
def test_incomplete_or_disabled_institution_is_disconnected(client,registry,monkeypatch,change):
    from app.health.router import store
    registry['first'].update(change)
    monkeypatch.setenv('INBODY_SCHOOL_CONFIGS_JSON',json.dumps(registry))
    assert not inbody(store,'first').configured()
    assert inbody(store,'second').configured()


@pytest.mark.parametrize('raw',['{broken','[]','null','{}'])
def test_invalid_registry_fails_closed(client,registry,monkeypatch,raw):
    from app.health.router import store
    monkeypatch.setenv('INBODY_SCHOOL_CONFIGS_JSON',raw)
    assert not inbody(store,'first').configured()


def test_provider_subject_ownership_is_scoped_but_cannot_be_reused_in_one_connection(client,registry):
    from app.health.router import store
    first={'school_id':'first','school_user_id':'id-1','subject':'same','provider_scope':inbody(store,'first').scope}
    second={**first,'school_id':'second','provider_scope':inbody(store,'second').scope}
    store.assign_inbody_mapping('one',first)
    store.assign_inbody_mapping('two',second)
    with pytest.raises(ValueError):store.assign_inbody_mapping('three',{**first,'school_user_id':'id-2'})
    assert mapping_matches(inbody(store,'first'),first,'first')
    assert not mapping_matches(inbody(store,'second'),first,'second')


def test_new_registered_school_can_activate_without_app_code_and_reset_requires_remapping(client,registry,monkeypatch):
    from app.health.router import store
    admin={'X-Synex-Demo-User':'admin-demo'}
    assert client.post('/api/admin/schools',json={'id':'first','name':'테스트 대학'},headers=admin).status_code==200
    assert client.put('/api/health/school',json={'school_id':'first','share_with_center':False}).status_code==200
    store.save_preference('student-jimin','membership',{'school_id':'first','verified':True})
    mapping={'school_id':'first','school_user_id':'school-user','subject':'vendor-user'}
    assert client.put('/api/admin/users/student-jimin/inbody-mapping',json=mapping,headers=admin).status_code==200
    state=client.get('/api/integrations/inbody').json()
    assert state['operational_state']=='MAPPED' and state['status']!='connected'
    assert 'first-key' not in json.dumps(state) and 'first-account' not in json.dumps(state)
    registry['first']['connection_id']='replacement-tenant-v2'
    monkeypatch.setenv('INBODY_SCHOOL_CONFIGS_JSON',json.dumps(registry))
    assert client.get('/api/integrations/inbody').json()['status']=='not_connected'
    assert client.post('/api/integrations/inbody/sync').status_code==501
    overview=client.get('/api/admin/dashboard',headers=admin).json()['school_overview']
    assert next(s for s in overview if s['school_id']=='first')['provider']=='CONFIGURED'
    assert next(s for s in overview if s['school_id']=='snu')['provider']=='DISCONNECTED'


def test_redirect_cannot_forward_institution_credentials(client,registry):
    from app.health.router import store
    from app.health.providers.inbody import ProviderFailure
    adapter=inbody(store,'first');called=[]
    def handler(request):
        called.append(request.url.host)
        return httpx.Response(302,headers={'Location':'https://other-school.example.test/steal'})
    with httpx.Client(transport=httpx.MockTransport(handler),follow_redirects=True) as transport:
        adapter.client=transport
        with pytest.raises(ProviderFailure):adapter.sync('student-jimin','member')
    assert called==['first.example.test']


def test_sync_endpoint_uses_verified_school_and_revocation_blocks_next_sync(client,registry,monkeypatch):
    from app.health.router import store
    from app.health.providers import configured
    original=configured.inbody
    admin={'X-Synex-Demo-User':'admin-demo'}
    client.post('/api/admin/schools',json={'id':'first','name':'테스트 대학'},headers=admin)
    client.put('/api/health/school',json={'school_id':'first','share_with_center':False})
    store.save_preference('student-jimin','membership',{'school_id':'first','verified':True})
    client.put('/api/admin/users/student-jimin/inbody-mapping',json={'school_id':'first','school_user_id':'school-user','subject':'approved-user'},headers=admin)
    called=[]
    def handler(request):
        called.append(request.url.host)
        assert json.loads(request.content)=={'member':'approved-user'}
        return httpx.Response(200,json={'items':[{'id':'actual-route-fixture','weight':62}]})
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        def factory(store,school_id=None):
            adapter=original(store,school_id);adapter.client=transport;return adapter
        monkeypatch.setattr(configured,'inbody',factory)
        response=client.post('/api/integrations/inbody/sync')
        assert response.status_code==200,response.text
        assert response.json()['count']==1
        assert client.get('/api/integrations/inbody').json()['operational_state']=='SYNCED'
        registry['first']['enabled']=False
        monkeypatch.setenv('INBODY_SCHOOL_CONFIGS_JSON',json.dumps(registry))
        assert client.get('/api/integrations/inbody').json()['operational_state']=='DISCONNECTED'
        assert client.post('/api/integrations/inbody/sync').status_code==501
    assert called==['first.example.test']
    assert store.get_user('student-jimin').share_with_center is False
