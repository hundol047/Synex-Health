"""Convert CC0 hm08 eye, eyebrow and eyelash graphic assets (no application code).
Usage: python scripts/build-authored-face.py BASE_OBJ EYES_DIRECTORY PARTS_DIRECTORY
Requires numpy, scipy and Pillow. Source revisions/licenses are in assets/README.md.
"""
from pathlib import Path
import sys, json, hashlib, struct, zlib, io
import numpy as np
from scipy.spatial import cKDTree
from PIL import Image

root = Path(__file__).resolve().parents[1]
base_path, eyes_dir, parts_dir = map(Path, sys.argv[1:])
out = root / 'frontend/src/health/components/character/assets'
base, used, group = [], set(), ''
for line in base_path.read_text().splitlines():
    a = line.split()
    if not a: continue
    if a[0] == 'v': base.append(list(map(float, a[1:4])))
    elif a[0] == 'g': group = a[1]
    elif a[0] == 'f' and group == 'body': used.update(int(p.split('/')[0])-1 for p in a[1:])
base = np.array(base)
used = sorted(used)
remap = {v:i for i,v in enumerate(used)}
head = [v for v in used if base[v,1] > 5.6]
tree = cKDTree(base[head])

def convert(name, directory, source_name, texture_name):
    obj, fitting = directory / (source_name+'.obj'), directory / (source_name+'.mhclo')
    vertices, uv, faces = [], [], []
    for line in obj.read_text().splitlines():
        a = line.split()
        if not a: continue
        if a[0] == 'v': vertices.append(list(map(float,a[1:4])))
        elif a[0] == 'vt': uv.append(list(map(float,a[1:3])))
        elif a[0] == 'f': faces.append([tuple(int(v)-1 for v in p.split('/')[:2]) for p in a[1:]])
    bindings, scales = [], [None]*3
    for line in fitting.read_text().splitlines():
        a = line.split()
        if not a: continue
        if a[0] in ['x_scale','y_scale','z_scale']:
            scales[['x_scale','y_scale','z_scale'].index(a[0])] = [remap[int(a[1])],remap[int(a[2])],float(a[3])]
        if len(a) not in [1,9] or not a[0].isdigit(): continue
        if len(a)==1: refs,weights,offset=[int(a[0])],[1.],np.zeros(3)
        else: refs, weights, offset = list(map(int,a[:3])), list(map(float,a[3:6])), np.array(list(map(float,a[6:])))
        combined = {}
        for ref,weight in zip(refs,weights):
            if ref in remap:
                combined[remap[ref]] = combined.get(remap[ref],0)+weight
                continue
            distances, near = tree.query(base[ref],k=3)
            blend = 1/np.maximum(distances,.001)**2
            blend /= sum(blend)
            helpers = [head[i] for i in near]
            offset += (base[ref]-np.sum(base[helpers]*blend[:,None],axis=0))*weight
            for helper,w in zip(helpers,blend): combined[remap[helper]] = combined.get(remap[helper],0)+float(w)*weight
        bindings.append([list(combined),list(combined.values()),offset.tolist()])
    assert len(bindings) == len(vertices) and all(scales)
    pairs, indices, groups = {}, [], {}
    for face in faces:
        # The original eye has separate opaque globe and transparent cornea UV islands.
        side = 'left' if sum(vertices[v][0] for v,t in face) > 0 else 'right'
        cornea = name == 'eye-globes' and all(uv[t][0]>.85 and uv[t][1]<.15 for v,t in face)
        key = side+('-cornea' if cornea else '-surface')
        for p in face:
            if p not in pairs: pairs[p] = len(pairs)
        for i in range(1,len(face)-1):
            tri = [pairs[p] for p in [face[0],face[i],face[i+1]]]
            indices.extend(tri); groups.setdefault(key,[]).extend(tri)
    sources = [obj,fitting,directory/texture_name]
    data = dict(bindings=bindings,scales=scales,vertices=[p[0] for p in pairs],uv=[n for p in pairs for n in uv[p[1]]],indices=indices,groups=groups,
                sourceLicense='CC0',sourceFiles={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sources})
    (out/(name+'.json')).write_text(json.dumps(data,separators=(',',':'))+'\n')
    raw=(directory/texture_name).read_bytes();clean=raw[:8];offset=8
    while offset<len(raw):
        length=struct.unpack('>I',raw[offset:offset+4])[0];chunk=raw[offset:offset+length+12]
        if chunk[4:8] in [b'IHDR',b'PLTE',b'tRNS',b'IDAT',b'IEND']:
            assert zlib.crc32(chunk[4:-4])&0xffffffff==struct.unpack('>I',chunk[-4:])[0]
            clean+=chunk
        offset+=length+12
    image=Image.open(io.BytesIO(clean)).convert('RGBA')
    if name!='eye-globes':
        alpha=image.getchannel('A');image=Image.new('RGBA',image.size,'white');image.putalpha(alpha)
    image.thumbnail((1024,1024))
    image.save(out/(name+'.webp'),format='WEBP',lossless=True,method=6)
    print(name,len(vertices),len(indices)//3)

convert('eye-globes',eyes_dir,'high-poly','brown_eye.png')
convert('natural-brows',parts_dir,'eyebrow010','eyebrow010.png')
convert('natural-lashes',parts_dir,'eyelashes01','eyelashes01.png')
