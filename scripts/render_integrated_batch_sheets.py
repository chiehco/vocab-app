"""Pair real card/meaning screenshots for one verified-form integration batch."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.audit-python-deps'))
from PIL import Image, ImageDraw, ImageFont

batch = sys.argv[1]
assert batch in ('U07', 'U08-U09', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15')
rows = json.loads((ROOT / f'output/unit-audit-20261105/{batch}-integrated-ui-final.json').read_text(encoding='utf-8'))['results']
out = ROOT / f'output/unit-audit-20261105/sheets/integrated-{batch.lower()}'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 21)
for start in range(0, len(rows), 3):
    sheet = Image.new('RGB', (1200, 1950), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, row in enumerate(rows[start:start + 3]):
        y = index * 650
        draw.text((12, y + 8), row['wordId'] + ' ' + row['word'] + ' | card / meaning', font=font, fill='black')
        for column, (key, crop) in enumerate((('screenshot', (210, 90, 790, 690)), ('meaningScreenshot', (210, 300, 790, 900)))):
            with Image.open(ROOT / row[key]) as image:
                image.load()
                sheet.paste(image.convert('RGB').crop(crop), (10 + column * 600, y + 40))
    sheet.save(out / f'{start + 1:02}-{min(start + 3, len(rows)):02}.png')
print(json.dumps({'cards': len(rows), 'sheets': (len(rows) + 2) // 3, 'state': 'prepared_for_actual_pixel_review'}))
