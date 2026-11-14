"""Install only explicitly pixel-reviewed general-card pairs in this checkout."""
import json
import hashlib
import sys
from pathlib import Path
from audit_paths import resolve_source
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.audit-python-deps'))
from PIL import Image
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
proof_path=ROOT/sys.argv[1];proof=read(proof_path)
registry_path=ROOT/'src/features/vocabulary/auditedWordIllustrations.json';registry=read(registry_path)
words=read(ROOT/'public/data/v1/words.json')
target=ROOT/'public/wordbeast/audited-20261105';target.mkdir(parents=True,exist_ok=True)
added=[]
for row in proof['cards']:
    if not row.get('generalCardRepair'):continue
    assert 'actually viewed' in row['pixelReview'] and row['observation']
    word=next(w for w in words if w['wordId']==row['officialWordId'])
    original=resolve_source(row['sourceImage']);assert sha(original)==row['sourceImageSha256'],row['id']
    name=f"{row['id']}-{row['sourceImageSha256'][:12]}.webp";out=target/name
    with Image.open(original) as image:
        image.load();size=image.size
        if out.exists():assert sha(out)==row['publishedImageSha256'],'Existing revision changed; inspect first'
        else:image.convert('RGB').save(out,'WEBP',quality=85,method=6)
    with Image.open(out) as decoded:decoded.load();assert decoded.size==size
    entry={'reviewId':row['id'],'officialWordId':word['wordId'],
           'aliases':sorted({word['word'].lower(),row['word'].lower(),*[s.lower() for s in word.get('wordVariants',[])]}),
           'illustration':{'path':'wordbeast/audited-20261105/'+name,'captionEn':row['captionEn'],'captionZh':row['captionZh']}}
    existing=next((c for c in registry if c['officialWordId']==word['wordId']),None)
    if existing:assert existing==entry,'Another reviewed pair already exists; do not silently replace priority'
    else:registry.append(entry)
    row.update(localAsset='public/wordbeast/audited-20261105/'+name,publishedImageSha256=sha(out),dimensions=list(size),generalCardIntegration='local_prepared_not_ui_verified')
    added.append(row['id'])
write(proof_path,proof);write(registry_path,registry)
print(json.dumps({'localPairs':len(added),'registryTotal':len(registry),'draftUnitsPublished':False}))
