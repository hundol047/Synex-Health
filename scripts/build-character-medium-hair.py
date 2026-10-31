"""Convert Elvaerwyn's CC-BY Short Daisy hair (hair02 asset pack).
Usage: python scripts/build-character-medium-hair.py SOURCE_DIRECTORY BASE_OBJ
Only graphic data is incorporated; see the assets README for attribution.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copyfile
import subprocess,sys,json,hashlib,struct,zlib,io
from PIL import Image
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1])
with TemporaryDirectory() as temporary:
    temp=Path(temporary)
    for src,dst in [('elvs_short_daisyh1.obj','medium-layered.obj'),('elvs_short_daisy_hair.mhclo','medium-layered.mhclo'),('daisyhair1.png','medium-layered_diffuse.png')]:copyfile(source/src,temp/dst)
    subprocess.run([sys.executable,str(root/'scripts/build-character-hair.py'),str(temp),sys.argv[2],'medium-layered'],check=True)
# The supplied normal PNG has an invalid iCCP checksum. Normal vectors are
# linear data, so discard color-profile/metadata chunks and retain verified
# critical PNG data unchanged before lossless encoding.
data=(source/'daisyhair1_normals.png').read_bytes();clean=data[:8];offset=8
while offset<len(data):
    length=struct.unpack('>I',data[offset:offset+4])[0];chunk=data[offset:offset+length+12];kind=chunk[4:8]
    if kind in [b'IHDR',b'PLTE',b'IDAT',b'IEND']:
        assert zlib.crc32(chunk[4:-4])&0xffffffff==struct.unpack('>I',chunk[-4:])[0], 'Corrupt normal pixel data'
        clean+=chunk
    offset+=length+12
normal=Image.open(io.BytesIO(clean)).convert('RGB')
assets=root/'frontend/src/health/components/character/assets'
normal.save(assets/'medium-layered-normal.webp',format='WEBP',lossless=True,method=6)
p=assets/'medium-layered.json';metadata=json.loads(p.read_text())
metadata.update(sourceAuthor='Elvaerwyn',sourceLicense='CC-BY',sourcePack='hair02_ccby.zip',sourceFiles={name:hashlib.sha256((source/name).read_bytes()).hexdigest() for name in ['elvs_short_daisyh1.obj','elvs_short_daisy_hair.mhclo','daisyhair1.png','daisyhair1_normals.png']})
p.write_text(json.dumps(metadata,separators=(',',':'))+'\n')
