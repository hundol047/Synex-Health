"""CI smoke probe of the actual production image, without real credentials or users."""
import hashlib
import json
import time
import urllib.request

base='http://localhost:8123'
for attempt in range(30):
    try:
        with urllib.request.urlopen(base+'/readyz',timeout=2) as response:
            assert json.load(response)['status']=='ready'
        break
    except Exception:
        if attempt==29:raise
        time.sleep(1)

def read(path):
    with urllib.request.urlopen(base+path,timeout=10) as response:return response.read()
assert json.loads(read('/release-config.json'))['release'] is True
assert hashlib.sha256(read('/pose/pose_landmarker_lite.task')).hexdigest()=='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'
assert read('/pose/wasm/vision_wasm_internal.wasm')[:4]==b'\x00asm'
for name in ('privacypolicy','terms'):
    html=read('/'+name+'.html').decode()
    assert 'CI-Operator' in html and 'ci@synex-health.invalid' in html
    assert '{{' not in html and '운영자 설정 필요' not in html
assert '<html' in read('/auth/callback').decode().lower()
print('Production image serves verified pose assets, configured legal pages and SPA callbacks.')
