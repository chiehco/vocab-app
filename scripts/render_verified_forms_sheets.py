"""Render actual reopened three-form UI panels, not synthetic form mockups."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.audit-python-deps'))
from PIL import Image,ImageDraw,ImageFont
raw=(ROOT/'output/playwright/unit-audit/verified-31-forms-final-ui.txt').read_text(encoding='utf-8')
rows=json.loads(raw.split('### Result')[1].split('### Ran Playwright code')[0].strip())
assert len(rows)==31 and all(r['match'] for r in rows)
dest=ROOT/'output/unit-audit-20261105/sheets/verified-forms';dest.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
for offset in range(0,len(rows),8):
    batch=rows[offset:offset+8];sheet=Image.new('RGB',(1200,1000),'white');draw=ImageDraw.Draw(sheet)
    for index,row in enumerate(batch):
        x=(index%2)*600;y=(index//2)*250
        draw.text((x+12,y+8),row['wordId']+' '+row['word'],font=font,fill='black')
        image=Image.open(ROOT/row['screenshot']).convert('RGB');image.thumbnail((570,200))
        sheet.paste(image,(x+12,y+42))
    target=dest/f'{offset+1:02d}-{offset+len(batch):02d}.png';sheet.save(target);print(target.relative_to(ROOT))
