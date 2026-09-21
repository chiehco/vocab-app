"""Verify deployed gallery and every published image against the local approved release."""
import argparse
import hashlib
import io
import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen
from PIL import Image

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--base', required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
cards = json.loads((root/'src/features/vocabulary/lv1ReviewedImages.json').read_text(encoding='utf-8'))
audit = {x['id']: x for x in json.loads((root/'scripts/approvals/lv1-images-20260922.json').read_text(encoding='utf-8'))}


def verify(card):
    try:
        last_error = None
        for attempt in range(3):
            try:
                with urlopen(args.base.rstrip('/')+'/'+card['illustration']['path'], timeout=45) as response:
                    data = response.read()
                break
            except Exception as error:
                last_error = error
                if attempt < 2:
                    time.sleep(attempt + 1)
        else:
            raise last_error
        expected = audit[card['id']]
        assert hashlib.sha256(data).hexdigest() == expected['publishedImageSha256'], 'Hash mismatch'
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            assert list(image.size) == expected['dimensions'], 'Dimensions mismatch'
        return {'id': card['id'], 'ok': True}
    except Exception as error:
        return {'id': card['id'], 'ok': False, 'error': str(error)}


with ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(verify, cards))
gallery_path = 'wordbeast/lv1-reviewed/index.html'
with urlopen(args.base.rstrip('/')+'/'+gallery_path, timeout=45) as response:
    gallery_ok = response.read() == (root/'public'/gallery_path).read_bytes()
report = {'base': args.base, 'images': len(results), 'passed': sum(x['ok'] for x in results), 'galleryExactMatch': gallery_ok, 'failures': [x for x in results if not x['ok']]}
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if gallery_ok and all(x['ok'] for x in results) else 1)
