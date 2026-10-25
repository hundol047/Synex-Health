"""Server-only institution registry. An unconfigured school never inherits keys."""
import importlib
import json
import os
import re
from urllib.parse import urlparse
from .inbody import InBodyProvider


def _contract(entry):
    module,name=entry.split(':',1)
    adapter=getattr(importlib.import_module(module),name)()
    if not all(callable(getattr(adapter,key,None)) for key in ('request','readings','normalize')):
        raise ValueError('Invalid contract adapter')
    return adapter


def inbody(store, school_id=None):
    raw=os.getenv('INBODY_SCHOOL_CONFIGS_JSON','')
    if not raw:
        entry=os.getenv('INBODY_CONTRACT_FACTORY','')
        return InBodyProvider(store,_contract(entry) if entry else None)
    disconnected=InBodyProvider(store,settings={},scope='unconfigured')
    try:
        registry=json.loads(raw)
        if not isinstance(registry,dict):return disconnected
        config=registry.get(school_id)
        if not isinstance(config,dict) or config.get('enabled') is not True:return disconnected
        allowed={'enabled','connection_id','approval_reference','base_url','api_key_env','account_env','auth_style','api_key_header','contract_factory','contract'}
        if set(config)-allowed:return disconnected
        connection_id=config['connection_id']
        if not isinstance(connection_id,str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,79}',connection_id):return disconnected
        approval=urlparse(config['approval_reference'])
        if approval.scheme!='https' or not approval.hostname or approval.username or approval.password:return disconnected
        def secret(field):
            name=config.get(field,'')
            if not re.fullmatch(r'[A-Z][A-Z0-9_]{1,100}',name):return ''
            return os.getenv(name,'')
        settings={'base_url':config['base_url'],'api_key':secret('api_key_env'),
                  'account':secret('account_env'),'auth_style':config.get('auth_style','bearer'),
                  'api_key_header':config.get('api_key_header','X-API-Key')}
        if ('contract' in config)==('contract_factory' in config):return disconnected
        if 'contract' in config:
            from .json_contract import JsonMeasurementContract
            contract=JsonMeasurementContract(config['contract'])
            settings['source']='institution'
        else:contract=_contract(config['contract_factory'])
        return InBodyProvider(store,contract,settings=settings,scope=f'school:{school_id}:{connection_id}')
    except (ValueError,TypeError,KeyError,AttributeError,ImportError):
        return disconnected


def mapping_matches(adapter, mapping, school_id):
    return bool(school_id and mapping.get('school_id')==school_id and mapping.get('subject')
                and mapping.get('provider_scope','global')==adapter.scope)
