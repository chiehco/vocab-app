"""Synthetic migration tests. All fixtures and transaction writes stay in TEMP."""
import copy
import json
import os
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import lv3_starter_media_migration as m
import lv3_audit_pipeline as p

BUILDER = '''import json, hashlib
def build_sa_pack(data_dir, curriculum_dir):
    read = lambda name: json.loads((data_dir / name).read_text(encoding='utf-8'))
    hash_rows = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    words = read('words.json')
    priorities = read('exam_priority.json')
    selected_names = {row['word'] for row in priorities if row['priorityTier'] in {'S', 'A'}}
    actual_names = {row['word'] for row in words}
    media = [row for row in read('media.json') if row.get("targetWord") in selected_names]
    datasets = {'words': words, 'media': media}
    source = read('meta.json')
    meta = {'generatedAt': source['generatedAt'], 'counts': {'words': len(words), 'media': len(media)}, 'wordsHash': 'sa:' + hash_rows(words), 'contentHash': 'sa:' + hash_rows({'sourceHash': source['contentHash'], 'datasets': datasets})}
    (data_dir / 'sa-pack.json').write_text(json.dumps({'meta': meta, **datasets}, ensure_ascii=False, separators=(',', ':'))+'\\n', encoding='utf-8', newline='\\n')
'''


