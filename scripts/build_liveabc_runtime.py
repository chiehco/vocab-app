"""Build only the seven photo-verified units; never ship private source evidence."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'preparation/liveabc-basic/photo-batch-U01-U07/compiled'
DEST = ROOT / 'src/features/direct/liveabcBasic.json'
ITEM_FIELDS = ('learningItemId', 'kind', 'displayWord', 'officialWordId',
               'officialSenseId', 'sensePos', 'targetMeaningZh', 'chapterMeaningsZh',
               'sourcePage', 'sourceRole', 'printedLabel', 'meaningSource', 'review',
               'practiceMode', 'dictionarySenseAdoption', 'identityCorrection')


def build():
    units = []
    for n in range(1, 8):
        p = SOURCE / f'LiveABCBasicUnit{n:02}.json'
        pack = json.loads(p.read_text(encoding='utf-8'))
        t = pack['template']
        assert t['unit'] == n and t['level'] == 'LIVEABC_BASIC'
        assert t['textAcceptanceSource'] == 'original_local_photographs_only'
        assert not t['pdfSubstitutionUsed'] and not pack['questions']
        assert len(pack['learningItems']) == [14, 13, 18, 13, 15, 20, 13][n-1]
        items = [{k: i[k] for k in ITEM_FIELDS if k in i} for i in pack['learningItems']]
        assert all(i['practiceMode'] == 'read_only' and i['review'] == 'source_checked_text_only' for i in items)
        units.append({
            'templateId': t['templateId'], 'revision': t['revision'], 'level': t['level'],
            'unit': n, 'name': t['title'], 'bookId': t['bookId'], 'publisher': 'liveabc',
            'volume': 'Basic', 'deliveryMode': 'text_only', 'items': items,
            'questions': [], 'relatedNotes': [],
        })
    rows = [i for u in units for i in u['items']]
    assert len(rows) == 106 and sum(bool(i['officialWordId']) for i in rows) == 98
    assert len({i['learningItemId'] for i in rows}) == 106
    data = json.dumps(units, ensure_ascii=False, indent=2) + '\n'
    DEST.write_text(data, encoding='utf-8', newline='\n')
    return {'units': 7, 'items': 106, 'mapped': 98, 'supplements': 8,
            'output': str(DEST.relative_to(ROOT)), 'sha256': hashlib.sha256(data.encode()).hexdigest()}


if __name__ == '__main__':
    print(json.dumps(build(), ensure_ascii=False, indent=2))
