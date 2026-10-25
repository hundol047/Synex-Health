import json
from copy import deepcopy
import httpx
import pytest
from test_health import client


@pytest.fixture
def institution(client,monkeypatch):
    contract={
        'request':{'path':'/documented-readings','method':'POST','subject_location':'body','subject_key':'member'},
        'records_path':'/data/readings','subject_path':'/member',
        'fields':{'external_id':{'path':'/id'},'measurement_date':{'path':'/date','date_format':'%Y%m%d'},
                  'weight':{'path':'/weight','unit':'g','required':True},'height':{'path':'/height','unit':'m'},
                  'skeletal_muscle_mass':{'path':'/smm','unit':'kg'},'body_fat_percentage':{'path':'/fat','unit':'fraction'}},
        'segments':[{'segment':'LEFT_ARM','fields':{'lean_mass_kg':{'path':'/arm/lean','unit':'g'},'lean_reference_percent':{'path':'/arm/reference','unit':'fraction'}}}],
        'constants':{'device_name':'Fixture BIA','measurement_method':'BIA'},
        'pagination':{'location':'body','request_key':'cursor','next_cursor_path':'/next','max_pages':3}}
    config={'enabled':True,'connection_id':'center-v1','approval_reference':'https://approved.example.test/record',
            'base_url':'https://official.example.test','api_key_env':'FIXTURE_INSTITUTION_KEY','auth_style':'api_key','api_key_header':'X-Official-Key','contract':contract}
    monkeypatch.setenv('FIXTURE_INSTITUTION_KEY','fixture-key')
    def build(changes=None):
        from app.health.router import store
        from app.health.providers.configured import inbody
        value=deepcopy(config)
        if changes:changes(value)
        monkeypatch.setenv('INBODY_SCHOOL_CONFIGS_JSON',json.dumps({'arbitrary-approved-campus':value}))
        return inbody(store,'arbitrary-approved-campus')
    return build,config


def row(id='one',**changes):
    return {'id':id,'member':'member-7','date':'20261001','weight':'70000','height':1.78,'smm':31,'fat':.22,'arm':{'lean':3200,'reference':1.05},**changes}


def test_settings_only_contract_imports_all_pages_and_converts_units_without_custom_python(institution):
    build,_=institution;adapter=build();assert adapter.configured();calls=[]
    def handler(request):
        assert request.headers['X-Official-Key']=='fixture-key'
        assert 'Authorization' not in request.headers
        body=json.loads(request.content);calls.append(body)
        assert body['member']=='member-7'
        return httpx.Response(200,json={'data':{'readings':[row('two' if 'cursor' in body else 'one')]},'next':None if 'cursor' in body else 'page-2'})
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        adapter.client=transport;readings=adapter.sync('student-jimin','member-7')
    assert len(calls)==2 and calls[1]['cursor']=='page-2'
    assert len(readings)==2
    m=readings[0]
    assert (m.weight,m.height,m.body_fat_percentage,m.skeletal_muscle_mass)==(70,178,22,31)
    assert m.segments[0].lean_mass_kg==3.2 and m.segments[0].lean_reference_percent==105
    assert m.source=='institution' and m.measurement_method=='BIA'


@pytest.mark.parametrize('changes',[{'member':'someone-else'},{'weight':None},{'weight':'NaN'},{'weight':True},{'fat':2},{'date':'not-a-date'},{'date':'29990101'},{'id':{}},{'smm':90}])
def test_any_invalid_later_page_aborts_entire_import(institution,changes):
    from app.health.providers.inbody import ProviderFailure
    from app.health.router import store
    build,_=institution;adapter=build();count=0
    def handler(request):
        nonlocal count
        count+=1
        return httpx.Response(200,json={'data':{'readings':[row('one') if count==1 else row('two',**changes)]},'next':'next' if count==1 else None})
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        adapter.client=transport
        with pytest.raises(ProviderFailure):adapter.sync('student-jimin','member-7')
    assert not any(m.source=='institution' for m in store.list_measurements('student-jimin'))


@pytest.mark.parametrize('cursor',['same-forever',{'url':'https://other.test/next'}])
def test_cursor_cannot_loop_or_supply_an_external_destination(institution,cursor):
    from app.health.providers.inbody import ProviderFailure
    build,_=institution;adapter=build();hosts=[]
    def handler(request):
        hosts.append(request.url.host)
        return httpx.Response(200,json={'data':{'readings':[row()]},'next':cursor})
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        adapter.client=transport
        with pytest.raises(ProviderFailure):adapter.sync('student-jimin','member-7')
    assert set(hosts)=={'official.example.test'} and len(hosts)<=2


@pytest.mark.parametrize('mutation',[
    lambda c:c['contract']['fields']['weight'].update(unit='unknown'),
    lambda c:c['contract']['fields']['weight'].pop('unit'),
    lambda c:c['contract']['request'].update(method='DELETE'),
    lambda c:c['contract']['request'].update(path='https://other.test'),
    lambda c:c['contract']['pagination'].update(request_key='member'),
    lambda c:c['contract']['pagination'].update(max_pages=1000),
    lambda c:c['contract'].update(subject_path=None),
    lambda c:c.update(contract_factory='some.module:Factory'),
    lambda c:c.update(api_key_header='Host'),
    lambda c:c['contract']['fields'].update(user_id={'path':'/user'}),
])
def test_bad_configuration_is_disconnected_before_any_network_request(institution,mutation):
    build,_=institution;assert not build(mutation).configured()


def test_missing_cursor_is_not_silent_partial_success(institution):
    from app.health.providers.inbody import ProviderFailure
    build,_=institution;adapter=build()
    with httpx.Client(transport=httpx.MockTransport(lambda _:httpx.Response(200,json={'data':{'readings':[row()]}}))) as transport:
        adapter.client=transport
        with pytest.raises(ProviderFailure):adapter.sync('student-jimin','member-7')


def test_get_query_and_path_subjects_are_encoded_and_cannot_change_host(institution):
    build,_=institution
    for location in ['query','path']:
        def change(c):
            c['contract']['request']={'path':'/members/{subject}/readings' if location=='path' else '/readings','method':'GET','subject_location':location,'subject_key':'member'}
            c['contract'].pop('pagination')
        adapter=build(change)
        query=adapter.contract.request('part/with?characters')
        assert query.json is None
        if location=='path':assert query.path=='/members/part%2Fwith%3Fcharacters/readings'
        else:assert query.params=={'member':'part/with?characters'}


def test_offline_example_is_reviewable_without_credentials_or_writes(client):
    from pathlib import Path
    from scripts.validate_institution_contract import validate
    root=Path(__file__).resolve().parents[1]/'config'
    registry=json.loads((root/'institution-api.example.json').read_text())
    config=registry['replace-with-registered-campus-id']
    assert config['enabled'] is False
    response=json.loads((root/'institution-response.example.json').read_text())
    assert validate(config['contract'],response,'fictional-member')=={
        'status':'sample_valid','records':1,'more_pages':False,'live_connection_verified':False}
    with pytest.raises(ValueError):validate(config['contract'],response,'different-member')
    response['data']['measurements'][0]['weight_kg']='not-a-number'
    with pytest.raises(ValueError):validate(config['contract'],response,'fictional-member')
