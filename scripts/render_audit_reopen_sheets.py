"""Inspect saved real-browser reopen screenshots; never change shipped art."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.audit-python-deps'))
from PIL import Image,ImageDraw,ImageFont
unit=int(sys.argv[1])
proof=json.loads((ROOT/f'docs/unit-audit-20261105/LV1-U{unit:02}-original-image-review.json').read_text(encoding='utf-8'))
rows=[c for c in proof['cards'] if c['generalCardRepair']]
out=ROOT/f'output/unit-audit-20261105/sheets/U{unit:02}-reopened';out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',21)
for start in range(0,len(rows),4):
    canvas=Image.new('RGB',(1400,1700),'white');draw=ImageDraw.Draw(canvas)
    for j,c in enumerate(rows[start:start+4]):
        x=j%2*700;y=j//2*850
        draw.text((x+15,y+4),c['id']+' '+c['word'],font=font,fill='black')
        with Image.open(ROOT/f"output/playwright/unit-audit/{c['id']}-general-hero.png") as original:
            original.load();shot=original.convert('RGB');shot.thumbnail((680,810));canvas.paste(shot,(x+(700-shot.width)//2,y+35))
    canvas.save(out/f'{start+1:02}-{min(start+4,len(rows)):02}.png')
print(json.dumps({'reopenedScreenshots':len(rows),'sheets':(len(rows)+3)//4}))
