"""One bounded starter-media membership checkpoint; not an arbitrary blob patcher.

The four authenticated fixtures preserve literal bytes. Semantic validation must
also succeed before any fixture can be used, including during historical inverse.
"""
from __future__ import annotations
import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile

import apply_lv3_unit_audit as v1
import lv3_u03_extension as u03_extension

KIND = 'starter-media-actual-names'
IDENTITY = 'starter-media-actual-names-v1'
BUILDER = 'scripts/build_sa_pack.py'
PACK = 'public/data/v1/sa-pack.json'
MEDIA = 'public/data/v1/media.json'
PRIORITY = 'public/data/v1/exam_priority.json'
META = 'public/data/v1/meta.json'
CHANGED = {BUILDER, PACK}
PREFIX = 'docs/lv3-audit-20261107/' + IDENTITY + '/'
FIXTURES = {'beforeBuilder': 'before-builder.py', 'afterBuilder': 'after-builder.py',
            'beforePack': 'before-pack.json', 'afterPack': 'after-pack.json'}
OLD = b'row.get("targetWord") in selected_names'
NEW = b'row.get("targetWord") in actual_names'
require = v1.require


def raw_hash(data):
    return hashlib.sha256(data).hexdigest()


def normalized_hash(data):
    return raw_hash(data.replace(b'\r\n', b'\n'))


def is_migration(manifest):
    return manifest.get('schemaVersion') == 3


def identity(entry):
    return entry.get('migrationId') if entry.get('kind') == 'migration' else entry.get('unit')


def digest(value):
    require(isinstance(value, str) and len(value) == 64
            and all(c in '0123456789abcdef' for c in value), 'Invalid migration digest')


def validate(manifest, domain, previous=None):
    require(set(manifest) == {'schemaVersion', 'kind', 'migrationId', 'baseline',
        'parentManifestHash', 'readiness', 'beforeInputs', 'afterInputs',
        'beforeRawInputs', 'afterRawInputs', 'fixtures', 'delta', 'sourceMediaHash',
        'beforePackMeta', 'afterPackMeta', 'beforeMeta'}, 'Unknown migration fields')
    require(manifest['schemaVersion'] == 3 and manifest['kind'] == KIND
            and manifest['migrationId'] == IDENTITY and manifest['baseline'] == v1.BASELINE
            and manifest['readiness'] == 'ready', 'Unknown or unready migration')
    digest(manifest['parentManifestHash'])
    require(len(domain) == 144 and CHANGED | {MEDIA, PRIORITY, META} <= set(domain),
            'Migration requires original 144-input domain')
    for field in ('beforeInputs', 'afterInputs', 'beforeRawInputs', 'afterRawInputs'):
        require(isinstance(manifest[field], dict) and set(manifest[field]) == set(domain),
                'Missing migration input guards')
        for value in manifest[field].values():
            digest(value)
    if previous is not None:
        require(manifest['beforeInputs'] == previous, 'Migration predecessor mismatch')
    for before, after in (('beforeInputs', 'afterInputs'), ('beforeRawInputs', 'afterRawInputs')):
        require({p for p in domain if manifest[before][p] != manifest[after][p]} == CHANGED,
                'Migration changed path set must be builder and pack')
    require(manifest['sourceMediaHash'] == manifest['beforeInputs'][MEDIA], 'Source media guard mismatch')
    require(set(manifest['fixtures']) == set(FIXTURES), 'Missing migration fixtures')
    for key, name in FIXTURES.items():
        guard = manifest['fixtures'][key]
        require(set(guard) == {'path', 'sha256'} and guard['path'] == PREFIX + name,
                'Invalid migration fixture path')
        digest(guard['sha256'])
        side = 'before' if key.startswith('before') else 'after'
        path = BUILDER if key.endswith('Builder') else PACK
        require(guard['sha256'] == manifest[side + 'RawInputs'][path], 'Fixture/raw guard mismatch')
    require(isinstance(manifest['delta'], list) and manifest['delta'], 'Empty migration delta')
    for row in manifest['delta']:
        require(set(row) == {'sourceIndex', 'afterIndex', 'row'}, 'Invalid migration delta fields')
        require(type(row['sourceIndex']) is int and row['sourceIndex'] >= 0
                and type(row['afterIndex']) is int and row['afterIndex'] >= 0
                and isinstance(row['row'], dict), 'Invalid migration delta')


