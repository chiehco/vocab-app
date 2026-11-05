"""Display observed general-card asset bytes alongside their actual UI caption."""
import json
import sys
import textwrap
from pathlib import Path
from urllib.parse import urlparse,unquote
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.audit-python-deps'))
from PIL import Image,ImageDraw,ImageFont
unit=int(sys.argv[1])
rows=json.loads((ROOT/f'output/unit-audit-20261105/U{unit:02}-ui-before.json').read_text(encoding='utf-8'))
source=json.loads((ROOT/f'output/unit-audit-20261105/LV1-U{unit:02}-full-source.json').read_text(encoding='utf-8'))
published={r['id'] for r in source if r['published']}
rows=[r for r in rows if r['imageInfo'] and r['id'] not in published]
out=ROOT/f'output/unit-audit-20261105/sheets/U{unit:02}-general';out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
for start in range(0,len(rows),4):
    sheet=Image.new('RGB',(1400,1600),'white');draw=ImageDraw.Draw(sheet)
    for j,row in enumerate(rows[start:start+4]):
        x=(j%2)*700;y=(j//2)*800
        draw.text((x+20,y+5),f"{row['id']} {row['word']}",font=font,fill='black')
        path=(ROOT/'public'/unquote(urlparse(row['imageInfo'][0]['src']).path).lstrip('/')).resolve()
        assert path.is_relative_to((ROOT/'public').resolve())
        with Image.open(path) as original:
            original.load();image=original.convert('RGB');image.thumbnail((660,660))
            sheet.paste(image,(x+20+(660-image.width)//2,y+40))
        hero=row['hero'];marker='圖說' if '圖說' in hero else '例句'
        text=hero.split(marker,1)[1].split('記憶狀態',1)[0].strip().split('\n\n')[0]
        for line_no,line in enumerate(textwrap.wrap(text,64)):
            draw.text((x+20,y+705+line_no*25),line,font=font,fill='black')
    sheet.save(out/f'{start+1:02}-{min(start+4,len(rows)):02}.png')
print(json.dumps({'observedGeneralImages':len(rows),'sheets':(len(rows)+3)//4}))