def compact(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()


def write(root, path, value):
    out = root / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(value)


def fixture(root, windows_pack=False):
    # v1 domain discovery remains real, not patched. Fill its 144 paths in TEMP.
    for path in p.v1.input_paths(root):
        write(root, path, b'[]\n')
    for i in range(144 - len(p.v1.input_paths(root))):
        write(root, f'src/features/direct/synthetic{i:03}.json', b'{}\r\n')
    words = [{'wordId': str(i), 'word': word} for i, word in enumerate(['a', 'b', 'c', 'd'])]
    write(root, 'public/data/v1/words.json', p.serialize(words).replace(b'\n', b'\r\n'))
    write(root, m.PRIORITY, compact([{'wordId': '0', 'word': 'a', 'priorityTier': 'S'}]))
    source = [{'targetWord': word, 'mediaId': str(i), 'status': status, 'captionZh': 'Caption ' + word}
              for i, (word, status) in enumerate(zip(['b', 'a', 'c', 'd', 'outside'],
              ['approved', 'approved', 'draft', 'needs_redraw', 'approved']))]
    write(root, m.MEDIA, compact(source))
    write(root, m.META, p.serialize({'generatedAt': 'fixed', 'contentHash': 'full-source'}))
    write(root, m.BUILDER, BUILDER.replace('\n', '\r\n').encode())
    exec_ns = {}
    exec(BUILDER, exec_ns)
    exec_ns['build_sa_pack'](root / 'public/data/v1', root / 'src/features/direct')
    if windows_pack:
        write(root, m.PACK, (root/m.PACK).read_bytes().replace(b'\n', b'\r\n'))
    write(root, p.CHAIN, b'{"synthetic":true}\n')
    entry = {'unit': 'LV3-U05', 'status': 'committed', 'manifestHash': 'a' * 64}
    captured = {key: {path: fn((root / path).read_bytes()) for path in p.v1.input_paths(root)}
                for key, fn in [('normalized', m.normalized_hash), ('raw', m.raw_hash)]}
    with patch.object(p, 'load_chain', return_value=({}, {}, [(entry, {}, None)])), \
            patch.object(p, 'verify_checkpoint'):
        manifest, blobs = m.seal(root, captured)
    for path, data in blobs.items():
        write(root, path, data)
    manifest_path = root / p.DOCS / 'synthetic-migration.json'
    manifest_path.write_bytes(compact(manifest))
    migration_entry = {'kind': 'migration', 'migrationId': m.IDENTITY, 'path': manifest_path.name,
                       'manifestHash': p.sha(manifest), 'status': 'prepared'}
    return manifest, manifest_path, ({}, {}, [(migration_entry, manifest, None)])


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='lv3-media-synthetic-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manifest, self.path, self.chain = fixture(self.root)
        self.original = {path: (self.root / path).read_bytes() for path in p.v1.input_paths(self.root)}

    def run_apply(self, apply=True):
        with patch.object(p, 'load_chain', return_value=self.chain):
            return p.v1.run(self.root, self.path, apply)

    def assert_original(self):
        self.assertEqual({path: (self.root / path).read_bytes() for path in self.original}, self.original)

    def test_roundtrip_full_144_raw_and_normalized_and_statuses(self):
        self.assertEqual(len(self.original), 144)
        self.assertEqual(self.run_apply(False)['productWrites'], 0)
        self.assert_original()
        self.assertEqual(self.run_apply()['productWrites'], 2)
        m.verify_inputs(self.root, self.manifest, 'after')
        self.assertEqual([x['row']['status'] for x in self.manifest['delta']], ['approved', 'draft', 'needs_redraw'])
        self.assertEqual(self.run_apply()['state'], 'already_applied')
        m.inverse(self.root, self.root, self.manifest)
        self.assert_original()
        with self.assertRaises(ValueError):
            m.inverse(self.root, self.root, self.manifest)

    def test_lf_and_crlf_checkouts_and_actual_raw_rollback(self):
        for windows in (False, True):
            with self.subTest(windows=windows):
                current = {}
                for path, data in self.original.items():
                    data = data.replace(b'\r\n', b'\n')
                    if windows: data = data.replace(b'\n', b'\r\n')
                    current[path] = data; write(self.root, path, data)
                m.verify_inputs(self.root, self.manifest, 'before')
                replace = os.replace
                count = 0
                def fail(source, destination):
                    nonlocal count
                    count += 1
                    if count == 2: raise OSError('portable rollback')
                    return replace(source, destination)
                with patch.object(m.os, 'replace', side_effect=fail):
                    with self.assertRaises(OSError): self.run_apply()
                self.assertEqual({path:(self.root/path).read_bytes() for path in current}, current)
                self.run_apply()
                m.verify_inputs(self.root, self.manifest, 'after')
                for path in set(current)-m.CHANGED:
                    self.assertEqual((self.root/path).read_bytes(), current[path])
                if not windows: self.assertNotIn(b'\r\n', (self.root/m.BUILDER).read_bytes())
                self.assertEqual(self.run_apply()['state'], 'already_applied')
                m.inverse(self.root, self.root, self.manifest)
                m.verify_inputs(self.root, self.manifest, 'before')
                for path in set(current)-m.CHANGED:
                    self.assertEqual((self.root/path).read_bytes(), current[path])

    def test_git_attributes_preserve_four_raw_fixtures(self):
        attrs = (Path(__file__).resolve().parents[1]/'.gitattributes').read_bytes()
        with tempfile.TemporaryDirectory(prefix='lv3-fixture-git-') as temp:
            repo = Path(temp)/'repository'; repo.mkdir()
            def git(*args):
                return subprocess.run(['git', '-C', str(repo), *args], check=True, capture_output=True).stdout
            git('init', '--quiet')
            write(repo, '.gitattributes', attrs)
            blobs = {guard['path']:(self.root/guard['path']).read_bytes() for guard in self.manifest['fixtures'].values()}
            for path, data in blobs.items(): write(repo, path, data)
            git('-c', 'core.autocrlf=true', 'add', '.gitattributes', *blobs)
            attributes = git('check-attr', '--cached', 'text', '--', *blobs).decode()
            self.assertEqual(attributes.count(': text: unset'), 4)
            for path, data in blobs.items(): self.assertEqual(git('show', ':'+path), data)
            for autocrlf in ('false', 'true'):
                checkout = Path(temp)/('checkout-'+autocrlf); checkout.mkdir()
                git('-c', 'core.autocrlf='+autocrlf, 'checkout-index', '--all', '--force',
                    '--prefix='+checkout.as_posix()+'/')
                for path, data in blobs.items(): self.assertEqual((checkout/path).read_bytes(), data)

    def test_seal_preserves_windows_before_pack_capture(self):
        with tempfile.TemporaryDirectory(prefix='lv3-windows-seal-') as temp:
            root = Path(temp)
            manifest, _, _ = fixture(root, windows_pack=True)
            before = (root/m.PACK).read_bytes()
            self.assertIn(b'\r\n', before)
            m.verify_inputs(root, manifest, 'before', raw_capture=True)
            for path, data in m.stage(root, manifest).items(): write(root, path, data)
            m.verify_inputs(root, manifest, 'after', raw_capture=True)
            m.inverse(root, root, manifest)
            self.assertEqual((root/m.PACK).read_bytes(), before)
            m.verify_inputs(root, manifest, 'before', raw_capture=True)

    def test_missing_guard_wrong_domain_parent_and_unknown_fields(self):
        for field in ('beforeInputs', 'afterInputs', 'beforeRawInputs', 'afterRawInputs'):
            bad = copy.deepcopy(self.manifest)
            bad[field].pop(m.MEDIA)
            with self.assertRaises(ValueError):
                m.validate(bad, set(self.original))
        bad = copy.deepcopy(self.manifest); bad['unexpected'] = True
        with self.assertRaises(ValueError): m.validate(bad, set(self.original))
        with self.assertRaises(ValueError): m.validate(self.manifest, set(self.original) | {'extra'})
        wrong = dict(self.manifest['beforeInputs']); wrong[m.BUILDER] = 'b' * 64
        with self.assertRaises(ValueError): m.validate(self.manifest, set(self.original), wrong)

    def test_source_and_builder_raw_drift(self):
        for path in (m.MEDIA, m.PRIORITY, m.BUILDER, m.META):
            original = (self.root / path).read_bytes()
            (self.root / path).write_bytes(original + b' ')
            with self.assertRaises(ValueError): self.run_apply(False)
            (self.root / path).write_bytes(original)
        self.assert_original()

    def test_rehashed_fixture_semantic_tampering(self):
        fixtures = m.load_fixtures(self.root, self.manifest)
        cases = ['builder', 'order', 'duplicate', 'modified', 'addition', 'metadata', 'delta', 'sourceindex']
        for case in cases:
            with self.subTest(case=case):
                bad = copy.deepcopy(self.manifest); data = dict(fixtures)
                after = json.loads(data['afterPack'])
                if case == 'builder': data['afterBuilder'] += b'# unrelated\n'
                elif case == 'order': after['media'].reverse()
                elif case == 'duplicate': after['media'].append(after['media'][0])
                elif case == 'modified': after['media'][0]['captionZh'] = 'wrong'
                elif case == 'addition': after['media'].append({'targetWord': 'outside'})
                elif case == 'metadata': after['meta']['generatedAt'] = 'new'
                elif case == 'delta': bad['delta'].append(copy.deepcopy(bad['delta'][0]))
                elif case == 'sourceindex': bad['delta'][0]['sourceIndex'] += 1
                data['afterPack'] = compact(after)
                bad['afterPackMeta'] = after['meta']
                with self.assertRaises(ValueError): m.verify_semantics(self.root, bad, data)

    def test_pending_and_stale_lock_block_even_idempotence(self):
        self.run_apply()
        tx = self.root / 'output/lv3-audit-20261107/transactions'
        (tx / 'apply.lock').write_text('stale')
        with self.assertRaises(ValueError): self.run_apply()
        (tx / 'apply.lock').unlink()
        pending = tx / 'pending' / 'transaction.json'; pending.parent.mkdir()
        pending.write_text('{"state":"pending"}')
        with self.assertRaises(ValueError): self.run_apply()

    def test_rollback_after_first_replace(self):
        replace = os.replace
        count = 0
        def fail(source, destination):
            nonlocal count
            count += 1
            if count == 2: raise OSError('synthetic failure')
            return replace(source, destination)
        with patch.object(m.os, 'replace', side_effect=fail):
            with self.assertRaisesRegex(OSError, 'synthetic'): self.run_apply()
        self.assert_original()
        receipts = list((self.root / 'output/lv3-audit-20261107/transactions').glob('*/transaction.json'))
        self.assertEqual(json.loads(receipts[0].read_bytes())['state'], 'rolled_back')

    def test_concurrent_input_and_chain_change_before_writes(self):
        stage = m.stage
        for path in (m.MEDIA, p.CHAIN):
            old = (self.root / path).read_bytes()
            def drift(root, manifest):
                result = stage(root, manifest)
                (self.root / path).write_bytes(old + b' ')
                return result
            with patch.object(m, 'stage', side_effect=drift):
                with patch.object(p, 'load_chain', return_value=self.chain):
                    with self.assertRaises(ValueError): m.run(self.root, self.path, True)
            (self.root / path).write_bytes(old)
            self.assert_original()

    def post_write_line_ending_drift(self, path):
        replace = os.replace
        count = 0
        def change(source, destination):
            nonlocal count
            count += 1
            result = replace(source, destination)
            if count == 2:
                data = (self.root/path).read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
                write(self.root, path, data)
            return result
        with patch.object(m.os, 'replace', side_effect=change):
            with self.assertRaises(ValueError): self.run_apply()
        receipts = list((self.root/'output/lv3-audit-20261107/transactions').glob('*/transaction.json'))
        return json.loads(receipts[0].read_bytes())

    def test_untouched_post_write_raw_drift_rolls_back_only_owned_files(self):
        receipt = self.post_write_line_ending_drift(m.MEDIA)
        self.assertEqual(receipt['state'], 'rolled_back')
        for path in m.CHANGED: self.assertEqual((self.root/path).read_bytes(), self.original[path])
        self.assertNotEqual((self.root/m.MEDIA).read_bytes(), self.original[m.MEDIA])
        self.assertEqual(m.normalized_hash((self.root/m.MEDIA).read_bytes()), self.manifest['beforeInputs'][m.MEDIA])

    def test_changed_post_write_raw_drift_leaves_pending_recovery(self):
        receipt = self.post_write_line_ending_drift(m.PACK)
        self.assertEqual(receipt['state'], 'pending')
        with self.assertRaisesRegex(ValueError, 'Pending transaction'): self.run_apply()

    def test_unknown_manifest_and_non_tip_rejected(self):
        with patch.object(p, 'load_chain', return_value=({}, {}, [])):
            with self.assertRaises(ValueError): m.run(self.root, self.path)

        with patch.object(p, 'load_chain', return_value=({}, {}, self.chain[2] + [({'path':'later'}, {}, None)])):
            with self.assertRaises(ValueError): m.run(self.root, self.path)

    def test_current_checkpoint_no_tail_unknown_and_prepared_targets(self):
        self.run_apply()
        self.chain[2][0][0]['status'] = 'committed'
        with tempfile.TemporaryDirectory(prefix='lv3-media-projection-') as outer:
            destination = Path(outer) / 'projection'
            with patch.object(p, 'load_chain', return_value=self.chain):
                p.project_checkpoint(self.root, destination, m.IDENTITY)
                m.verify_inputs(destination, self.manifest, 'after')
                with self.assertRaises(ValueError):
                    p.project_checkpoint(self.root, Path(outer) / 'unknown', 'unknown')
                self.chain[2][0][0]['status'] = 'prepared'
                with self.assertRaises(ValueError):
                    p.project_checkpoint(self.root, Path(outer) / 'prepared', m.IDENTITY)
                self.chain[2][0][0]['status'] = 'committed'
                (self.root / m.BUILDER).write_bytes((self.root / m.BUILDER).read_bytes() + b' ')
                with self.assertRaises(ValueError):
                    p.project_checkpoint(self.root, Path(outer) / 'drift', m.IDENTITY)

    def test_typed_chain_parent_adjacency_and_legacy_envelope(self):
        # Mock legacy unit validation only; exercise the actual typed chain loop,
        # parent guards, immutable adjacency and complete migration fixture checks.
        inputs = self.manifest['beforeInputs']
        first = {'schemaVersion': 1, 'unit': 'LV3-U01', 'baseline': p.v1.BASELINE}
        unit = {'schemaVersion': 2, 'unit': 'LV3-U05', 'baseline': p.v1.BASELINE,
                'parentManifestHash': p.sha(first), 'scope': 'U05-scope.json', 'readiness': 'ready',
                'collections': {}, 'files': {}, 'unchangedInputs': {k: v for k, v in inputs.items() if k not in p.DERIVED},
                'derivedBefore': {k: inputs[k] for k in p.DERIVED}, 'derivedAfter': {k: inputs[k] for k in p.DERIVED}}
        migration = copy.deepcopy(self.manifest); migration['parentManifestHash'] = p.sha(unit)
        anchor = {'baseline': p.v1.BASELINE, 'inputs': inputs}
        entries = [{'unit': 'LV3-U01', 'path': 'U01.json', 'manifestHash': p.sha(first), 'status': 'committed'},
                   {'unit': 'LV3-U05', 'path': 'U05.json', 'manifestHash': p.sha(unit), 'status': 'committed'},
                   {'kind': 'migration', 'migrationId': m.IDENTITY, 'path': 'M.json', 'manifestHash': p.sha(migration), 'status': 'committed'}]
        chain = {'schemaVersion': 2, 'baseline': p.v1.BASELINE, 'anchor': 'anchor.json', 'anchorHash': p.sha(anchor), 'entries': entries}
        docs = {p.CHAIN: chain, p.DOCS + '/anchor.json': anchor, p.DOCS + '/U01.json': first,
                p.DOCS + '/U05.json': unit, p.DOCS + '/M.json': migration, p.DOCS + '/U05-scope.json': {},
                p.DOCS + '/LV3-ledger.json': {'units': [{'unit': i, 'source': 'unused'} for i in [1, 2, *range(4, 25)]]}}
        def read(path): return docs[Path(path).relative_to(self.root).as_posix()]
        with patch.object(p, 'read_json', side_effect=read), patch.object(p, 'validate_manifest'), \
                patch.object(p, 'U01_ANCHOR_HASH', p.sha(anchor)), patch.object(p, 'U01_MANIFEST_HASH', p.sha(first)):
            self.assertEqual(len(p.load_chain(self.root)[2]), 3)
            chain['schemaVersion'] = 1
            with self.assertRaises(ValueError): p.load_chain(self.root)
            chain['schemaVersion'] = 2
            migration['parentManifestHash'] = '0' * 64; entries[-1]['manifestHash'] = p.sha(migration)
            with self.assertRaises(ValueError): p.load_chain(self.root)
            migration['parentManifestHash'] = p.sha(unit); entries[-1]['manifestHash'] = p.sha(migration)
            entries[-2]['status'] = 'prepared'
            with self.assertRaises(ValueError): p.load_chain(self.root)
            entries[-2]['status'] = 'committed'
            migration['beforeInputs'] = dict(inputs); migration['beforeInputs'][m.MEDIA] = '0' * 64
            entries[-1]['manifestHash'] = p.sha(migration)
            with self.assertRaises(ValueError): p.load_chain(self.root)

    def test_later_v2_crlf_file_restores_normalized_migration_boundary(self):
        self.run_apply()
        self.chain[2][0][0]['status'] = 'committed'
        path = 'public/data/v1/words.json'
        before_bytes = (self.root / path).read_bytes()
        self.assertIn(b'\r\n', before_bytes)
        before = json.loads(before_bytes)
        after = copy.deepcopy(before); after[0]['meaningZh'] = 'later meaning'
        col = {'path': path, 'key': 'wordId', 'rowsField': None}
        patch_row = {'dataset':'words', 'path':path, 'key':'wordId', 'id':before[0]['wordId'],
            'before':before[0], 'after':{'meaningZh':'later meaning'}, 'reason':'synthetic', 'evidence':[],
            'fieldEvidence':{'meaningZh':[{'sources':['synthetic'], 'reason':'synthetic', 'proposal':'synthetic'}]}}
        scope = {'schemaVersion':1, 'unit':'LV3-U06', 'baseline':p.v1.BASELINE, 'collections':{'words':col},
                 'rows':[{'dataset':'words','id':before[0]['wordId'],'beforeHash':p.sha(before[0]),'after':patch_row['after']}]}
        ref = p.DOCS + '/fixtures/LV3-U06/synthetic-raw.json'
        write(self.root, ref, before_bytes)
        guard = {'beforeHash':p.sha(before), 'afterHash':p.sha(after), 'beforeByteHash':p.byte_hash(before_bytes),
                 'afterByteHash':p.byte_hash(p.serialize(after))}
        previous = {key:p.v1.file_hash(self.root/key) for key in self.original}
        before_meta = json.loads((self.root/m.META).read_bytes())
        before_pack_meta = json.loads((self.root/m.PACK).read_bytes())['meta']
        write(self.root, path, p.serialize(after))
        next_meta = {**before_meta, 'generatedAt':'later', 'contentHash':'later-source'}
        write(self.root, m.META, p.serialize(next_meta))
        namespace = {}
        exec((self.root/m.BUILDER).read_text(), namespace)
        namespace['build_sa_pack'](self.root/'public/data/v1', self.root/'src/features/direct')
        unit = {'schemaVersion':2, 'unit':'LV3-U06', 'baseline':p.v1.BASELINE,
                'parentManifestHash':self.chain[2][0][0]['manifestHash'], 'readiness':'ready',
                'scope':'U06-scope.json', 'scopeHash':p.sha(scope), 'collections':{'words':col}, 'files':{path:guard},
                'patches':[patch_row], 'unchangedInputs':{key:value for key,value in previous.items() if key not in p.DERIVED|{path}},
                'derivedBefore':{key:previous[key] for key in p.DERIVED},
                'derivedAfter':{key:p.v1.file_hash(self.root/key) for key in p.DERIVED},
                'beforeMeta':before_meta, 'beforePackMeta':before_pack_meta, 'afterMeta':next_meta}
        p.validate_manifest(unit, scope)
        loaded = [*self.chain[2], ({'unit':'LV3-U06','status':'committed'}, unit, scope)]
        with tempfile.TemporaryDirectory(prefix='lv3-future-unit-inverse-') as temp:
            destination = Path(temp)/'restored'
            with patch.object(p, 'load_chain', return_value=({}, {}, loaded)):
                p.project_checkpoint(self.root, destination, m.IDENTITY)
                m.verify_inputs(destination, self.manifest, 'after')
                self.assertEqual((destination/path).read_bytes(), before_bytes.replace(b'\r\n', b'\n'))
                self.assertNotEqual((destination/path).read_bytes(), before_bytes)
                # Crossing the migration now remains portable; only CRLF is normalized.
                m.inverse(self.root, destination, self.manifest)
                m.verify_inputs(destination, self.manifest, 'before')



def export(destination):
    """Cross-language data fixture only, not a production manifest or checkpoint."""
    with tempfile.TemporaryDirectory(prefix='lv3-media-parity-') as temp:
        root = Path(temp)
        manifest, _, _ = fixture(root)
        fixtures = m.verified_fixtures(root, manifest)
        outputs = m.stage(root, manifest)
        before = {path: (root / path).read_bytes().decode('utf-8') for path in p.v1.input_paths(root)}
        after = {**before, **{path: data.decode('utf-8') for path, data in outputs.items()}}
        for path, data in outputs.items(): (root / path).write_bytes(data)
        m.inverse(root, root, manifest)
        restored = {path: (root / path).read_bytes().decode('utf-8') for path in before}
        assert restored == before
        Path(destination).write_text(json.dumps({'manifest': manifest, 'fixtures':
            {manifest['fixtures'][key]['path']: value.decode('utf-8') for key, value in fixtures.items()},
            'before': before, 'after': after, 'pythonInverse': restored}, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--export': export(sys.argv[2])
    else: unittest.main()
