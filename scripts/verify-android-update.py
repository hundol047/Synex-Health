"""Verify an APK update without clearing data. Run only on a dedicated QA device/emulator.
Signing/package/version checks run BEFORE install. Never uninstall or clear user data.
"""
import argparse, hashlib, json, re, subprocess
from pathlib import Path

def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)

def identity(apk, tools):
    signing = run(str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk))
    certs = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]{64})', signing)
    if len(certs) != 1:
        raise ValueError('Exactly one verified signing certificate required')
    badging = run(str(tools / 'aapt'), 'dump', 'badging', str(apk))
    match = re.search(r"package: name='([^']+)' versionCode='(\d+)'", badging)
    if not match:
        raise ValueError('APK identity missing')
    return {'application_id': match[1], 'version_code': int(match[2]), 'signer_sha256': certs[0].lower(), 'sha256': hashlib.sha256(apk.read_bytes()).hexdigest()}

def verify_pair(old, new, pin):
    if old['application_id'] != new['application_id'] or old['signer_sha256'] != new['signer_sha256'] or new['signer_sha256'] != pin.lower():
        raise ValueError('Update blocked: package or pinned signing certificate differs; do NOT uninstall the existing app')
    if new['version_code'] <= old['version_code']:
        raise ValueError('Update requires increasing versionCode')

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('baseline',type=Path);p.add_argument('candidate',type=Path)
    p.add_argument('--build-tools',type=Path,required=True);p.add_argument('--signer-sha256',required=True)
    p.add_argument('--adb',default='adb');p.add_argument('--serial');p.add_argument('--test-apk',type=Path)
    p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    old,new=identity(a.baseline,a.build_tools),identity(a.candidate,a.build_tools);verify_pair(old,new,a.signer_sha256)
    result={'baseline':old,'candidate':new,'compatibility':'passed','record_preservation':'not tested','physical_device':False}
    if a.serial:
        if not a.test_apk:raise SystemExit('--test-apk required for record preservation test')
        adb=[a.adb,'-s',a.serial];package=new['application_id'];runner=package+'.test/androidx.test.runner.AndroidJUnitRunner'
        def instrument(method):
            out=run(*adb,'shell','am','instrument','-w','-e','expectedPackage',package,'-e','class',method,runner)
            if 'OK (1 test)' not in out or 'FAILURES' in out:raise RuntimeError('Native update assertion failed: '+out)
        run(*adb,'install','-r',str(a.baseline));run(*adb,'install','-r',str(a.test_apk))
        instrument('com.synex.health.PersonalStartupTest#completesOnboardingAndRestoresNativeEncryptedKey')
        instrument('com.synex.health.PersonalUpgradeTest#seedBeforeUpdate')
        run(*adb,'shell','am','force-stop',package)
        run(*adb,'install','-r',str(a.candidate))
        instrument('com.synex.health.PersonalUpgradeTest#verifyAfterUpdate')
        result['record_preservation']='passed'
        result['physical_device']=run(*adb,'shell','getprop','ro.kernel.qemu').strip()!='1'
    a.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
