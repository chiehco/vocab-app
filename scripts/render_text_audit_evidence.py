"""Contact sheets of actual text-only unit browser evidence; no product images change."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.audit-python-deps'))
from PIL import Image,ImageDraw,ImageFont
unit=int(sys.argv[1])
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
out=ROOT/f'output/unit-audit-20261105/sheets/U{unit:02}-text-final'
out.mkdir(parents=True,exist_ok=True)
patches=json.loads((ROOT/f'docs/unit-audit-20261105/LV1-U{unit:02}-curriculum-patches.json').read_text(encoding='utf8'))['patches']
rows=json.loads((ROOT/f'output/unit-audit-20261105/U{unit:02}-text-ui-final.json').read_text(encoding='utf8'))
selected=[r for r in rows if any(p['id']==r['id'] for p in patches)]
for start in range(0,len(selected),6):
    sheet=Image.new('RGB',(1400,1550),'white');draw=ImageDraw.Draw(sheet)
    for j,row in enumerate(selected[start:start+6]):
        x,y=j%2*700,j//2*515
        draw.text((x+10,y+5),row['id']+' '+row['title'],font=font,fill='black')
        with Image.open(ROOT/row['screenshot']) as original:
            original.load();shot=original.convert('RGB').crop((25,620,975,min(original.height,1230)))
            shot.thumbnail((680,475));sheet.paste(shot,(x+10,y+35))
    sheet.save(out/f'source-{start+1:02}-{min(start+6,len(selected)):02}.png')
forms=json.loads((ROOT/f'output/unit-audit-20261105/U{unit:02}-forms-ui-final.json').read_text(encoding='utf8'))['results']
for start in range(0,len(forms),6):
    sheet=Image.new('RGB',(1240,1420),'white');draw=ImageDraw.Draw(sheet)
    for j,row in enumerate(forms[start:start+6]):
        x,y=j%2*620,j//2*470
        draw.text((x+10,y+5),row['wordId']+' '+row['word'],font=font,fill='black')
        with Image.open(ROOT/row['screenshot']) as original:
            original.load();shot=original.convert('RGB').crop((220,140,790,550));sheet.paste(shot,(x+10,y+35))
    sheet.save(out/f'forms-{start+1:02}-{min(start+6,len(forms)):02}.png')
print(json.dumps({'sourceItems':len(selected),'sourceSheets':(len(selected)+5)//6,'formPanels':len(forms),'formSheets':(len(forms)+5)//6}))