def load_fixtures(root, manifest):
    result = {}
    for key, guard in manifest['fixtures'].items():
        data = v1.safe_path(Path(root), guard['path']).read_bytes()
        require(raw_hash(data) == guard['sha256'], 'Migration fixture raw hash mismatch')
        side = 'before' if key.startswith('before') else 'after'
        path = BUILDER if key.endswith('Builder') else PACK
        require(normalized_hash(data) == manifest[side + 'Inputs'][path],
                'Migration fixture normalized hash mismatch')
        result[key] = data
    return result


def verify_semantics(root, manifest, fixtures):
    """Recompute the only allowed transformation independently of recorded delta."""
    before_builder, after_builder = fixtures['beforeBuilder'], fixtures['afterBuilder']
    require(before_builder.count(OLD) == 1 and before_builder.count(NEW) == 0,
            'Unknown migration before builder')
    require(after_builder == before_builder.replace(OLD, NEW), 'Unsupported migration builder change')
    # Source bytes are authenticated even when validating a historical checkpoint.
    source = {}
    for path in (MEDIA, PRIORITY):
        data = v1.safe_path(Path(root), path).read_bytes()
        require(normalized_hash(data) == manifest['beforeInputs'][path], 'Migration source drift')
        source[path] = json.loads(data)
    before, after = (json.loads(fixtures[k]) for k in ('beforePack', 'afterPack'))
    # Match the builder's exact compact LF output, not merely parsed JSON. This
    # rejects rehashed whitespace and duplicate-key payloads as well as drift.
    for key, value in (('beforePack', before), ('afterPack', after)):
        canonical = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
        actual = fixtures[key].replace(b'\r\n', b'\n') if key == 'beforePack' else fixtures[key]
        require(actual == canonical, 'Noncanonical raw pack fixture')
    require(set(before) == set(after) and {'meta', 'words', 'media'} <= set(before), 'Pack shape changed')
    require(before['meta'] == manifest['beforePackMeta'] and after['meta'] == manifest['afterPackMeta'],
            'Migration metadata mismatch')
    for key in set(before) - {'meta', 'media'}:
        require(before[key] == after[key], 'Non-media pack data changed')
    words = before['words']
    require(len({r['wordId'] for r in words}) == len(words), 'Duplicate pack word IDs')
    names = {r['word'] for r in words}
    selected = {r['word'] for r in source[PRIORITY] if r.get('priorityTier') in {'S', 'A'}}
    require(selected <= names, 'Priority word absent from pack')
    require(len({json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in source[MEDIA]}) == len(source[MEDIA]), 'Duplicate source media rows')
    old_rows = [r for r in source[MEDIA] if r.get('targetWord') in selected]
    new_rows = [r for r in source[MEDIA] if r.get('targetWord') in names]
    require(before['media'] == old_rows and after['media'] == new_rows,
            'Media source membership/order mismatch')
    require(before['meta']['counts']['media'] == len(old_rows)
            and after['meta']['counts']['media'] == len(new_rows), 'Media metadata count mismatch')
    expected_delta = []
    after_index = 0
    for source_index, row in enumerate(source[MEDIA]):
        if row.get('targetWord') in names:
            if row.get('targetWord') not in selected:
                expected_delta.append({'sourceIndex': source_index, 'afterIndex': after_index, 'row': row})
            after_index += 1
    require(manifest['delta'] == expected_delta, 'Migration delta/source indices mismatch')
    require(len({r['sourceIndex'] for r in expected_delta}) == len(expected_delta), 'Duplicate delta indices')
    expected_meta = copy.deepcopy(before['meta'])
    expected_meta['counts']['media'] = len(new_rows)
    expected_pack = copy.deepcopy(before)
    expected_pack['media'] = new_rows
    datasets = {key: value for key, value in expected_pack.items() if key != 'meta'}
    full = manifest['beforeMeta']
    import lv3_audit_pipeline as pipeline
    require(normalized_hash(pipeline.serialize(full)) == manifest['beforeInputs'][META], 'Before full metadata hash mismatch')
    require(before['meta']['contentHash'] == 'sa:' + v1.node_hash({'sourceHash': full.get('contentHash') or full['wordsHash'], 'datasets': {k: v for k, v in before.items() if k != 'meta'}}), 'Before pack content hash mismatch')
    expected_meta['contentHash'] = 'sa:' + v1.node_hash({
        'sourceHash': full.get('contentHash') or full['wordsHash'], 'datasets': datasets})
    require(after['meta'] == expected_meta, 'Unapproved pack metadata change')
    expected_pack['meta'] = expected_meta
    require(fixtures['afterPack'] == (json.dumps(expected_pack, ensure_ascii=False,
            separators=(',', ':')) + '\n').encode('utf-8'), 'Unexpected raw pack ordering')
    # A semantic inverse must reproduce the old pack independently of raw fixtures.
    inverse = copy.deepcopy(after)
    for delta in reversed(expected_delta):
        require(inverse['media'][delta['afterIndex']] == delta['row'], 'Modified inverse delta')
        del inverse['media'][delta['afterIndex']]
    inverse['meta'] = copy.deepcopy(before['meta'])
    require(inverse == before, 'Media inverse semantic mismatch')
    return fixtures


