"""Verify the exact reviewed Android APK, including its cryptographic signer, before distribution."""
import argparse, importlib.util, os, subprocess, sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('android_update',Path(__file__).with_name('verify-android-update.py'))
update=importlib.util.module_from_spec(spec);spec.loader.exec_module(update)
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('apk',type=Path);p.add_argument('--build-tools',type=Path,required=True);args=p.parse_args()
    try:
        identity=update.identity(args.apk,args.build_tools)
        expected={'application_id':os.environ['SYNEX_APPLICATION_ID'],'version_code':int(os.environ['SYNEX_VERSION_CODE']),'signer_sha256':os.environ['PERSONAL_SIGNER_SHA256']}
        if any(identity[k]!=v for k,v in expected.items()):raise ValueError('APK signer/package/version does not match the reviewed release identity')
        root=Path(__file__).resolve().parents[1]
        subprocess.run(['node',str(root/'frontend/scripts/personal-release-evidence.mjs'),str(args.apk.resolve())],check=True)
    except (KeyError,ValueError,OSError,subprocess.CalledProcessError) as e:
        print('DISTRIBUTION BLOCKED: '+str(e));sys.exit(1)
