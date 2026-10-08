"""Read-only scope audit for the approved LV3 patch on the legacy LV3 schema.

verify_unit.py expects a fully approved LV4-style pack; LV3 U1/U2 are partial
approvals. This checks the complete two-unit delta without inventing approvals.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from import_data import write_json
from apply_lv3_approved_review import published_content_hash

REPO = Path(__file__).resolve().parent.parent
BASE = '16c10642539e7a861bd45cf275f9761241fdfa93'


def before(path):
    return json.loads(subprocess.check_output(['git', 'show', BASE + ':' + path], cwd=REPO))


def now(path):
    return json.loads((REPO / path).read_text(encoding='utf-8'))


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--before-master', required=True, type=Path)
    ap.add_argument('--staged-master', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    args = ap.parse_args()
    manifest = now('src/features/vocabulary/lv3ApprovedReview.json')
    expected = manifest['master']
    assert sha(args.before_master.read_bytes()) == expected['sourceSha256']
    assert sha(args.staged_master.read_bytes()) == expected['stagedSha256']
    with ZipFile(args.before_master) as old, ZipFile(args.staged_master) as new:
        assert old.namelist() == new.namelist()
        changed = [name for name in old.namelist() if old.read(name) != new.read(name)]
        assert changed == expected['changedWorkbookParts']
        formula_count = 0
        for name in old.namelist():
            if name.startswith('xl/worksheets/') and name.endswith('.xml'):
                prior, current = ET.fromstring(old.read(name)), ET.fromstring(new.read(name))
                ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                formula_count += len(prior.findall('.//s:f', ns))
                prior_rows = prior.find('s:sheetData', ns)
                current_rows = current.find('s:sheetData', ns)
                assert [ET.tostring(row) for row in current_rows[:len(prior_rows)]] == [ET.tostring(row) for row in prior_rows]
                assert len(current_rows) == len(prior_rows) + int(name in changed)
    data = 'public/data/v1/'
    added = {}
    for filename, key, ident in [('words.json', 'wordId', 'W006085'), ('senses.json', 'senseId', 'W006085-1')]:
        prior, current = before(data + filename), now(data + filename)
        assert [row for row in current if row[key] != ident] == prior
        additions = [row for row in current if row[key] == ident]
        assert len(additions) == 1
        added[filename] = additions[0]
    for filename in ['examples.json', 'relations.json', 'morphemes.json', 'media.json', 'notes.json', 'exam_priority.json', 'hooks.json']:
        assert now(data + filename) == before(data + filename)
    changed_items = []
    for filename, targets in [('curriculum.json', {'probability', 'limousine', 'limo'}), ('curriculumUnit2.json', {'slender'})]:
        path = 'src/features/direct/' + filename
        prior, current = before(path), now(path)
        assert {k:v for k,v in prior.items() if k != 'learningItems'} == {k:v for k,v in current.items() if k != 'learningItems'}
        assert len(prior['learningItems']) == len(current['learningItems'])
        for a, b in zip(prior['learningItems'], current['learningItems']):
            if a == b: continue
            assert a['displayWord'] in targets
            assert a['learningItemId'] == b['learningItemId'] and a['originalExample'] == b['originalExample']
            expected_keys = {'illustration'} if a['displayWord'] in {'probability', 'slender'} else {'lexemeRef', 'officialWordId', 'officialSenseId'}
            assert {key for key in a.keys() | b.keys() if a.get(key) != b.get(key)} == expected_keys
            changed_items.append(a['learningItemId'])
    assert set(changed_items) == {'LI-LV3U01-probability', 'LI-LV3U01-limousine', 'LI-LV3U01-limo', 'LI-LV3U02-slender'}
    prior_pack, pack = before(data + 'sa-pack.json'), now(data + 'sa-pack.json')
    for key in prior_pack:
        if key == 'meta': continue
        rows = pack[key]
        if key in {'words', 'senses'}:
            rows = [row for row in rows if row['wordId'] != 'W006085']
        assert rows == prior_pack[key], key
    meta = now(data + 'meta.json')
    assert meta['counts']['words'] == len(now(data + 'words.json')) == 6085
    assert meta['counts']['senses'] == len(now(data + 'senses.json')) == 766
    assert meta['wordsHash'] == sha((REPO / data / 'words.json').read_bytes())
    assert meta['contentHash'] == published_content_hash(REPO / data)
    for item in manifest['cards']:
        assert sha((REPO / 'public' / item['imagePath']).read_bytes()) == item['imageSha256']
    args.out.parent.mkdir(parents=True, exist_ok=True)
    result = dict(status='pass', base=BASE, changedItems=changed_items,
                  addedWord=added['words.json'], addedSense=added['senses.json'],
                  mother=dict(changedParts=changed, priorCellsPreserved=True, formulasPreserved=formula_count,
                              sha256=expected['stagedSha256']),
                  counts=meta['counts'], bootstrapWords=len(pack['words']),
                  unchangedData=['examples', 'relations', 'morphemes', 'media', 'notes', 'exam_priority', 'hooks'],
                  pending=manifest['pending'])
    write_json(args.out, result)
    print(json.dumps(dict(status='pass', changedItems=changed_items, masterFormulasPreserved=formula_count,
                         words=6085, senses=766, bootstrapWords=len(pack['words'])), ensure_ascii=False))


if __name__ == '__main__':
    main()
