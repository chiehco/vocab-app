"""Read-only whole-delta audit for the one approved nostalgic entry."""
import argparse
import hashlib
import subprocess
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import apply_lv3_nostalgic as apply

REPO = Path(__file__).resolve().parent.parent
BASE = '3a4d022410e4f3c7dc189d6732fa0e2d517195b7'


def old(path):
    import json
    return json.loads(subprocess.check_output(['git', 'show', BASE + ':' + path], cwd=REPO))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before-master', type=Path, required=True)
    parser.add_argument('--staged-master', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    assert apply.sha(args.before_master) == apply.BASE_MASTER_HASH
    manifest = apply.read(REPO / 'src/features/vocabulary/lv3NostalgicReview.json')
    evidence = manifest['master']
    assert apply.sha(args.staged_master) == evidence['stagedSha256']
    formulas = 0
    with ZipFile(args.before_master) as original, ZipFile(args.staged_master) as staged:
        assert original.namelist() == staged.namelist()
        changed = [name for name in original.namelist() if original.read(name) != staged.read(name)]
        assert changed == evidence['changedWorkbookParts']
        assert set(changed) == {'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml', 'xl/worksheets/sheet5.xml'}
        for name in original.namelist():
            if name.startswith('xl/worksheets/') and name.endswith('.xml'):
                before, after = ET.fromstring(original.read(name)), ET.fromstring(staged.read(name))
                rows = before.find('s:sheetData', apply.NS)
                generated = after.find('s:sheetData', apply.NS)
                assert [ET.tostring(row) for row in rows] == [ET.tostring(row) for row in generated[:len(rows)]], name
                assert len(generated) == len(rows) + int(name in changed)
                formulas += len(before.findall('.//s:f', apply.NS))
    assert formulas == 829
    data = 'public/data/v1/'
    additions = {}
    for filename, key, identifier in [('words.json', 'wordId', apply.WORD_ID), ('senses.json', 'senseId', apply.SENSE_ID), ('examples.json', 'exampleId', apply.EXAMPLE_ID)]:
        before, after = old(data + filename), apply.read(REPO / data / filename)
        new = [row for row in after if row[key] == identifier]
        assert len(new) == 1 and [row for row in after if row[key] != identifier] == before
        additions[filename] = new[0]
    assert additions['words.json']['wordVariants'] == [apply.WORD]
    assert additions['words.json']['meaningZh'] == additions['senses.json']['meaningZh'] == apply.MEANING
    assert additions['examples.json']['sentenceEn'] == apply.SENTENCE
    for name in apply.UNCHANGED_DATA:
        before = subprocess.check_output(['git', 'show', BASE + ':' + data + name], cwd=REPO)
        assert (REPO / data / name).read_bytes().replace(b'\r\n', b'\n') == before, name
    path = 'src/features/direct/curriculum.json'
    before, after = old(path), apply.read(REPO / path)
    expected = old(path)
    item = next(row for row in expected['learningItems'] if row.get('displayWord') == apply.WORD)
    assert manifest['originalChapterMeaningsZh'] == item['chapterMeaningsZh'] == '鄉愁的'
    item.update(lexemeRef=apply.WORD_ID, officialWordId=apply.WORD_ID, officialSenseId=apply.SENSE_ID, chapterMeaningsZh=apply.MEANING)
    assert expected == after
    assert manifest['originalExample'] == item['originalExample']
    assert manifest['illustrationApproval'] == 'not_approved'
    unit2 = 'src/features/direct/curriculumUnit2.json'
    assert old(unit2) == apply.read(REPO / unit2)
    assert not any(row.get('displayWord') == apply.WORD for row in old(unit2)['learningItems'])
    catalog = 'src/features/direct/wordCatalog.json'
    current = apply.read(REPO / catalog)
    assert [row for row in current if row['wordId'] != apply.WORD_ID] == old(catalog)
    pack = apply.read(REPO / data / 'sa-pack.json')
    previous_pack = old(data + 'sa-pack.json')
    for key in ['words', 'senses', 'examples', 'relations', 'morphemes', 'notes', 'examPriorities', 'media']:
        assert [row for row in pack[key] if row.get('wordId') != apply.WORD_ID and row.get('word') != apply.WORD] == previous_pack[key], key
    assert [row for row in pack['words'] if row['wordId'] == apply.WORD_ID] == [additions['words.json']]
    assert [row for row in pack['senses'] if row['wordId'] == apply.WORD_ID] == [additions['senses.json']]
    assert [row for row in pack['examples'] if row['word'] == apply.WORD] == [additions['examples.json']]
    meta = apply.read(REPO / data / 'meta.json')
    expected_counts = old(data + 'meta.json')['counts']
    for key in ['words', 'senses', 'examples']:
        expected_counts[key] += 1
    assert meta['counts'] == expected_counts
    assert meta['contentHash'] == apply.published_content_hash(REPO / data)
    assert meta['wordsHash'] == hashlib.sha256((REPO / data / 'words.json').read_bytes().replace(b'\r\n', b'\n')).hexdigest()
    report = dict(status='pass', base=BASE, addedWord=additions['words.json'], addedSense=additions['senses.json'],
                  addedExample=additions['examples.json'], changedItems=['LI-LV3U01-nostalgic'],
                  counts=meta['counts'], bootstrapWords=len(pack['words']), unchangedData=apply.UNCHANGED_DATA,
                  master=dict(sha256=apply.sha(args.staged_master), changedParts=changed, preservedSheets=64, preservedFormulas=formulas, priorCellsPreserved=True),
                  appSha256={name: apply.sha(REPO / name) for name in apply.OUTPUT_FILES})
    apply.write_json(args.out, report)
    print(f"PASS: one word/sense/example; bootstrap {len(pack['words'])}; 64 sheets, {formulas} formulas preserved")


if __name__ == '__main__':
    main()
