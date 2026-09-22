"""School-specific official center adapters, installed by the deployment operator.
No generic guessed institution endpoint or credentials are shipped.
"""
import importlib,json,os
from typing import Protocol

class CenterAdapter(Protocol):
    def probe(self) -> bool:
        """Authenticate to the contracted center service with a bounded timeout."""
        ...

def center_adapter(school_id):
    factories=json.loads(os.getenv('SCHOOL_CENTER_FACTORIES','{}'))
    entry=factories.get(school_id)
    if not entry:return None
    module,name=entry.split(':',1)
    return getattr(importlib.import_module(module),name)()
