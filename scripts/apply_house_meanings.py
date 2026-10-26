"""Apply only the approved house records from the canonical workbook; preserve other public data."""
import argparse,hashlib,json
from pathlib import Path
from datetime import datetime,timezone
import openpyxl
from import_data import parse_words,parse_senses,parse_examples,parse_media,write_json,content_hash
from build_sa_pack import build_sa_pack

def apply(source:Path,data:Path,registry:Path):
    wb=openpyxl.load_workbook(source,read_only=True,data_only=True)
    word=next(r for r in parse_words(wb['input_words_單字主表']) if r['wordId']=='W000415')
    senses=[r for r in parse_senses(wb['input_senses_義項表']) if r['wordId']=='W000415']
    assert {(r['senseId'],r['sensePos'],r['meaningZh']) for r in senses}=={('W000415-1','v.','容納，收藏'),('W000415-2','n.','房屋，房子')}
    examples=[r for r in parse_examples(wb['input_examples_例句表']) if r['word']=='house']
    media=[r for r in parse_media(wb['input_media_prompts_圖卡']) if r['targetWord']=='house']
    assert word['verbForms']['past']=='housed' and all(r.get('senseId') for r in examples+media)
    for name,key,incoming in [('words','wordId',[word]),('senses','senseId',senses),('examples','exampleId',examples),('media','assetId',media)]:
        file=data/f'{name}.json';rows=json.loads(file.read_text(encoding='utf-8'));new={r[key]:r for r in incoming}
        for row in rows:
            if row[key] in new:
                if name=='words':row['verbForms']=new.pop(row[key])['verbForms']
                else:row.update(new.pop(row[key]))
            elif name=='examples' and row.get('word')=='house':
                # Previously shipped daily example: retain its stable ID and original sentence.
                row.update(senseId='W000415-2',sensePos='n.',meaningHint='房屋，房子')
        rows.extend(new.values());rows.sort(key=lambda r:r[key]);write_json(file,rows)
    images=json.loads(registry.read_text(encoding='utf-8'))
    card=next(r for r in images if r['id']=='LV1-U06-06')
    card['illustration']['senseId']='W000415-2'
    registry.write_text(json.dumps(images,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    meta_path=data/'meta.json';meta=json.loads(meta_path.read_text(encoding='utf-8'))
    meta['counts']['senses']=len(json.loads((data/'senses.json').read_text(encoding='utf-8')))
    meta['counts']['examples']=len(json.loads((data/'examples.json').read_text(encoding='utf-8')))
    meta['wordsHash']=hashlib.sha256((data/'words.json').read_bytes()).hexdigest();meta['contentHash']=content_hash(data)
    meta['generatedAt']=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    meta['houseSourceSha256']=hashlib.sha256(source.read_bytes()).hexdigest()
    write_json(meta_path,meta);build_sa_pack(data)
    print(json.dumps({'houseSenses':len(senses),'sourceExamples':len(examples),'sourceSha256':meta['houseSourceSha256']},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--data',type=Path,default=Path('public/data/v1'));p.add_argument('--registry',type=Path,default=Path('src/features/vocabulary/lv1ReviewedImages.json'));a=p.parse_args();apply(a.source,a.data,a.registry)
