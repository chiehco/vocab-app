"""Read-only release-scope and mapping audit for the minimal LiveABC adapter."""
import hashlib
import json
import subprocess
from pathlib import Path
from build_liveabc_runtime import ROOT, SOURCE, DEST, ITEM_FIELDS


def verify():
    load=lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
    units=load(DEST)
    assert [u['unit'] for u in units]==list(range(1,8))
    rows=[]
    for u in units:
        source=load(SOURCE/f"LiveABCBasicUnit{u['unit']:02}.json")
        assert u['items']==[{k:i[k] for k in ITEM_FIELDS if k in i} for i in source['learningItems']]
        assert u['templateId']==source['template']['templateId']
        assert u['publisher']=='liveabc' and u['bookId']=='liveabc-core-expanded'
        assert u['level']=='LIVEABC_BASIC' and u['volume']=='Basic'
        assert u['deliveryMode']=='text_only' and not u['questions'] and not u['relatedNotes']
        rows.extend(u['items'])
    pack=load(ROOT/'public/data/v1/sa-pack.json')
    starter={w['wordId']:w for w in pack['words']}
    assert len(starter)==5728
    ids={i['officialWordId'] for i in rows if i['officialWordId']}
    assert len(rows)==106 and len(ids)==98 and ids<=starter.keys()
    assert len({i['learningItemId'] for i in rows})==106
    admission=load(ROOT/'preparation/liveabc-basic/photo-batch-U01-U07/master-admission.json')
    assert admission['newFormalWordIds']==admission['newSenseIds']==0
    notes={r['word']:r for r in admission['entries']}
    supplements=[i for i in rows if not i['officialWordId']]
    assert len(supplements)==8 and set(notes)=={i['displayWord'] for i in supplements}
    for i in supplements:
        assert i['targetMeaningZh']==notes[i['displayWord']]['meaningZh']
        assert i['sourcePage']==notes[i['displayWord']]['sourcePage']
    master=Path(admission['masterPath'])
    assert hashlib.sha256(master.read_bytes()).hexdigest()==admission['masterSha256']
    diff=subprocess.check_output(['git','diff','--name-only','--','public','package.json','package-lock.json'],cwd=ROOT,text=True)
    assert not diff.strip(), diff
    raw=DEST.read_text('utf-8')
    for forbidden in ('photoEvidence','sourceManifest','originalExample','illustration','pdfPage','U08','U09','C:\\'):
        assert forbidden not in raw, forbidden
    return {'status':'passed','units':[1,2,3,4,5,6,7],'textItems':106,'mappedUniqueWords':98,
            'supplementaryNotes':8,'dictionaryWordIdsCreated':0,'starterWords':5728,
            'photoSourcePackExactProjection':True,'privateEvidencePublished':False,
            'excludedU8AndLater':True,'existingPublicDataOrPackageChanges':False,
            'masterSha256Verified':admission['masterSha256']}


if __name__=='__main__':
    print(json.dumps(verify(),ensure_ascii=False,indent=2))
