"""Apply the explicitly approved LV3 U1/U2 intersection, without a full reimport.

Stages a workbook by adding two OOXML rows. Existing cells/formulas, styles and
all other ZIP members are preserved. --publish-master requires the audited hash.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import openpyxl
from PIL import Image

from import_data import parse_words, parse_senses, write_json
from build_sa_pack import build_sa_pack

BASE_MASTER_HASH = '390975586df29cab5a080931e180505b60fec5c95991b2af442a83d0ce5e7a2a'
WORD_ID = 'W006085'
HEADWORD = 'limousine/limo'
SOURCE_NOTE = '常春藤 LV3 Unit1 p.6；2026-10-08 使用者批准 limousine/limo 一主卡兩入口；limo 為 limousine 簡稱。'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
UNCHANGED_DATA = ['examples.json', 'relations.json', 'morphemes.json', 'media.json', 'notes.json', 'exam_priority.json', 'hooks.json']
CONTENT_FILES = ['words.json', 'senses.json', 'examples.json', 'relations.json', 'morphemes.json', 'notes.json', 'exam_priority.json', 'hooks.json', 'media.json']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def published_content_hash(data_dir):
    # Git stores LF. Windows checkout conversion must not change published hashes.
    digest = hashlib.sha256()
    for name in CONTENT_FILES:
        digest.update((data_dir / name).read_bytes().replace(b'\r\n', b'\n'))
    return digest.hexdigest()


def publish_master(source, staged, evidence):
    assert sha(source) == BASE_MASTER_HASH, 'Concurrent master change; keep staged result and stop'
    assert sha(staged) == evidence['stagedSha256'], 'Staged workbook changed'
    backup = source.with_name(source.stem + '_before_lv3_approved_20261008.xlsx')
    assert not backup.exists(), 'Backup already exists; inspect instead of replacing'
    shutil.copy2(source, backup)
    assert sha(backup) == BASE_MASTER_HASH
    assert sha(source) == BASE_MASTER_HASH, 'Master changed during backup; do not overwrite'
    shutil.copy2(staged, source)
    assert sha(source) == evidence['stagedSha256']
    evidence.update(publishedMaster=True, backup=str(backup))


def append_row(raw: bytes, values: list, expected_count: int):
    text = raw.decode('utf-8')
    root = ET.fromstring(raw)
    rows = root.findall('s:sheetData/s:row', NS)
    # The master currently has no dimension element; support an explicit one too.
    last = max(int(row.attrib['r']) for row in rows)
    assert last == expected_count, (last, expected_count)
    number = last + 1
    match = re.search(r'<([A-Za-z_][\w.-]*:)?sheetData(?:\s[^>]*)?>', text)
    assert match, 'Missing sheetData'
    prefix = match.group(1) or ''
    styles = {re.sub(r'\d+', '', c.attrib['r']): c.attrib.get('s') for c in rows[-1]}
    cells = []
    for index, value in enumerate(values):
        if value is None: continue
        column = openpyxl.utils.get_column_letter(index + 1)
        style = f' s="{styles[column]}"' if styles.get(column) else ''
        if isinstance(value, bool):
            cells.append(f'<{prefix}c r="{column}{number}"{style} t="b"><{prefix}v>{int(value)}</{prefix}v></{prefix}c>')
        else:
            cells.append(f'<{prefix}c r="{column}{number}"{style} t="inlineStr"><{prefix}is><{prefix}t>{escape(str(value))}</{prefix}t></{prefix}is></{prefix}c>')
    addition = f'<{prefix}row r="{number}">{"".join(cells)}</{prefix}row>'
    closing = f'</{prefix}sheetData>'
    assert text.count(closing) == 1
    updated = text.replace(closing, addition + closing)
    # Do not reserialize the sheet: removing our row must restore every original byte.
    assert updated.replace(addition, '') == text
    dimension = root.find('s:dimension', NS)
    assert dimension is None, 'Unexpected explicit dimension: inspect before applying'
    return updated.encode('utf-8'), number


def stage_master(source, staged):
    assert sha(source) == BASE_MASTER_HASH, 'Master changed; re-audit instead of overwriting'
    wb = openpyxl.load_workbook(source, read_only=True, data_only=False)
    existing_ids = set()
    for ws in wb:
        for row in ws.values:
            for value in row:
                if isinstance(value, str):
                    existing_ids.update(re.findall(r'\bW\d{6}\b', value))
    assert WORD_ID not in existing_ids and max(existing_ids) == 'W006084'
    assert len(wb.sheetnames) == 64
    words = list(wb['input_words_單字主表'].values)
    senses = list(wb['input_senses_義項表'].values)
    assert not any('limousine' in str(row[1]).lower() or row[1] == 'limo' for row in words)
    wb.close()
    word_row = [WORD_ID, HEADWORD, 'LV3', 'n.', '加長型禮車', None, None, None, None, None,
                'limousine', False, SOURCE_NOTE, 'reviewed', None, None]
    sense_row = [WORD_ID + '-1', WORD_ID, HEADWORD, 'n.', '加長型禮車', None, None,
                 'limousine/limo', 'limo 為 limousine 的簡稱；兩個教材入口共用一張主卡。', 'reviewed']
    with ZipFile(source) as src:
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(src.read('xl/_rels/workbook.xml.rels'))}
        sheets = ET.fromstring(src.read('xl/workbook.xml')).find('s:sheets', NS)
        paths = {}
        for sheet in sheets:
            target = rels[sheet.attrib[f'{{{NS["r"]}}}id']]
            paths[sheet.attrib['name']] = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        replacements = {}
        row_numbers = {}
        # InputWordsTable is a legacy A1:O200 template table; existing vocabulary
        # already continues through row 6086. Preserve this metadata unchanged.
        table = ET.fromstring(src.read('xl/tables/table1.xml'))
        assert table.attrib['name'] == 'InputWordsTable' and table.attrib['ref'] == 'A1:O200'
        for name, values, count in [('input_words_單字主表', word_row, len(words)), ('input_senses_義項表', sense_row, len(senses))]:
            replacements[paths[name]], row_numbers[name] = append_row(src.read(paths[name]), values, count)
        with ZipFile(staged, 'w') as dst:
            for member in src.infolist():
                dst.writestr(member, replacements.get(member.filename, src.read(member)))
    with ZipFile(source) as original, ZipFile(staged) as result:
        changed = [name for name in original.namelist() if original.read(name) != result.read(name)]
        assert set(changed) == set(replacements)
        assert original.namelist() == result.namelist()
    return dict(wordId=WORD_ID, senseId=WORD_ID + '-1', rows=row_numbers, changedWorkbookParts=changed,
                preservedSheets=64, existingCellsAndFormulas='byte-preserved',
                sourceSha256=BASE_MASTER_HASH, stagedSha256=sha(staged), legacyWordTableRange='A1:O200 (unchanged)')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--master', required=True, type=Path)
    ap.add_argument('--review', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--publish-master', action='store_true')
    ap.add_argument('--publish-only', action='store_true', help='Publish an already tested stage without reapplying App data')
    args = ap.parse_args()
    assert not args.publish_master or args.publish_only, 'Stage and verify first; publish with --publish-only --publish-master'
    repo = Path(__file__).resolve().parent.parent
    args.out.mkdir(parents=True, exist_ok=True)
    staged = args.out / args.master.name
    if args.publish_only:
        assert args.publish_master, '--publish-only requires --publish-master'
        evidence = read(args.out / 'apply-result.json')
        audit = read(args.out.parent / 'scope-audit.json')
        assert audit['status'] == 'pass' and audit['mother']['sha256'] == evidence['stagedSha256'], 'Scope audit required'
        publish_master(args.master, staged, evidence)
        write_json(args.out / 'apply-result.json', evidence)
        print(json.dumps(evidence, ensure_ascii=False, indent=2))
        return
    evidence = stage_master(args.master, staged)
    review = read(args.review)
    approved = {row['word']: row for row in review}
    data_dir = repo / 'public/data/v1'
    unchanged = {name: sha(data_dir / name) for name in UNCHANGED_DATA}
    wb = openpyxl.load_workbook(staged, read_only=True, data_only=True)
    word = next(w for w in parse_words(wb['input_words_單字主表']) if w['wordId'] == WORD_ID)
    sense = next(s for s in parse_senses(wb['input_senses_義項表']) if s['wordId'] == WORD_ID)
    wb.close()
    for filename, record, key in [('words.json', word, 'wordId'), ('senses.json', sense, 'senseId')]:
        rows = read(data_dir / filename)
        assert not any(row[key] == record[key] for row in rows), 'Already applied; do not duplicate'
        rows.append(record)
        rows.sort(key=lambda row: row[key])
        write_json(data_dir / filename, rows)
    approvals = []
    for filename, target in [('curriculum.json', 'probability'), ('curriculumUnit2.json', 'slender')]:
        unit_path = repo / 'src/features/direct' / filename
        unit = read(unit_path)
        item = next(i for i in unit['learningItems'] if i.get('displayWord') == target)
        assert item['originalExample'] == approved[target]['unit']['example']
        src = Path(approved[target]['alternative'])
        assert sha(src) == approved[target]['alternativeSha256']
        relative = 'curriculum/lv3-u1/probability.webp' if target == 'probability' else 'wordbeast/s/W002812.webp'
        if target == 'probability':
            dst = repo / 'public' / relative
            dst.parent.mkdir(parents=True, exist_ok=True)
            Image.open(src).save(dst, 'WEBP', lossless=True)
        else:
            dst = repo / 'public' / relative
            assert sha(dst) == sha(src)
        example = item['originalExample']
        item['illustration'] = dict(path=relative, captionEn=example['sentenceEn'], captionZh=example['sentenceZh'])
        payload = [target, item['sensePos'], item['targetMeaningZh'], example['sentenceEn'], example['sentenceZh']]
        approvals.append(dict(reviewId=item['learningItemId'], artApproval='approved', pairApproval='approved',
                              imagePath=relative, sourceImageSha256=sha(src), imageSha256=sha(dst),
                              textSha256=hashlib.sha256(json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()))
        if filename == 'curriculum.json':
            for alias in ['limousine', 'limo']:
                entry = next(i for i in unit['learningItems'] if i.get('displayWord') == alias)
                assert entry['officialWordId'] is None and entry['lexemeRef'] == f'LC-LV3U01-{alias}'
                entry.update(lexemeRef=WORD_ID, officialWordId=WORD_ID, officialSenseId=WORD_ID + '-1')
        write_json(unit_path, unit)
    manifest = dict(schemaVersion=1, approvedAt='2026-10-08',
                    approvalSource='使用者批准的六頁／七問確定交集；委派來源 01a1196a-2d9d-71aa-9681-bcae41e7f0d8',
                    cards=approvals, sharedCard=dict(wordId=WORD_ID, senseId=WORD_ID + '-1', headword=HEADWORD,
                    learningItemIds=['LI-LV3U01-limousine', 'LI-LV3U01-limo'], status='approved'),
                    retainedTargets=[dict(word=target, meaningZh=approved[target]['unit']['targetMeaningZh'], illustrationStatus='not_approved',
                                          alternateSenseCandidate='決定／決心' if target == 'determine' else '表演',
                                          alternateCaptionDraft=approved[target]['captionProposal'], alternatePairApproval='pending')
                                     for target in ['determine', 'perform']],
                    pending=['nostalgic', 'wizard/witch', '其他93張圖', '164詞既有素材盤點建議'], master=evidence)
    write_json(repo / 'src/features/vocabulary/lv3ApprovedReview.json', manifest)
    meta = read(data_dir / 'meta.json')
    meta['generatedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    meta['counts']['words'] += 1
    meta['counts']['senses'] += 1
    meta['wordsHash'] = sha(data_dir / 'words.json')
    meta['contentHash'] = published_content_hash(data_dir)
    write_json(data_dir / 'meta.json', meta)
    catalog = [dict(wordId=w['wordId'], word=w['word'], variants=w.get('wordVariants') or []) for w in read(data_dir / 'words.json')]
    (repo / 'src/features/direct/wordCatalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    pack_counts = build_sa_pack(data_dir)
    assert unchanged == {name: sha(data_dir / name) for name in UNCHANGED_DATA}
    evidence.update(unchangedDataSha256=unchanged, packCounts=pack_counts, publishedMaster=False)
    write_json(args.out / 'apply-result.json', evidence)
    print(json.dumps(evidence, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