def verified_fixtures(root, manifest):
    validate(manifest, u03_extension.historical_domain(root, v1.input_paths(root)))
    return verify_semantics(root, manifest, load_fixtures(root, manifest))


def verify_inputs(root, manifest, side, raw_capture=False):
    domain = v1.input_paths(root)
    validate(manifest, domain)
    for path in domain:
        data = v1.safe_path(Path(root), path).read_bytes()
        require(normalized_hash(data) == manifest[side + 'Inputs'][path], 'Migration input drift: ' + path)
        if raw_capture:
            require(raw_hash(data) == manifest[side + 'RawInputs'][path], 'Migration raw capture drift: ' + path)


def known_state(root, manifest):
    possible = {'before', 'after'}
    for path in CHANGED:
        data = v1.safe_path(Path(root), path).read_bytes()
        possible &= {side for side in ('before', 'after')
                     if normalized_hash(data) == manifest[side + 'Inputs'][path]}
    require(len(possible) == 1, 'Unknown or mixed migration state')
    return possible.pop()


def inverse(root, destination, manifest):
    verify_inputs(destination, manifest, 'after')
    fixtures = verified_fixtures(root, manifest)
    for path, key in ((BUILDER, 'beforeBuilder'), (PACK, 'beforePack')):
        v1.safe_path(Path(destination), path).write_bytes(fixtures[key])
    verify_inputs(destination, manifest, 'before')


def stage(root, manifest):
    """Authenticate fixtures and independently execute both exact builders in TEMP."""
    fixtures = verified_fixtures(root, manifest)
    with tempfile.TemporaryDirectory(prefix='lv3-media-stage-') as temp:
        target = Path(temp)
        for path in v1.input_paths(root):
            out = v1.safe_path(target, path)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(v1.safe_path(Path(root), path).read_bytes())
        for side in ('before', 'after'):
            builder = v1.safe_path(target, BUILDER)
            builder.write_bytes(fixtures[side + 'Builder'])
            module = {'__name__': 'lv3_verified_media_builder', '__file__': str(builder)}
            exec(compile(builder.read_text(encoding='utf-8'), str(builder), 'exec'), module)
            module['build_sa_pack'](target / 'public/data/v1', target / 'src/features/direct')
            generated = v1.safe_path(target, PACK).read_bytes()
            expected = fixtures[side + 'Pack']
            require((generated == expected) if side == 'after' else
                    (generated == expected.replace(b'\r\n', b'\n')),
                    'Builder cannot reproduce guarded migration pack')
            verify_inputs(target, manifest, side)
    # Publication/history guards normalize CRLF only. Keep this checkout's
    # builder line endings; receipts authenticate the actual transaction bytes,
    # not the platform-specific raw snapshot from the independent seal capture.
    current_builder = v1.safe_path(Path(root), BUILDER).read_bytes()
    if normalized_hash(current_builder) == manifest['beforeInputs'][BUILDER]:
        output_builder = current_builder.replace(OLD, NEW)
    else:
        require(normalized_hash(current_builder) == manifest['afterInputs'][BUILDER], 'Unknown current builder')
        output_builder = current_builder
    require(normalized_hash(output_builder) == manifest['afterInputs'][BUILDER], 'Wrong staged builder')
    return {BUILDER: output_builder, PACK: fixtures['afterPack']}


