"""Contact sheets of unchanged real browser screenshots for integration QA."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT/'.audit-python-deps'))
from PIL import Image, ImageDraw, ImageFont
text = (ROOT/'output/playwright/unit-audit/u03-u04-forms-integrated-after.txt').read_text(encoding='utf-8')
data = json.loads(text.split('### Result')[1].split('### Ran Playwright code')[0].strip())
rows = data['results']
out = ROOT/'output/unit-audit-20261105/sheets/integrated-forms-U03-U04'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 21)
for start in range(0, len(rows), 4):
    sheet = Image.new('RGB', (1400, 1700), 'white')
    draw = ImageDraw.Draw(sheet)
    for j, row in enumerate(rows[start:start+4]):
        x, y = j % 2*700, j//2*850
        draw.text((x+12, y+4), row['wordId']+' '+row['word'], font=font, fill='black')
        with Image.open(ROOT/row['screenshot']) as shot:
            shot.load()
            image = shot.convert('RGB')
            image.thumbnail((680, 810))
            sheet.paste(image, (x+(700-image.width)//2, y+35))
    sheet.save(out/f'{start+1:02}-{min(start+4,len(rows)):02}.png')
print(json.dumps({'screenshots': len(rows), 'sheets': (len(rows)+3)//4}))
