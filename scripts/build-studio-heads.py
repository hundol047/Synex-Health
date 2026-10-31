"""Build coherent adult studio heads on hm08 without changing the body/rig.
Usage: python scripts/build-studio-heads.py TARGET_DIRECTORY BASE_OBJ
Uses pinned CC0 macro targets and restrained graphic expression targets.
"""
from pathlib import Path
from collections import defaultdict
import sys, json, hashlib
import numpy as np

root = Path(__file__).resolve().parents[1]
source, base_path = map(Path, sys.argv[1:])
vertices, groups, group = [], defaultdict(set), ''
for line in base_path.read_text().splitlines():
    a = line.split()
    if not a: continue
    if a[0] == 'v': vertices.append(list(map(float, a[1:4])))
    elif a[0] == 'g': group = a[1]
    elif a[0] == 'f': groups[group].update(int(p.split('/')[0])-1 for p in a[1:])
base = np.array(vertices)
used = sorted(groups['body'])
eye_ids = sorted(groups['joint-l-eye'])
mesh = json.loads((root/'frontend/src/health/components/body3d/assets/human-mesh.json').read_text())
assert len(used)*3 == len(mesh['profiles']['female'])

def target(name):
    out = np.zeros_like(base)
    for line in (source/name).read_text().splitlines():
        a = line.split()
        if a and not a[0].startswith('#'): out[int(a[0])] = list(map(float, a[1:4]))
    return out

def normalize(points):
    floor = points[used,1].min()
    return (points-np.array([0,floor,0]))*(1.78/(points[used,1].max()-floor))

result = {'sourceRevision': mesh['revision'], 'recipe': 'studio-adult-eye-aligned-v1',
          'expressionRevision': '7eaba3453134385bb5ea9811ef0b33b85b4b556d'}
for body in ['female', 'male']:
    macro = [f'{origin}-{body}-young.target' for origin in ['african','asian','caucasian']]
    universal = f'universal-{body}-young-averagemuscle-averageweight.target'
    weights = {macro[1]: .9, macro[2]: .1, universal: 1,
               'expression/mouthSmileLeft.target': .12 if body=='female' else .09,
               'expression/mouthSmileRight.target': .12 if body=='female' else .09,
               'sculpt/mouth-lowerlip-volume-decr.target': .2 if body=='female' else .1}
    if body == 'female':
        weights.update({'sculpt/nose-flaring-decr.target': .15, 'sculpt/head-oval.target': .08})
    files = set(macro+[universal]) | set(weights)
    targets = {name:target(name) for name in files}
    old = normalize(base+sum(targets[n] for n in macro)/3+targets[universal])
    new = normalize(base+sum(targets[n]*weight for n,weight in weights.items()))
    original_eye, new_eye = old[eye_ids].mean(axis=0), new[eye_ids].mean(axis=0)
    factor = original_eye[0]/new_eye[0]
    new = new*factor+(original_eye-new_eye*factor)
    reference = np.array(mesh['profiles'][body]).reshape(-1,3)*mesh['scale']
    deltas = []
    for j,i in enumerate(used):
        t = np.clip((reference[j,1]-1.54)/.06,0,1)
        d = (new[i]-old[i])*t*t*(3-2*t)
        if abs(d).max()>.000005: deltas.append([j,*np.round(d,6).tolist()])
    result[body] = {'deltas':deltas, 'eyeCenter':original_eye.tolist(), 'alignmentScale':float(factor),
                    'sourceWeights':weights, 'sourceHashes':{n:hashlib.sha256((source/n).read_bytes()).hexdigest() for n in sorted(files)}}
    print(body, len(deltas), 'head vertices; max delta', max(abs(v) for row in deltas for v in row[1:]))
(root/'frontend/src/health/components/character/assets/studio-heads.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
