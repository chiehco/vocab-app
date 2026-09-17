"""Import Unit19 only after verifying exact approved source text and image hashes."""
from pathlib import Path
import json,hashlib,shutil,sys
root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1])
read=lambda n:json.loads((source/n).read_text(encoding='utf8'))
pack=read('unit19.json');current=read('unit19-review.json');approval=read('approval.json')
assert approval==pack['approval'] and approval['status']=='approved'
assert len(current['cards'])==len(approval['cards'])==46
for c in current['cards']:
 a=next(x for x in approval['cards'] if x['reviewId']==c['reviewId'])
 assert a['artApproval']==a['pairApproval']=='approved'
 assert a['imageSha256']==hashlib.sha256((source/c['image']).read_bytes()).hexdigest()
 assert a['textSha256']==hashlib.sha256(json.dumps({k:c[k] for k in ['word','pos','meaningZh','captionEn','captionZh']},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
 i=next(x for x in pack['learningItems'] if x.get('approval',{}).get('reviewId')==c['reviewId'])
 assert (i['displayWord'],i['officialWordId'],i['sensePos'],i['targetMeaningZh'],i['illustration']['captionEn'],i['illustration']['captionZh'])==(c['word'],c['wordId'],c['pos'],c['meaningZh'],c['captionEn'],c['captionZh'])
 assert i['illustration']['path']=='curriculum/lv4-u19/'+Path(c['image']).stem+'.webp'
dest=root/'public/curriculum/lv4-u19';dest.mkdir(parents=True,exist_ok=True)
for a in pack['assets']:
 f=source/'assets/web'/a['file'];assert hashlib.sha256(f.read_bytes()).hexdigest()==a['sha256'];shutil.copy2(f,dest/a['file'])
(root/'src/features/direct/curriculumLV4Unit19.json').write_text(json.dumps({k:pack[k] for k in ['template','learningItems','questions','relatedNotes']},ensure_ascii=False,indent=1)+'\n',encoding='utf8')
print('Imported 77 items, 123 questions, 39 approved images')
