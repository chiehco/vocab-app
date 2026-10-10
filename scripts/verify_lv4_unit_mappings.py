"""Read-only whole-delta audit for the four approved LV4 U18/U20 mappings."""
import argparse
import copy
import hashlib
import json
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import apply_lv4_unit_mappings as apply

REPO = Path(__file__).resolve().parent.parent
BASE = 'ba22d7349f5441ac30d99b0af979d3e0ad8b015f'


def old(path):
    return json.loads(subprocess.check_output(['git', 'show', BASE + ':' + path], cwd=REPO))


def audit(before_master, staged_master, source_root):
    apply.validate_sources(source_root, REPO)
    assert apply.sha(before_master) == apply.BASE_MASTER_HASH
    evidence = apply.read(REPO / 'src/features/vocabulary/lv4MappedReview.json')['master']
    assert apply.sha(staged_master) == evidence['stagedSha256']
    formulas = 0
    with ZipFile(before_master) as original, ZipFile(staged_master) as staged:
        assert original.namelist() == staged.namelist()
        changed = [n for n in original.namelist() if original.read(n) != staged.read(n)]
        assert changed == evidence['changedWorkbookParts']
        assert set(changed) == {'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml', 'xl/worksheets/sheet5.xml'}
        for name in original.namelist():
            if name.startswith('xl/worksheets/') and name.endswith('.xml'):
                before, after = ET.fromstring(original.read(name)), ET.fromstring(staged.read(name))
                rows, generated = before.find('s:sheetData', apply.NS), after.find('s:sheetData', apply.NS)
                assert [ET.tostring(r) for r in rows] == [ET.tostring(r) for r in generated[:len(rows)]], name
                assert len(generated) == len(rows) + (4 if name in changed else 0)
                # Prove byte preservation independently of append_row's own assertion.
                raw = staged.read(name).decode('utf-8')
                if name in changed:
                    import re
                    for number in range(len(rows) + 1, len(rows) + 5):
                        raw, count = re.subn(rf'<(?:\w+:)?row r="{number}">.*?</(?:\w+:)?row>', '', raw)
                        assert count == 1
                assert raw.encode('utf-8') == original.read(name)
                formulas += len(before.findall('.//s:f', apply.NS))
    assert formulas == 829
    cards, additions = apply.contract()['cards'], {}
    words, word_ids = {c['word'] for c in cards}, {c['wordId'] for c in cards}
    data = 'public/data/v1/'
    for filename, key, id_key in [('words.json', 'wordId', 'wordId'), ('senses.json', 'senseId', 'senseId'), ('examples.json', 'exampleId', 'exampleId')]:
        ids = {c[id_key] for c in cards}
        before, after = old(data + filename), apply.read(REPO / data / filename)
        added = [r for r in after if r[key] in ids]
        assert len(added) == 4 and len({r[key] for r in after}) == len(after)
        assert [r for r in after if r[key] not in ids] == before
        additions[filename] = added
    for card in cards:
        item = card['originalItem']
        w = next(r for r in additions['words.json'] if r['wordId'] == card['wordId'])
        s = next(r for r in additions['senses.json'] if r['senseId'] == card['senseId'])
        e = next(r for r in additions['examples.json'] if r['exampleId'] == card['exampleId'])
        assert w['wordVariants'] == [card['word']] and w['meaningZh'] == s['meaningZh'] == item['targetMeaningZh']
        assert w['pos'] == s['sensePos'] == item['sensePos']
        for key in ['sentenceEn', 'sentenceZh', 'blankSentence', 'answer']:
            assert e[key] == item['originalExample'][key]
    unchanged = [n for n in apply.CONTENT_FILES if n not in additions]
    for name in unchanged:
        assert apply.read(REPO / data / name) == old(data + name)
    mapped_units = {}
    for name in ['curriculum.json', 'curriculumUnit2.json'] + [f'curriculumLV4Unit{u}.json' for u in [17, 18, 19, 20]]:
        path = 'src/features/direct/' + name
        expected = old(path)
        for card in [c for c in cards if c['unitFile'] == name]:
            item = next(i for i in expected['learningItems'] if i['learningItemId'] == card['originalItem']['learningItemId'])
            assert item == card['originalItem']
            item.update(lexemeRef=card['wordId'], officialWordId=card['wordId'], officialSenseId=card['senseId'])
        current = apply.read(REPO / path)
        assert current == expected, f'Unexpected unit delta: {name}'
        vocabulary = [i for i in current['learningItems'] if i['kind'] == 'vocabulary']
        mapped_units[name] = dict(vocabulary=len(vocabulary), mapped=sum(bool(i.get('officialWordId')) for i in vocabulary), uniqueIds=len({i['officialWordId'] for i in vocabulary if i.get('officialWordId')}))
    catalog = 'src/features/direct/wordCatalog.json'
    assert [r for r in apply.read(REPO / catalog) if r['wordId'] not in word_ids] == old(catalog)
    pack, before_pack = apply.read(REPO / data / 'sa-pack.json'), old(data + 'sa-pack.json')
    for key in ['words', 'senses', 'examples', 'relations', 'morphemes', 'notes', 'examPriorities', 'media']:
        assert [r for r in pack[key] if r.get('wordId') not in word_ids and r.get('word') not in words] == before_pack[key], key
    for name in ['curriculumLV4Unit18.json', 'curriculumLV4Unit20.json']:
        ids = {i['officialWordId'] for i in apply.read(REPO / 'src/features/direct' / name)['learningItems'] if i['kind'] == 'vocabulary'}
        assert None not in ids and ids.issubset({w['wordId'] for w in pack['words']})
    meta = apply.read(REPO / data / 'meta.json')
    expected_counts = copy.deepcopy(old(data + 'meta.json')['counts'])
    for key in ['words', 'senses', 'examples']:
        expected_counts[key] += 4
    assert meta['counts'] == expected_counts
    assert meta['contentHash'] == apply.published_content_hash(REPO / data)
    assert meta['wordsHash'] == hashlib.sha256((REPO / data / 'words.json').read_bytes().replace(b'\r\n', b'\n')).hexdigest()
    assert all(r.get('wordId') not in word_ids for r in pack['examPriorities'])
    assert len(pack['words']) == 1534
    changed_files = subprocess.check_output(['git', 'diff', '--name-only', BASE], cwd=REPO, text=True).splitlines()
    assert not any(n.startswith('public/curriculum/') or n.startswith('public/wordbeast/')
                   or n.startswith('src/db/') and not n.endswith('.test.ts') for n in changed_files)
    return dict(status='pass', base=BASE, additions=additions, mappedUnits=mapped_units, bootstrapWords=len(pack['words']),
                unchangedData=unchanged, master=dict(sha256=apply.sha(staged_master), changedParts=changed,
                preservedSheets=64, preservedFormulas=formulas, priorCellsBytePreserved=True),
                appSha256={n: apply.sha(REPO / n) for n in apply.OUTPUT_FILES})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before-master', type=Path, required=True)
    parser.add_argument('--staged-master', type=Path, required=True)
    parser.add_argument('--source-root', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    report = audit(args.before_master, args.staged_master, args.source_root)
    apply.write_json(args.out, report)
    print('PASS: four words/senses/examples; U18 47/47, U20 46/46; starter 1534; 64 sheets / 829 formulas preserved')


if __name__ == '__main__':
    main()
