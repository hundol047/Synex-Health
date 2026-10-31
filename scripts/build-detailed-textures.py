"""Convert licensed source texture data to local mobile-sized PBR approximations."""
from PIL import Image,ImageOps
from pathlib import Path
import sys
if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/build-detailed-textures.py SOURCE_DIRECTORY')
source=Path(sys.argv[1]);out=Path(__file__).resolve().parents[1]/'frontend/src/health/components/character/assets/detailed'
out.mkdir(parents=True,exist_ok=True)
for body,name in [('female','Sports_Female_02'),('male','Sports_Male_04')]:
    for path in sorted((source/name/'Textures').glob('*.tga')):
        kind=path.stem.split('_',1)[1];image=Image.open(path)
        if kind.endswith('_specular'):
            # Original gloss/specular artwork is not a measured roughness map.
            # Bound its inverse to avoid plastic-looking skin highlights.
            image=ImageOps.invert(image.convert('L')).point(lambda value:max(100,min(235,100+value*.5)))
            kind=kind.replace('_specular','_roughness')
        maximum=2048 if kind.endswith('_color') else 1024
        image.thumbnail((maximum,maximum),Image.Resampling.LANCZOS)
        path=out/f'{body}-{kind}.webp';image.save(path,quality=94,method=6)
        print(path.name,path.stat().st_size)
(out/'LICENSE-Microsoft.txt').write_bytes((source/'LICENSE.md').read_bytes())