def seal(root, capture):
    """Return a candidate and its raw fixtures, never register or write products.

    The independent capture contains both normalized and raw maps. Production
    sealing is possible only directly after an exact committed U05 checkpoint.
    """
    import lv3_audit_pipeline as pipeline
    root = Path(root).resolve()
    pipeline.assert_recovery_clear(root)
    _, anchor, chain = pipeline.load_chain(root)
    require(all(e['status'] == 'committed' for e, _, _ in chain)
            and chain[-1][0].get('unit') == 'LV3-U05', 'Seal requires committed U05 tip')
    pipeline.verify_checkpoint(root, chain[-1][1], anchor)
    domain = v1.input_paths(root)
    require(set(capture) == {'normalized', 'raw'} and
            set(capture['normalized']) == set(capture['raw']) == domain,
            'Independent capture must contain complete normalized and raw maps')
    original = {p: v1.safe_path(root, p).read_bytes() for p in domain}
    require(capture['normalized'] == {p: normalized_hash(b) for p, b in original.items()}
            and capture['raw'] == {p: raw_hash(b) for p, b in original.items()}, 'Independent capture drift')
    chain_bytes = (root / pipeline.CHAIN).read_bytes()
    before_builder = original[BUILDER]
    require(before_builder.count(OLD) == 1 and before_builder.count(NEW) == 0, 'Unknown before builder')
    after_builder = before_builder.replace(OLD, NEW)
    with tempfile.TemporaryDirectory(prefix='lv3-media-seal-') as temp:
        target = Path(temp)
        for path, data in original.items():
            out = v1.safe_path(target, path)
            out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(data)
        for builder in (before_builder, after_builder):
            (target / BUILDER).write_bytes(builder)
            module = {'__name__': 'lv3_media_seal_builder', '__file__': str(target / BUILDER)}
            exec(compile(builder.decode('utf-8'), str(target / BUILDER), 'exec'), module)
            module['build_sa_pack'](target / 'public/data/v1', target / 'src/features/direct')
            if builder == before_builder:
                require((target / PACK).read_bytes() == original[PACK].replace(b'\r\n', b'\n'),
                        'Old builder does not reproduce normalized pack')
        after_pack = (target / PACK).read_bytes()
        after = {**original, BUILDER: after_builder, PACK: after_pack}
        before_json, after_json = json.loads(original[PACK]), json.loads(after_pack)
        names = {r['word'] for r in before_json['words']}
        selected = {r['word'] for r in json.loads(original[PRIORITY]) if r.get('priorityTier') in {'S', 'A'}}
        delta, index = [], 0
        for source_index, row in enumerate(json.loads(original[MEDIA])):
            if row.get('targetWord') in names:
                if row.get('targetWord') not in selected:
                    delta.append({'sourceIndex': source_index, 'afterIndex': index, 'row': row})
                index += 1
        blobs = dict(zip(FIXTURES, (before_builder, after_builder, original[PACK], after_pack)))
        manifest = {'schemaVersion': 3, 'kind': KIND, 'migrationId': IDENTITY, 'baseline': v1.BASELINE,
            'parentManifestHash': chain[-1][0]['manifestHash'], 'readiness': 'ready',
            'beforeInputs': capture['normalized'], 'afterInputs': {p: normalized_hash(b) for p, b in after.items()},
            'beforeRawInputs': capture['raw'], 'afterRawInputs': {p: raw_hash(b) for p, b in after.items()},
            'fixtures': {k: {'path': PREFIX + FIXTURES[k], 'sha256': raw_hash(b)} for k, b in blobs.items()},
            'delta': delta, 'sourceMediaHash': capture['normalized'][MEDIA],
            'beforePackMeta': before_json['meta'], 'afterPackMeta': after_json['meta'],
            'beforeMeta': json.loads(original[META])}
        validate(manifest, domain)
        verify_semantics(root, manifest, blobs)
    require(v1.input_paths(root) == domain and (root / pipeline.CHAIN).read_bytes() == chain_bytes,
            'Concurrent seal chain/domain change')
    for path, data in original.items():
        require(v1.safe_path(root, path).read_bytes() == data, 'Concurrent seal input change')
    pipeline.load_chain(root)  # Reauthenticate parent manifests/scopes, not only chain.json.
    pipeline.assert_recovery_clear(root)
    return manifest, {PREFIX + FIXTURES[k]: data for k, data in blobs.items()}


