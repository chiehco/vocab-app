"""Prepare readable source-page halves for inspection, preserving source hashes."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.audit-python-deps'))
from PIL import Image, ImageOps

level, unit = sys.argv[1], int(sys.argv[2])
assert level in ('LV1','LV2','LV3','LV4','LV5','LV6') and unit > 0
source = json.loads((ROOT / f'scripts/sources/{level}Unit{unit}.json').read_text(encoding='utf-8'))
out = ROOT / f'output/unit-audit-20261105/text-sources/{level}-U{unit}'
out.mkdir(parents=True, exist_ok=True)
records = []
for photo in source['photos']:
    if photo['pageType'] != 'content':
        continue
    path = Path(photo['path'])
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    assert actual == photo['sha256'], photo['sourcePage']
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        width, height = image.size
        outputs = []
        for part, box in [('top', (0, 0, width, height // 2 + 60)), ('bottom', (0, height // 2 - 60, width, height))]:
            piece = image.crop(box)
            if piece.width > 1800:
                piece = piece.resize((1800, round(piece.height * 1800 / piece.width)))
            target = out / f'p{photo["sourcePage"]}-{part}.png'
            piece.save(target)
            outputs.append(str(target.relative_to(ROOT)).replace('\\', '/'))
    records.append({'sourcePage': photo['sourcePage'], 'file': photo['file'], 'sha256': actual, 'dimensions': [width, height], 'inspectionCopies': outputs, 'pixelsActuallyViewed': False})
(out / 'source-index.json').write_text(json.dumps(records, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'unit': unit, 'contentPages': len(records), 'hashesMatch': True, 'inspectionCopies': len(records) * 2, 'privatePathsRecorded': False}))
