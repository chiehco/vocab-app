"""Fail-closed, reversible LV3 data audit applier, currently scoped to U01 only.
The filename is extensible; no other LV3 unit is currently supported. Default is a staged dry run.

Each file is atomically replaced; the multi-file transaction has a durable backup
and exception rollback, not a claim of OS-level multi-file atomicity. A crash
leaves a pending transaction directory and blocks another application.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

BASELINE = '99883751926bd6cb4feff70daff56c07afc130cb'
SPECS = {
    'words': ('public/data/v1/words.json', 'wordId', None, {'meaningZh', 'meaningEn', 'usagePattern', 'usagePatternZh', 'verbForms'}),
    'examples': ('public/data/v1/examples.json', 'exampleId', None, {'sensePos', 'meaningHint'}),
    'notes': ('public/data/v1/notes.json', 'noteId', None, {'content'}),
    'curriculum': ('src/features/direct/curriculum.json', 'learningItemId', 'learningItems', {'explanationZh'}),
    'grammarQuestions': ('src/features/direct/grammarQuestions.json', 'questionId', None, {'targetMeaningZh', 'options'}),
}
CONTENT_FILES = ('words.json', 'senses.json', 'examples.json', 'relations.json', 'morphemes.json', 'notes.json', 'exam_priority.json', 'hooks.json', 'media.json')
DERIVED = ('public/data/v1/meta.json', 'public/data/v1/sa-pack.json')
BUILDER = 'scripts/build_sa_pack.py'
REGISTRY = 'src/features/vocabulary/lv1ReviewedImages.json'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f'Duplicate JSON key: {key}')
            result[key] = value
        return result
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique,
                      parse_constant=lambda v: (_ for _ in ()).throw(ValueError(f'Nonfinite JSON: {v}')))


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


def node_hash(value):
    # Delegate numeric and property serialization to the manifest's exact runtime.
    code = "let fs=require('fs'),c=require('crypto');let v=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(c.createHash('sha256').update(JSON.stringify(v)).digest('hex'))"
    proc = subprocess.run(['node', '-e', code], input=json.dumps(value, ensure_ascii=False, allow_nan=False),
                          encoding='utf-8', capture_output=True, check=True)
    require(bool(re.fullmatch('[a-f0-9]{64}', proc.stdout)), 'Invalid hash helper output')
    return proc.stdout


def file_hash(path):
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()


def safe_path(root, relative):
    require(isinstance(relative, str) and relative and '\\' not in relative, 'Path must be POSIX relative')
    candidate = Path(relative)
    require(not candidate.is_absolute() and '..' not in candidate.parts and ':' not in relative, 'Unsafe path')
    full = root / candidate
    require(full.resolve().is_relative_to(root.resolve()), 'Path escapes root')
    for part in (full, *full.parents):
        if part == root.parent:
            break
        require(not part.is_symlink(), f'Symlink prohibited: {relative}')
    return full


def rows(value, field):
    result = value[field] if field else value
    require(isinstance(result, list), 'Dataset rows must be list')
    return result


def input_paths(root):
    paths = {'public/data/v1/' + n for n in CONTENT_FILES} | set(DERIVED) | {BUILDER, REGISTRY}
    paths.update(p.relative_to(root).as_posix() for p in (root / 'src/features/direct').glob('*.json'))
    return paths


def validate_manifest(manifest):
    require(manifest.get('schemaVersion') == 1 and manifest.get('baseline') == BASELINE, 'Wrong schema/baseline')
    require(set(manifest.get('datasets', {})) == set(SPECS), 'Unexpected dataset set')
    require(isinstance(manifest.get('patches'), list) and manifest['patches'], 'Empty patches')
    seen = set()
    for name, (path, key, field, _) in SPECS.items():
        d = manifest['datasets'][name]
        require(d.get('path') == path and d.get('key') == key and d.get('rowsField') == field, 'Dataset contract mismatch')
        require(all(re.fullmatch('[a-f0-9]{64}', d.get(h, '')) for h in ('beforeHash', 'afterHash')), 'Invalid dataset hash')
    for patch in manifest['patches']:
        require(set(patch) == {'dataset', 'path', 'key', 'id', 'before', 'after', 'reason', 'evidence'}, 'Unknown patch keys')
        name = patch['dataset']
        require(name in SPECS, 'Disallowed dataset')
        path, key, _, allowed = SPECS[name]
        require(patch['path'] == path and patch['key'] == key, 'Patch path/key mismatch')
        ident = (name, patch['id'])
        require(ident not in seen, 'Duplicate patch row')
        seen.add(ident)
        before, after = patch['before'], patch['after']
        require(isinstance(before, dict) and before.get(key) == patch['id'], 'Invalid complete before row')
        require(isinstance(after, dict) and after and set(after) <= allowed, 'Disallowed after field')
        require(isinstance(patch['reason'], str) and patch['reason'].strip(), 'Missing reason')
        require(isinstance(patch['evidence'], list) and patch['evidence'] and all(isinstance(s, str) and s.strip() and not re.search(r'file:|(?:^|[^A-Za-z])[A-Z]:[/\\]', s, re.I) for s in patch['evidence']), 'Invalid/publicly unsafe evidence')
        require(any(k not in before or before[k] != v for k, v in after.items()), 'No-op patch')
        for key2, value in after.items():
            if key2 not in {'options', 'verbForms'}:
                require(isinstance(value, str) and value.strip(), 'Invalid scalar value')
        if 'verbForms' in after:
            vf = after['verbForms']
            require(isinstance(vf, dict) and set(vf) == {'base', 'past', 'pastParticiple', 'sourceRef', 'status'}, 'Invalid verb forms')
            require(vf['base'] == before['word'] and vf['status'] == 'approved', 'Invalid form identity/status')
            require(vf['sourceRef'] == 'https://www.collinsdictionary.com/dictionary/english/' + before['word'], 'Unsupported form source')
            require(all(isinstance(vf[k], str) and re.fullmatch('[a-z]+', vf[k]) for k in ('base', 'past', 'pastParticiple')), 'Invalid form text')
        if name == 'examples' and 'sensePos' in after:
            require(before['sensePos'] == 'n.' and after['sensePos'] == 'v.', 'Unsupported example POS transition')
        if name == 'curriculum':
            require(before.get('kind') == 'grammar', 'Only grammar notes allowed in curriculum')
        if 'options' in after:
            old, new = before.get('options'), after['options']
            require(isinstance(old, list) and isinstance(new, list) and len(old) == len(new) == 4, 'Invalid options')
            for a, b in zip(old, new):
                require(set(a) == set(b) and a['id'] == b['id'], 'Changed option shape/order')
                require(all(a[k] == b[k] for k in a if k not in {'text', 'rationaleZh'}), 'Changed protected option field')
                require(all(isinstance(b[k], str) and b[k].strip() for k in ('text', 'rationaleZh')), 'Invalid option content')


def prepare(manifest, current):
    """Pure exact-row/hash validator returning state and staged dataset values."""
    validate_manifest(manifest)
    states = set()
    for name, value in current.items():
        h = node_hash(value)
        d = manifest['datasets'][name]
        if h == d['beforeHash']:
            states.add('before')
        elif h == d['afterHash']:
            states.add('after')
        else:
            raise ValueError(f'Unknown whole-dataset drift: {name}')
    require(len(states) == 1, 'Mixed before/after states; investigate interrupted or partial application')
    state = states.pop()
    staged = copy.deepcopy(current)
    for p in manifest['patches']:
        name = p['dataset']
        rr = rows(staged[name], SPECS[name][2])
        matches = [r for r in rr if r.get(p['key']) == p['id']]
        require(len(matches) == 1, f'Nonunique row: {p["id"]}')
        expected = {**p['before'], **p['after']} if state == 'after' else p['before']
        require(matches[0] == expected, f'Complete row drift: {p["id"]}')
        if state == 'before':
            matches[0].update(copy.deepcopy(p['after']))
    for name, value in staged.items():
        require(node_hash(value) == manifest['datasets'][name]['afterHash'], f'Wrong result hash: {name}')
        key = SPECS[name][1]
        before_ids = [r[key] for r in rows(current[name], SPECS[name][2])]
        after_ids = [r[key] for r in rows(value, SPECS[name][2])]
        require(before_ids == after_ids and len(set(after_ids)) == len(after_ids), 'ID/order/count changed')
    return state, staged


def stage_outputs(root, stage, staged, state, manifest):
    for relative in input_paths(root):
        target = safe_path(stage, relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(safe_path(root, relative), target)
    for name, value in staged.items():
        dump(safe_path(stage, SPECS[name][0]), value)
    data = stage / 'public/data/v1'
    meta = read_json(data / 'meta.json')
    if state == 'before':
        meta['generatedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    meta['wordsHash'] = file_hash(data / 'words.json')
    h = hashlib.sha256()
    for name in CONTENT_FILES:
        h.update((data / name).read_bytes().replace(b'\r\n', b'\n'))
    meta['contentHash'] = h.hexdigest()
    dump(data / 'meta.json', meta)
    spec = importlib.util.spec_from_file_location('lv3_staged_pack_builder', stage / BUILDER)
    module = importlib.util.module_from_spec(spec)
    # Avoid pycache writes and execute only the input-hash-checked repository builder.
    exec(compile((stage / BUILDER).read_text(encoding='utf-8'), str(stage / BUILDER), 'exec'), module.__dict__)
    module.build_sa_pack(data, stage / 'src/features/direct')
    old_pack, new_pack = read_json(root / DERIVED[1]), read_json(stage / DERIVED[1])
    require(old_pack['meta']['counts'] == new_pack['meta']['counts'], 'Pack counts changed')
    require([r['wordId'] for r in old_pack['words']] == [r['wordId'] for r in new_pack['words']], 'Pack word IDs changed')
    for name in staged:
        require(node_hash(read_json(stage / SPECS[name][0])) == manifest['datasets'][name]['afterHash'], 'Stage hash mismatch')
    if state == 'after':
        require(meta == read_json(root / DERIVED[0]), 'Applied metadata drift')
        require(new_pack == old_pack, 'Applied pack drift')


def run(root, manifest_path, apply=False):
    root = Path(root).resolve()
    manifest_path = Path(manifest_path).resolve()
    require(manifest_path.is_relative_to(root / 'docs'), 'Manifest must reside under repository docs')
    manifest = read_json(manifest_path)
    validate_manifest(manifest)
    paths = input_paths(root)
    changed_paths = {s[0] for s in SPECS.values()}
    expected_guards = paths - changed_paths - set(DERIVED)
    guards = manifest.get('unchangedInputs', {})
    require(set(guards) == expected_guards, 'Input set changed or missing guards')
    for relative, digest in guards.items():
        require(file_hash(safe_path(root, relative)) == digest, f'Input drift: {relative}')
    initial = {p: safe_path(root, p).read_bytes() for p in paths}
    current = {n: read_json(safe_path(root, s[0])) for n, s in SPECS.items()}
    state, staged = prepare(manifest, current)
    if state == 'before':
        require(set(manifest.get('derivedBefore', {})) == set(DERIVED), 'Missing derived guards')
        for relative in DERIVED:
            require(file_hash(root / relative) == manifest['derivedBefore'][relative], f'Derived input drift: {relative}')
    tx_root = root / 'output/lv3-audit-20261107/transactions'
    if tx_root.exists():
        for pending in tx_root.glob('*/transaction.json'):
            require(read_json(pending).get('state') != 'pending', f'Pending transaction requires recovery: {pending.name}')
    with tempfile.TemporaryDirectory(prefix='lv3-audit-') as temporary:
        stage = Path(temporary)
        stage_outputs(root, stage, staged, state, manifest)
        writes = sorted(changed_paths | set(DERIVED))
        result = {'state': 'already_applied' if state == 'after' else 'dry_run', 'patchCount': len(manifest['patches']), 'files': writes, 'productWrites': 0}
        if not apply or state == 'after':
            return result
        require(input_paths(root) == paths, 'Concurrent input-set change')
        for relative, content in initial.items():
            require(safe_path(root, relative).read_bytes() == content, f'Concurrent input change: {relative}')
        token = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        tx = tx_root / token
        tx.mkdir(parents=True, exist_ok=False)
        receipt = {'state': 'pending', 'baseline': BASELINE, 'manifest': manifest_path.relative_to(root).as_posix(), 'manifestHash': node_hash(manifest), 'files': writes, 'beforeHashes': {}, 'afterHashes': {}}
        for relative in writes:
            backup = tx / 'before' / relative
            backup.parent.mkdir(parents=True, exist_ok=True)
            backup.write_bytes(initial[relative])
            receipt['beforeHashes'][relative] = hashlib.sha256(initial[relative]).hexdigest()
            receipt['afterHashes'][relative] = hashlib.sha256((stage / relative).read_bytes()).hexdigest()
        dump(tx / 'transaction.json', receipt)
        completed = []
        try:
            for relative in writes:
                target = safe_path(root, relative)
                require(target.read_bytes() == initial[relative], f'Concurrent target change: {relative}')
                temp = target.with_name(target.name + '.lv3-audit-' + token + '.tmp')
                with temp.open('xb') as handle:
                    handle.write((stage / relative).read_bytes())
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temp, target)
                completed.append(relative)
            for relative in writes:
                require(safe_path(root, relative).read_bytes() == (stage / relative).read_bytes(), 'Post-write mismatch')
            receipt['state'] = 'committed'
            dump(tx / 'transaction.json', receipt)
        except BaseException:
            for relative in reversed(completed):
                target = safe_path(root, relative)
                restore = target.with_name(target.name + '.lv3-restore-' + token + '.tmp')
                restore.write_bytes(initial[relative])
                os.replace(restore, target)
            receipt['state'] = 'rolled_back'
            dump(tx / 'transaction.json', receipt)
            raise
        return {**result, 'state': 'applied', 'productWrites': len(writes), 'receipt': (tx / 'transaction.json').relative_to(root).as_posix()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--manifest', type=Path, default=Path('docs/lv3-audit-20261107/U01-patches.json'))
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--apply', action='store_true')
    modes.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    manifest = args.manifest if args.manifest.is_absolute() else args.root / args.manifest
    print(json.dumps(run(args.root, manifest, args.apply), ensure_ascii=False))


if __name__ == '__main__':
    main()