def run(root, manifest_path, apply=False):
    import lv3_audit_pipeline as pipeline
    root, manifest_path = Path(root).resolve(), Path(manifest_path).resolve()
    _, _, chain = pipeline.load_chain(root)
    matches = [x for x in chain if (root / pipeline.DOCS / x[0]['path']).resolve() == manifest_path]
    require(len(matches) == 1 and is_migration(matches[0][1]), 'Unregistered migration target')
    entry, manifest, _ = matches[0]
    require(chain[-1][0] == entry, 'Migration apply requires chain tip')
    state = known_state(root, manifest)
    verify_inputs(root, manifest, state)
    initial = {p: v1.safe_path(root, p).read_bytes() for p in v1.input_paths(root)}
    chain_bytes = (root / pipeline.CHAIN).read_bytes()
    manifest_bytes = manifest_path.read_bytes()
    outputs = stage(root, manifest)
    result = {'state': 'already_applied' if state == 'after' else 'dry_run',
              'files': sorted(CHANGED), 'mediaAdded': len(manifest['delta']), 'productWrites': 0}
    pipeline.load_chain(root)
    require((root / pipeline.CHAIN).read_bytes() == chain_bytes
            and manifest_path.read_bytes() == manifest_bytes, 'Concurrent migration chain change')
    require(v1.input_paths(root) == set(initial), 'Concurrent migration input domain change')
    for path, data in initial.items():
        require(v1.safe_path(root, path).read_bytes() == data, 'Concurrent migration input change')
    if not apply or state == 'after':
        return result
    token = v1.datetime.now(v1.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    tx = root / 'output/lv3-audit-20261107/transactions' / token
    tx.mkdir(parents=True, exist_ok=False)
    receipt = {'state': 'pending', 'baseline': v1.BASELINE, 'manifestHash': v1.node_hash(manifest),
               'migrationId': IDENTITY, 'files': sorted(CHANGED), 'beforeHashes': {}, 'afterHashes': {}}
    for path in sorted(CHANGED):
        backup = tx / 'before' / path
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(initial[path])
        receipt['beforeHashes'][path] = raw_hash(initial[path])
        receipt['afterHashes'][path] = raw_hash(outputs[path])
    v1.dump(tx / 'transaction.json', receipt)
    completed = []
    try:
        for path in sorted(CHANGED):
            out = v1.safe_path(root, path)
            require(out.read_bytes() == initial[path], 'Concurrent migration target change')
            temporary = out.with_name(out.name + '.lv3-media-' + token + '.tmp')
            with temporary.open('xb') as handle:
                handle.write(outputs[path]); handle.flush(); os.fsync(handle.fileno())
            os.replace(temporary, out)
            completed.append(path)
        verify_inputs(root, manifest, 'after')
        pipeline.load_chain(root)
        require(v1.input_paths(root) == set(initial), 'Concurrent migration input domain after writes')
        for path in initial:
            expected = outputs[path] if path in CHANGED else initial[path]
            require(v1.safe_path(root, path).read_bytes() == expected,
                    'Concurrent migration raw bytes after writes: ' + path)
        require((root / pipeline.CHAIN).read_bytes() == chain_bytes
                and manifest_path.read_bytes() == manifest_bytes, 'Concurrent migration chain change after writes')
        receipt['state'] = 'committed'
        v1.dump(tx / 'transaction.json', receipt)
    except BaseException:
        for path in reversed(completed):
            out = v1.safe_path(root, path)
            require(out.read_bytes() == outputs[path], 'Concurrent migration rollback edit; recovery required')
            restore = out.with_name(out.name + '.lv3-media-restore-' + token + '.tmp')
            restore.write_bytes(initial[path]); os.replace(restore, out)
        receipt['state'] = 'rolled_back'
        v1.dump(tx / 'transaction.json', receipt)
        raise
    return {**result, 'state': 'applied', 'productWrites': 2,
            'receipt': (tx / 'transaction.json').relative_to(root).as_posix()}
