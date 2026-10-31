"""Inspect a hash-pinned master, or stage a delta AFTER its source cell is fixed.

Never edits a workbook or the live public directory. The supplied SHA pins the
bytes being inspected; it is not evidence that a workbook is the latest master.
"""
import argparse
import hashlib
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

from build_sa_pack import build_sa_pack
from import_data import content_hash, parse_words, parse_senses, write_json

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'scripts/corrections/interact-summary-20261031.json'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def corrected_word(manifest):
    return {**manifest['publishedWordBefore'], 'meaningZh': manifest['after']}


def locate_source(workbook, manifest):
    ws = workbook[manifest['sourceSheet']]
    rows = ws.iter_rows(values_only=True)
    headers = list(next(rows))
    key = manifest['sourceKey']
    required = [*key, manifest['sourceField'], 'pos', 'status']
    require(all(headers.count(k) == 1 for k in required), 'Missing or duplicate source columns')
    matches = []
    for number, values in enumerate(rows, 2):
        row = dict(zip(headers, values))
        # Fail on either identity matching a different record, not just both.
        if row.get('word_id') == key['word_id'] or row.get('word') == key['word']:
            matches.append((number, row))
    require(len(matches) == 1, 'Missing, duplicate or conflicting interact identity')
    number, row = matches[0]
    require(all(row.get(k) == v for k, v in key.items()), 'Word ID/headword mismatch')
    require(row['pos'] == manifest['publishedWordBefore']['pos'], 'POS changed; re-audit')
    require(row['status'] == manifest['publishedWordBefore']['status'], 'Review status changed; re-audit')
    require(row[manifest['sourceField']] in (manifest['before'], manifest['after']), 'Source meaning changed; re-audit')
    return {'sheet': ws.title, 'row': number, 'field': manifest['sourceField'],
            'column': headers.index(manifest['sourceField']) + 1,
            'before': row[manifest['sourceField']], 'after': manifest['after'],
            'alreadyCorrected': row[manifest['sourceField']] == manifest['after']}


def stage_records(data, out, source_word, source_senses, source_hash, manifest):
    data, out = data.resolve(), out.resolve()
    require(out != data and not out.is_relative_to(data) and not data.is_relative_to(out), 'Output must be separate from published data')
    require(not out.exists(), 'Output exists; choose a new staging directory')
    require(source_word == corrected_word(manifest), 'Source row differs beyond the one corrected field; re-audit')
    require(source_senses == manifest['publishedSensesBefore'], 'Source sense identities/statuses changed; re-audit')
    for name, expected in manifest['publicBaselineSha256'].items():
        actual = hashlib.sha256((data / name).read_text(encoding='utf-8').encode('utf-8')).hexdigest()
        require(actual == expected, f'Published {name} changed; re-audit the baseline')
    words = read(data / 'words.json')
    matches = [r for r in words if r['wordId'] == source_word['wordId'] or r['word'] == source_word['word']]
    require(matches == [manifest['publishedWordBefore']], 'Published interact identity changed')
    # Build in isolation. Only expose a complete, validated staging result.
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent) as temporary:
        staged = Path(temporary) / 'data'
        shutil.copytree(data, staged)
        matches_id = source_word['wordId']
        words = [source_word if r['wordId'] == matches_id else r for r in words]
        write_json(staged / 'words.json', words)
        meta = read(staged / 'meta.json')
        meta.update(wordsHash=sha(staged / 'words.json'), contentHash=content_hash(staged),
                    generatedAt=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                    interactSourceSha256=source_hash)
        write_json(staged / 'meta.json', meta)
        build_sa_pack(staged)
        starter = read(staged / 'sa-pack.json')
        require([r for r in starter['words'] if r['wordId'] == matches_id] == [source_word], 'Starter word mismatch')
        require([r for r in starter['senses'] if r['wordId'] == matches_id] == source_senses, 'Starter sense mismatch')
        allowed = {'words.json', 'meta.json', 'sa-pack.json'}
        changed = {p.name for p in staged.glob('*.json') if p.read_bytes() != (data / p.name).read_bytes()}
        require(changed == allowed, f'Unexpected output delta: {changed}')
        # All source datasets and statuses except the one summary are untouched.
        shutil.move(str(staged), str(out))
    return {'stagedData': str(out), 'changedFiles': sorted(changed), 'sourceSha256': source_hash,
            'sourceWorkbookEdited': False, 'newSenseIds': [], 'reviewStatus': source_word['status']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--expected-source-sha256', required=True)
    parser.add_argument('--data', type=Path, default=ROOT / 'public/data/v1')
    parser.add_argument('--out', type=Path, help='Stage only from an already corrected, separately confirmed latest master')
    args = parser.parse_args()
    source = args.source.resolve()
    digest = sha(source)
    require(digest == args.expected_source_sha256, 'Source bytes changed; re-audit')
    if args.out:
        require(not source.is_relative_to(args.out.resolve()), 'Output must not contain the source workbook')
    manifest = read(MANIFEST)
    wb = openpyxl.load_workbook(source, read_only=True, data_only=True)
    try:
        report = locate_source(wb, manifest)
        report.update(sourceSha256=digest, latestMasterConfirmedByTool=False)
        if args.out:
            require(report['alreadyCorrected'], 'Fix the source meaning_zh first; generated JSON alone is insufficient')
            word = [r for r in parse_words(wb[manifest['sourceSheet']]) if r['wordId'] == 'W003558']
            senses = [r for r in parse_senses(wb['input_senses_義項表']) if r['wordId'] == 'W003558' or r['word'] == 'interact']
            require(len(word) == 1, 'Missing or duplicate source word')
            require(sha(source) == digest, 'Source changed during inspection')
            report.update(stage_records(args.data, args.out, word[0], senses, digest, manifest))
        print(json.dumps(report, ensure_ascii=False, indent=2))
    finally:
        wb.close()


if __name__ == '__main__':
    main()
