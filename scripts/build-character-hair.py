"""Fit bundled CC0 MakeHuman hair meshes to the shipped head topology.
Usage: python scripts/build-character-hair.py SOURCE_DIRECTORY BASE_OBJ [STYLE ...]
Requires scipy and Pillow. Source directory contains bob01, bob02 and short03 .obj/.mhclo/*_diffuse.png files.
Only graphical mesh/texture data is used; no MakeHuman application code.
"""
from pathlib import Path
import json,sys,hashlib
import numpy as np
from scipy.spatial import cKDTree
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);base_path=Path(sys.argv[2])
vertices=[];faces=[];group=''
for line in base_path.read_text().splitlines():
    a=line.split()
    if not a:continue
    if a[0]=='v':vertices.append(list(map(float,a[1:4])))
    elif a[0]=='g':group=a[1]
    elif a[0]=='f' and group=='body':faces.append([int(p.split('/')[0])-1 for p in a[1:]])
used=sorted({v for f in faces for v in f});remap={v:i for i,v in enumerate(used)}
mesh=json.loads((root/'frontend/src/health/components/body3d/assets/human-mesh.json').read_text())
assert len(used)*3==len(mesh['profiles']['female'])
base=np.array(vertices);head=[v for v in used if base[v,1]>5.6];tree=cKDTree(base[head])
anchors=[(5399,11998,0),(791,881,1),(962,5320,2)]
scales=[[remap[a],remap[b],round(abs(base[a,k]-base[b,k]),6)] for a,b,k in anchors]
out=root/'frontend/src/health/components/character/assets';out.mkdir(exist_ok=True)
for name in (sys.argv[3:] or ['bob01','bob02','short03']):
    path=source/(name+'.obj');v=[];uv=[];polygons=[]
    for line in path.read_text().splitlines():
        a=line.split()
        if not a:continue
        if a[0]=='v':v.append(list(map(float,a[1:4])))
        elif a[0]=='vt':uv.append(list(map(float,a[1:3])))
        elif a[0]=='f':polygons.append([tuple(int(n)-1 for n in p.split('/')[:2]) for p in a[1:]])
    fitting=(source/(name+'.mhclo')).read_text().splitlines()
    for line in fitting:
        row=line.split()
        if row and row[0] in ['x_scale','y_scale','z_scale']:
            axis=['x_scale','y_scale','z_scale'].index(row[0]);scales[axis]=[remap[int(row[1])],remap[int(row[2])],float(row[3])]
    bindings=[]
    # MHCLO contains graphical fitting data, not application logic. Some styles
    # bind to helper vertices omitted from our body; express those helper
    # locations against the three nearest retained head vertices.
    for line in fitting:
        row=line.split()
        if len(row)!=9 or not row[0].isdigit():continue
        refs=list(map(int,row[:3]));weights=list(map(float,row[3:6]));offset=np.array(list(map(float,row[6:])))
        combined={}
        for ref,weight in zip(refs,weights):
            if ref in remap:combined[remap[ref]]=combined.get(remap[ref],0)+weight;continue
            distances,near=tree.query(base[ref],k=3);blend=1/np.maximum(distances,.001)**2;blend/=sum(blend)
            helpers=[head[i] for i in near]
            offset+=(base[ref]-np.sum(base[helpers]*blend[:,None],axis=0))*weight
            for helper,w in zip(helpers,blend):combined[remap[helper]]=combined.get(remap[helper],0)+float(w)*weight
        bindings.append([list(combined),[round(w,7) for w in combined.values()],[round(float(n),6) for n in offset]])
    assert len(bindings)==len(v)
    pairs={};indices=[]
    for face in polygons:
        for p in face:
            if p not in pairs:pairs[p]=len(pairs)
        for i in range(1,len(face)-1):indices.extend(pairs[p] for p in [face[0],face[i],face[i+1]])
    data={'sourceRevision':mesh['revision'],'bindings':bindings,'scales':scales,'vertices':[p[0] for p in pairs],'uv':[round(n,6) for p in pairs for n in uv[p[1]]],'indices':indices,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    data['sourceFiles']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [path,source/(name+'.mhclo'),source/(name+'_diffuse.png')]}
    (out/(name+'.json')).write_text(json.dumps(data,separators=(',',':'))+'\n')
    image=Image.open(source/(name+'_diffuse.png')).convert('RGBA');alpha=image.getchannel('A');gray=ImageOps.grayscale(image)
    values=np.array(gray)[np.array(alpha)>180];reference=max(1,float(np.percentile(values,75)))
    gray=gray.point(lambda n:min(255,round(n/reference*220)))
    image=Image.merge('RGBA',(gray,gray,gray,alpha));image.thumbnail((1024,1024));image.save(out/(name+'.webp'),quality=90,method=6)
    print(name,{'vertices':len(pairs),'triangles':len(indices)//3,'texture':(out/(name+'.webp')).stat().st_size})
