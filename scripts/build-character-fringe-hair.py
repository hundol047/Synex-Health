"""Convert Elvaerwyn's CC-BY Katherine Hair from the official hair02 pack.
Usage: python scripts/build-character-fringe-hair.py SOURCE_DIRECTORY BASE_OBJ
Only graphical OBJ/MHCLO/PNG data is used; see the asset README for attribution.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copyfile
import subprocess, sys, json, hashlib, struct, zlib, io
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
files = ['elvs_katherinehair1.obj', 'elvs_katherine_hair.mhclo', 'erbehairtex1.png', 'normalserb.png']

def clean_png(path):
    # The source PNGs have a bad ancillary iCCP checksum. Preserve and verify
    # all pixel/alpha chunks, discarding only metadata before decoding.
    data = path.read_bytes()
    clean, offset = data[:8], 8
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset + 4])[0]
        chunk = data[offset:offset + length + 12]
        if chunk[4:8] in [b'IHDR', b'PLTE', b'tRNS', b'IDAT', b'IEND']:
            assert zlib.crc32(chunk[4:-4]) & 0xffffffff == struct.unpack('>I', chunk[-4:])[0], 'Corrupt texture pixels'
            clean += chunk
        offset += length + 12
    return clean

with TemporaryDirectory() as temporary:
    temp = Path(temporary)
    for src, dst in zip(files[:2], ['medium-layered.obj', 'medium-layered.mhclo']):
        copyfile(source / src, temp / dst)
    (temp / 'medium-layered_diffuse.png').write_bytes(clean_png(source / files[2]))
    subprocess.run([sys.executable, str(root / 'scripts/build-character-hair.py'), str(temp), sys.argv[2], 'medium-layered'], check=True)

# Strip non-pixel color metadata: tangent normals must remain linear data.
assets = root / 'frontend/src/health/components/character/assets'
Image.open(io.BytesIO(clean_png(source / files[3]))).convert('RGB').save(assets / 'medium-layered-normal.webp', format='WEBP', lossless=True, method=6)
path = assets / 'medium-layered.json'
metadata = json.loads(path.read_text())
metadata.update(sourceAuthor='Elvaerwyn', sourceLicense='CC-BY', sourceStyle='Katherine Hair', sourcePack='hair02_ccby.zip', sourceFiles={name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in files})
path.write_text(json.dumps(metadata, separators=(',', ':')) + '\n')
