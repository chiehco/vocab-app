"""Stage exactly four approved LV4 U18/U20 mappings; publish after whole-delta audit.

Never reimport the workbook or change a picture. Existing worksheet XML stays
byte-identical after removing the twelve appended rows. Publication requires an
unchanged source, an audited App hash set, and a verified exclusive backup.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import openpyxl

from apply_lv3_approved_review import CONTENT_FILES, NS, append_row, published_content_hash, read, replace_outputs, sha
from build_sa_pack import build_sa_pack
from import_data import parse_examples, parse_senses, parse_words, write_json

CONTRACT_PATH = Path(__file__).parent / 'data/lv4_u18_u20_approved_additions.json'
BASE_MASTER_HASH = '76737ac427b80322a40b72abb50980717f656ea980c61474f28d7d520488aecb'
OUTPUT_FILES = [
    'public/data/v1/' + name for name in ['words.json', 'senses.json', 'examples.json', 'meta.json', 'sa-pack.json']
] + ['src/features/direct/' + name for name in ['curriculumLV4Unit18.json', 'curriculumLV4Unit20.json', 'wordCatalog.json']
] + ['src/features/vocabulary/lv4MappedReview.json']
SHEETS = ['input_words_單字主表', 'input_senses_義項表', 'input_examples_例句表']


def contract():
    result = read(CONTRACT_PATH)
    assert result['masterBeforeSha256'] == BASE_MASTER_HASH
    assert [(c['word'], c['wordId']) for c in result['cards']] == [
        ('preferable', 'W006087'), ('brutality', 'W006088'), ('cubic', 'W006089'), ('interactive', 'W006090')]
    return result


def validate_sources(source_root, repo):
    approved = contract()
    for relative, expected in approved['sourceSha256'].items():
        assert sha(source_root / relative) == expected, f'Approved source changed: {relative}'
    for card in approved['cards']:
        item = card['originalItem']
        source = read(source_root / card['sourceDirectory'] / f"unit{item['unit']}.json")
        assert [i for i in source['learningItems'] if i['learningItemId'] == item['learningItemId']] == [item]
        record = card['approval']
        assert record['artApproval'] == record['pairApproval'] == 'approved'
        assert all(record[key] == value for key, value in item['approval'].items())
        assert sha(repo / 'public' / item['illustration']['path']) == card['publishedImageSha256']


def row_values(card):
    item, example = card['originalItem'], card['originalItem']['originalExample']
    word, meaning, pos = card['word'], item['targetMeaningZh'], item['sensePos']
    source = f"常春藤 LV4 Unit{item['unit']} p.{card['sourcePage']}；原批准圖句 {card['approval']['reviewId']}；2026-10-09 僅四詞正式映射批次。"
    return {
        SHEETS[0]: [card['wordId'], word, 'LV4', pos, meaning, card['meaningEn'], card['usagePattern'],
                    None, None, None, word, False, source, 'reviewed', None, card['usagePatternZh']],
        SHEETS[1]: [card['senseId'], card['wordId'], word, pos, meaning, None, None, word,
                    '僅教材已批准目標義項；不擴增其他字典義項。', 'reviewed'],
        SHEETS[2]: [card['exampleId'], word, pos, meaning, 'daily', example['sentenceEn'], example['sentenceZh'],
                    example['blankSentence'], example['answer'], 'LV4', 'reviewed',
                    f"沿用 {example['workExampleId']}；provenance={example['provenance']}；非教材原句匯入；圖句批准 {card['approval']['reviewId']}。"],
    }


def stage_master(source, staged):
    assert sha(source) == BASE_MASTER_HASH, 'Master changed; re-audit before applying'
    approved = contract()['cards']
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=False)
    try:
        identifiers = set()
        for sheet in workbook:
            for row in sheet.values:
                for value in row:
                    if isinstance(value, str):
                        identifiers.update(re.findall(r'\bW\d{6}\b', value))
        assert len(workbook.sheetnames) == 64
        assert max(identifiers) == 'W006086' and not identifiers.intersection(c['wordId'] for c in approved), 'Word ID conflict'
        words = parse_words(workbook[SHEETS[0]])
        assert len(words) == 6086 and len({w['wordId'] for w in words}) == 6086
        assert not {c['word'] for c in approved}.intersection(v.lower() for w in words for v in w['wordVariants']), 'Already applied; headword conflict'
        # The legacy OOXML deliberately omits dimensions; read-only max_row is None.
        counts = {name: sum(1 for _ in workbook[name].values) for name in SHEETS}
    finally:
        workbook.close()
    with ZipFile(source) as original:
        formula_count = sum(len(ET.fromstring(original.read(n)).findall('.//s:f', NS))
                            for n in original.namelist() if n.startswith('xl/worksheets/') and n.endswith('.xml'))
        assert formula_count == 829
        rels = {row.attrib['Id']: row.attrib['Target'] for row in ET.fromstring(original.read('xl/_rels/workbook.xml.rels'))}
        sheets = ET.fromstring(original.read('xl/workbook.xml')).find('s:sheets', NS)
        paths = {s.attrib['name']: rels[s.attrib[f'{{{NS["r"]}}}id']] for s in sheets}
        replacements, added_rows = {}, {}
        for name in SHEETS:
            path = paths[name]
            path = path.lstrip('/') if path.startswith('/') else 'xl/' + path
            raw, rows = original.read(path), []
            for card in approved:
                raw, number = append_row(raw, row_values(card)[name], counts[name] + len(rows))
                rows.append(number)
            replacements[path], added_rows[name] = raw, rows
        with ZipFile(staged, 'w') as result:
            for member in original.infolist():
                result.writestr(member, replacements.get(member.filename, original.read(member)))
    with ZipFile(source) as original, ZipFile(staged) as result:
        assert original.namelist() == result.namelist()
        changed = [n for n in original.namelist() if original.read(n) != result.read(n)]
        assert set(changed) == set(replacements)
    return dict(sourceSha256=BASE_MASTER_HASH, stagedSha256=sha(staged), rows=added_rows,
                changedWorkbookParts=changed, preservedSheets=64, preservedFormulas=829, priorCellsAndFormulas='byte-preserved')


def build_outputs(repo, master, out):
    out.mkdir(parents=True)
    staged = out / master.name
    evidence = stage_master(master, staged)
    data, direct = repo / 'public/data/v1', repo / 'src/features/direct'
    cards = contract()['cards']
    workbook = openpyxl.load_workbook(staged, read_only=True, data_only=True)
    try:
        for filename, parser, sheet, key, id_key in [
            ('words.json', parse_words, SHEETS[0], 'wordId', 'wordId'),
            ('senses.json', parse_senses, SHEETS[1], 'senseId', 'senseId'),
            ('examples.json', parse_examples, SHEETS[2], 'exampleId', 'exampleId')]:
            ids = {c[id_key] for c in cards}
            additions = [r for r in parser(workbook[sheet]) if r[key] in ids]
            assert len(additions) == 4 and {r[key] for r in additions} == ids
            rows = read(data / filename)
            assert not any(r[key] in ids for r in rows), 'Already applied; do not duplicate'
            before = list(rows)
            rows.extend(additions)
            rows.sort(key=lambda r: r[key])
            assert [r for r in rows if r[key] not in ids] == before
            write_json(data / filename, rows)
    finally:
        workbook.close()
    for name in sorted({c['unitFile'] for c in cards}):
        unit = read(direct / name)
        for card in [c for c in cards if c['unitFile'] == name]:
            item = next(i for i in unit['learningItems'] if i['learningItemId'] == card['originalItem']['learningItemId'])
            assert item == card['originalItem'], 'Unapproved item change; stop'
            assert item['officialWordId'] is None and item['officialSenseId'] is None
            item.update(lexemeRef=card['wordId'], officialWordId=card['wordId'], officialSenseId=card['senseId'])
        assert all(i.get('officialWordId') for i in unit['learningItems'] if i['kind'] == 'vocabulary')
        # Approved LV4 packs use one-space indentation; preserve a six-line ID diff.
        (direct / name).write_text(json.dumps(unit, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    meta = read(data / 'meta.json')
    meta['generatedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    for name in ['words', 'senses', 'examples']:
        meta['counts'][name] += 4
        assert meta['counts'][name] == len(read(data / (name + '.json')))
    meta.update(wordsHash=sha(data / 'words.json'), contentHash=published_content_hash(data))
    write_json(data / 'meta.json', meta)
    catalog = [dict(wordId=w['wordId'], word=w['word'], variants=w['wordVariants']) for w in read(data / 'words.json')]
    (direct / 'wordCatalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    evidence['packCounts'] = build_sa_pack(data, direct)
    pack = read(data / 'sa-pack.json')
    assert len(pack['words']) == 1534
    for name in {c['unitFile'] for c in cards}:
        ids = {i['officialWordId'] for i in read(direct / name)['learningItems'] if i['kind'] == 'vocabulary'}
        assert ids.issubset({w['wordId'] for w in pack['words']})
    write_json(repo / 'src/features/vocabulary/lv4MappedReview.json', dict(
        schemaVersion=1, approvedAt='2026-10-09', scope=contract()['scope'], cards=cards,
        sourceSha256=contract()['sourceSha256'], master=evidence))
    write_json(out / 'apply-result.json', evidence)
    return evidence


def apply_review(repo, master, source_root, out):
    assert out.resolve() != (repo / 'output').resolve() and out.resolve().is_relative_to((repo / 'output').resolve()), 'Dedicated repo/output directory required'
    validate_sources(source_root, repo)
    direct = Path('src/features/direct')
    inputs = [Path('public/data/v1') / n for n in CONTENT_FILES + ['meta.json']]
    inputs += [direct / n for n in ['curriculum.json', 'curriculumUnit2.json']]
    inputs += [p.relative_to(repo) for p in (repo / direct).glob('curriculumLV4Unit*.json')]
    inputs += [Path('src/features/vocabulary/lv1ReviewedImages.json')]
    destinations = [repo / n for n in OUTPUT_FILES] + [out / master.name, out / 'apply-result.json']
    assert master.resolve() not in {p.resolve() for p in destinations}
    before = {p: p.read_bytes() if p.exists() else None for p in destinations}
    sources = [master, CONTRACT_PATH] + [repo / p for p in inputs]
    sources += [source_root / p for p in contract()['sourceSha256']]
    sources += [repo / 'public' / c['originalItem']['illustration']['path'] for c in contract()['cards']]
    source_before = {p: p.read_bytes() for p in sources}
    with tempfile.TemporaryDirectory(prefix='.lv4-mapping-stage-', dir=repo.parent) as directory:
        root, stage = Path(directory), Path(directory) / 'repo'
        for relative in inputs:
            target = stage / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repo / relative, target)
        stage_out = root / 'source'
        evidence = build_outputs(stage, master, stage_out)
        assert all(p.read_bytes() == b for p, b in source_before.items()), 'Input changed during staging'
        outputs = [(stage / n, repo / n) for n in OUTPUT_FILES]
        outputs += [(stage_out / master.name, out / master.name), (stage_out / 'apply-result.json', out / 'apply-result.json')]
        replace_outputs(outputs, before)
    return evidence


def publish_master(master, out, repo, source_root=None):
    if source_root is not None:
        validate_sources(source_root, repo)
    evidence, audit = read(out / 'apply-result.json'), read(out.parent / 'scope-audit.json')
    staged = out / master.name
    assert audit['status'] == 'pass' and audit['master']['sha256'] == evidence['stagedSha256'] == sha(staged)
    assert audit['appSha256'] == {n: sha(repo / n) for n in OUTPUT_FILES}, 'Audited App outputs changed; stop'
    assert sha(master) == BASE_MASTER_HASH, 'Source changed; do not overwrite'
    backup = master.with_name(master.stem + '_before_lv4_u18_u20_4words_20261009.xlsx')
    assert not backup.exists(), 'Backup already exists; inspect instead of overwriting'
    original = master.read_bytes()
    with backup.open('xb') as stream:
        stream.write(original)
    assert sha(backup) == BASE_MASTER_HASH
    replace_outputs([(staged, master)], {master: original})
    assert sha(master) == evidence['stagedSha256']
    result = dict(published=True, backup=str(backup), sourceSha256=BASE_MASTER_HASH, masterSha256=sha(master))
    write_json(out / 'publish-result.json', result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--master', type=Path, required=True)
    parser.add_argument('--source-root', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--publish-master', action='store_true')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parent.parent
    assert args.source_root, 'Approved sources required'
    if args.publish_master:
        result = publish_master(args.master, args.out, repo, args.source_root)
    else:
        result = apply_review(repo, args.master, args.source_root, args.out)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
