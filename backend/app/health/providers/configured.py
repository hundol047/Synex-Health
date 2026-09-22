"""Deployment-only adapter factories. No paths or credentials come from user input."""
import importlib,os
from .inbody import InBodyProvider

def inbody(store):
    entry=os.getenv('INBODY_CONTRACT_FACTORY','')
    contract=None
    if entry:
        module,name=entry.split(':',1)
        contract=getattr(importlib.import_module(module),name)()
    return InBodyProvider(store,contract)
