"""Inventory current App catalog plus the retained LV1 production drafts.

Inventory is not semantic review. Missing publication is never silently treated
as missing required artwork for an intentional text-only curriculum.
"""
import csv
import hashlib
import json
from pathlib import Path
from audit_paths import source_root, source_reference

ROOT = Path(__file__).resolve().parent.parent
RAW = source_root()

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def main():
    app = read(ROOT/'output/unit-audit-20261105/app-inventory.json')
    published = read(ROOT/'src/features/vocabulary/lv1ReviewedImages.json')
    image_map = {c['id']: c for c in published}
    units = []
    for u in app['textbookUnits']:
        key = f"{u['track']}.{u['publisher']}.{u['volume']}.{u['unit']}"
        curriculum = next((c for c in app['curriculumUnits'] if c['level']==u['level'] and c['unit']==u['unit'] and c.get('publisher','ivy')==u['publisher']), None)
        rows = []
        if curriculum:
            for item in curriculum['items']:
                rows.append({
                    'id':item['learningItemId'],'kind':item['kind'],'word':item.get('displayWord',item.get('pattern')),
                    'officialWordId':item.get('officialWordId'),'officialSenseId':item.get('officialSenseId'),
                    'sourcePage':item.get('sourcePage'),'sourceReview':item.get('review'),
                    'hasOriginalExample':bool(item.get('originalExample')),'hasIllustration':bool(item.get('illustration')),
                    'deliveryMode':curriculum.get('deliveryMode'),'practiceMode':item.get('practiceMode'),
                    'auditState':'not_checked','artRequirement':'text_only_no_approved_art_required' if curriculum.get('deliveryMode')=='text_only' else 'check_existing_contract',
                })
        else:
            for item in published:
                if u['level']=='LV1' and item['unit']==u['unit']:
                    rows.append({'id':item['id'],'kind':'published_image_pair','word':item['displayWord'],
                                 'officialWordId':item.get('officialWordId'),'hasIllustration':True,'auditState':'not_checked'})
        draft = []
        path = RAW/f"Unit_{u['unit']:02}"/'manifest.tsv'
        if u['level']=='LV1' and path.exists():
            with path.open(encoding='utf-8-sig',newline='') as handle:
                for r in csv.DictReader(handle,delimiter='\t'):
                    if not r.get('order'):continue
                    item_id=f"LV1-U{u['unit']:02}-{int(r['order']):02}"
                    image=path.parent/r['file']
                    draft.append({'id':item_id,'word':r['word'],'officialWordId':r.get('word_id'),
                                  'captionEn':r['english'],'captionZh':r['chinese'],'sourceStatus':r.get('example_status'),
                                  'sourceImage':source_reference(image),'sourceImageExists':image.exists(),
                                  'sourceImageSha256':hashlib.sha256(image.read_bytes()).hexdigest() if image.exists() else None,
                                  'published':item_id in image_map,'auditState':'not_checked',
                                  'scope':'retained_production_draft_not_automatically_adopted_by_app'})
        units.append({'key':key,'appCatalog':u,'runtimeSource':'curriculumUnits' if curriculum else 'lv1ReviewedGroups/published-image-subset',
                      'items':rows,'retainedLV1Drafts':draft,'unitComprehensiveState':'not_completed'})
    result={'baseCommit':'29cfc684d7a11b07f09988c478d30358830f1951',
            'inventoryOnly':True,'order':'actual textbookUnits runtime order',
            'counts':{'catalogUnits':len(units),'curriculumUnits':len(app['curriculumUnits']),
                      'runtimeItems':sum(len(u['items']) for u in units),'retainedLV1DraftPairs':sum(len(u['retainedLV1Drafts']) for u in units),
                      'retainedLV1UnpublishedDraftPairs':sum(not c['published'] for u in units for c in u['retainedLV1Drafts'])},
            'units':units}
    out=ROOT/'docs/unit-audit-20261105/MASTER-INVENTORY.json'
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(result['counts']))

if __name__=='__main__':main()
