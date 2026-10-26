import importlib.util
from pathlib import Path
import pytest
spec=importlib.util.spec_from_file_location('update_gate',Path(__file__).resolve().parents[2]/'scripts/verify-android-update.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

def test_update_requires_identical_pinned_signer_and_increasing_version():
    old={'application_id':'com.synex.health.personal','version_code':10,'signer_sha256':'a'*64}
    new={**old,'version_code':11}
    module.verify_pair(old,new,'a'*64)
    for invalid in [{**new,'application_id':'com.other.app'},{**new,'signer_sha256':'b'*64},{**new,'version_code':10},{**new,'version_code':9}]:
        with pytest.raises(ValueError):module.verify_pair(old,invalid,'a'*64)
    with pytest.raises(ValueError):module.verify_pair(old,new,'b'*64)
