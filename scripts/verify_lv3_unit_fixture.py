"""Opt-in real-unit fixture verifier. All product writes stay in OS TEMP.

Usage: python scripts/verify_lv3_unit_fixture.py --unit U04 --capture PATH
Requires an independently captured before-map and its sealed summary. Not part
of default test discovery; existing default coverage remains unchanged.
Current registered fixture shapes: U02/U04/U05/U06/U09/U11 have six affected files;
U07/U08/U10 have five with notes.json unchanged. Exact source and derived paths are
checked independently of observed writes. senses.json remains the drift target.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import test_lv3_audit_pipeline_fixtures as base
import apply_lv3_unit_audit as audit
import lv3_audit_pipeline as pipeline


def fixture_unit_index(entries, manifest):
    """Find one ordinary unit after the caller authenticates the typed chain."""
    audit.require(manifest.get('schemaVersion') == 2, 'Fixture requires an ordinary schema-2 unit')
    unit = manifest.get('unit')
    audit.require(isinstance(unit, str) and unit, 'Missing fixture unit identity')
    matches = [i for i, entry in enumerate(entries)
               if entry.get('kind') != 'migration' and entry.get('unit') == unit]
    audit.require(len(matches) == 1, 'Missing or duplicate ordinary fixture unit')
    index = matches[0]
    entry = entries[index]
    audit.require(set(entry) == {'unit', 'path', 'manifestHash', 'status'},
                  'Invalid ordinary fixture entry')
    audit.require(entry['manifestHash'] == audit.node_hash(manifest), 'Fixture manifest chain mismatch')
    audit.require(entry['status'] in {'prepared', 'committed'}, 'Unknown fixture entry status')
    return index


def fixture_parent_checkpoint(entries, manifest):
    """Retain the immediate committed predecessor, including a typed migration."""
    index = fixture_unit_index(entries, manifest)
    audit.require(index > 0, 'Fixture unit has no predecessor')
    parent = entries[index - 1]
    identity = pipeline.media_migration.identity(parent)
    audit.require(isinstance(identity, str) and identity, 'Missing fixture predecessor identity')
    audit.require(parent['status'] == 'committed', 'Fixture predecessor is not committed')
    audit.require(manifest.get('parentManifestHash') == parent['manifestHash'],
                  'Fixture predecessor manifest mismatch')
    return identity


def fixture_expected_write_paths(manifest):
    """Exact registered shapes for the real fixture, independent of observed writes."""
    curricula = {
        'LV3-U02': 'src/features/direct/curriculumUnit2.json',
        'LV3-U04': 'src/features/direct/curriculumLV3Unit4.json',
        'LV3-U05': 'src/features/direct/curriculumLV3Unit5.json',
        'LV3-U06': 'src/features/direct/curriculumLV3Unit6.json',
        'LV3-U07': 'src/features/direct/curriculumLV3Unit7.json',
        'LV3-U08': 'src/features/direct/curriculumLV3Unit8.json',
        'LV3-U09': 'src/features/direct/curriculumLV3Unit9.json',
        'LV3-U10': 'src/features/direct/curriculumLV3Unit10.json',
        'LV3-U11': 'src/features/direct/curriculumLV3Unit11.json',
        'LV3-U12': 'src/features/direct/curriculumLV3Unit12.json',
        'LV3-U13': 'src/features/direct/curriculumLV3Unit13.json',
        'LV3-U14': 'src/features/direct/curriculumLV3Unit14.json',
        'LV3-U15': 'src/features/direct/curriculumLV3Unit15.json',
        'LV3-U16': 'src/features/direct/curriculumLV3Unit16.json',
        'LV3-U17': 'src/features/direct/curriculumLV3Unit17.json',
        'LV3-U18': 'src/features/direct/curriculumLV3Unit18.json',
        'LV3-U19': 'src/features/direct/curriculumLV3Unit19.json',
    }
    unit = manifest.get('unit')
    audit.require(unit in curricula, 'Unregistered real-fixture write shape')
    source = {'public/data/v1/words.json', 'public/data/v1/examples.json', curricula[unit]}
    if unit not in {'LV3-U07', 'LV3-U08', 'LV3-U10', 'LV3-U12', 'LV3-U13', 'LV3-U14', 'LV3-U15', 'LV3-U17', 'LV3-U18'}:
        source.add('public/data/v1/notes.json')
    if unit == 'LV3-U16':
        source.add('public/data/v1/senses.json')
    if unit == 'LV3-U18':
        source.add('scripts/sources/LV3Unit18.json')
    if unit == 'LV3-U19':
        # Independent accepted scope: words/examples/notes/curriculum/source.
        source.add('scripts/sources/LV3Unit19.json')
    audit.require(set(manifest['files']) == source, 'Unexpected real-fixture source paths')
    audit.require(set(manifest['derivedAfter']) == pipeline.DERIVED,
                  'Unexpected real-fixture derived paths')
    return source | pipeline.DERIVED


SUMMARY = None


def fixture_summary_path(root, unit, summary=None):
    """Keep legacy summary default; explicit summaries remain within repo docs."""
    root = Path(root).resolve()
    target = Path(summary) if summary is not None else Path(pipeline.DOCS) / (unit + '-before-capture.json')
    if not target.is_absolute():
        target = root / target
    target = target.resolve()
    audit.require(target.is_relative_to(root / 'docs'), 'Fixture summary must reside under repository docs')
    return target


class RealUnitFixtureTests(base.U02RealFixtureTests):
    __unittest_skip__ = False

    @classmethod
    def setUpClass(cls):
        cls.manifest = audit.read_json(base.ROOT / base.MANIFEST)
        audit.require(cls.manifest['readiness'] == 'ready', 'Seal gate not complete')
        cls.scope = audit.read_json(base.ROOT / pipeline.DOCS / cls.manifest['scope'])
        summary = audit.read_json(fixture_summary_path(base.ROOT, UNIT, SUMMARY))
        cls.capture = audit.read_json(base.CAPTURE)
        audit.require(hashlib.sha256(base.CAPTURE.read_bytes()).hexdigest() == summary['captureFileSha256'],
                      'Independent capture artifact changed')
        audit.require(audit.node_hash(cls.manifest) == summary['readyManifestHash'], 'Sealed manifest changed')
        audit.require(audit.node_hash(cls.scope) == summary['scopeHash'], 'Sealed scope changed')
        audit.require(set(cls.capture) == pipeline.unit_input_paths(base.ROOT, 'LV3-' + UNIT), 'Capture domain changed')
        _, _, loaded = pipeline.load_chain(base.ROOT)
        cls.parent_checkpoint = fixture_parent_checkpoint([entry for entry, _, _ in loaded], cls.manifest)
        cls.temporary = tempfile.TemporaryDirectory(prefix='lv3-unit-real-fixture-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.fixture = Path(cls.temporary.name) / 'worktree'
        audit.require(not cls.fixture.resolve().is_relative_to(base.ROOT.resolve()), 'TEMP must be outside repository')
        pipeline.project_checkpoint(base.ROOT, cls.fixture, target=cls.parent_checkpoint)
        for path, digest in cls.capture.items():
            audit.require(audit.file_hash(cls.fixture / path) == digest, 'Independent before drift: ' + path)
        shutil.copytree(base.ROOT / pipeline.DOCS, cls.fixture / pipeline.DOCS)
        cls.original = {p.relative_to(cls.fixture).as_posix(): p.read_bytes()
                        for p in cls.fixture.rglob('*') if p.is_file()}
        cls.inputs = pipeline.unit_input_paths(cls.fixture, cls.manifest['unit'])
        base.OUTPUT.mkdir(parents=True, exist_ok=True)

    def commit_fixture_entry(self):
        chain = audit.read_json(self.fixture / pipeline.CHAIN)
        chain['entries'][fixture_unit_index(chain['entries'], self.manifest)]['status'] = 'committed'
        audit.dump(self.fixture / pipeline.CHAIN, chain)

    def assert_u18_source_checkpoint_drift_rejected(self, side):
        if self.manifest.get('unit') != 'LV3-U18':
            return
        path = pipeline._U18_SOURCE_PATH
        original = (self.fixture / path).read_bytes()
        target = self.parent_checkpoint if side == 'before' else 'LV3-U18'
        changed = json.loads(original)
        changed['unrecordedSourceRoot'] = True
        mutations = [('raw', original+b' '), ('semantic', pipeline.serialize(changed))]
        tx = self.fixture / 'output/lv3-audit-20261107/transactions'
        receipts = {p.relative_to(tx).as_posix():p.read_bytes() for p in tx.rglob('*') if p.is_file()} if tx.exists() else {}
        chain_before = (self.fixture / pipeline.CHAIN).read_bytes()
        for kind, content in mutations:
            destination = Path(self.temporary.name) / ('u18-'+side+'-'+kind+'-rejected')
            try:
                (self.fixture / path).write_bytes(content)
                snapshot = self.snapshot()
                with patch.object(pipeline.os, 'replace', wraps=pipeline.os.replace) as replacements:
                    with self.assertRaises(ValueError):
                        pipeline.project_checkpoint(self.fixture, destination, target=target)
                    replacements.assert_not_called()
                self.assert_snapshot(snapshot)
                self.assertFalse(destination.exists())
                self.assertEqual((self.fixture / pipeline.CHAIN).read_bytes(), chain_before)
                now = {p.relative_to(tx).as_posix():p.read_bytes() for p in tx.rglob('*') if p.is_file()} if tx.exists() else {}
                self.assertEqual(now, receipts)
            finally:
                (self.fixture / path).write_bytes(original)
        audit.dump(base.OUTPUT / ('u18-'+side+'-source-checkpoint-negatives.json'), {
            'status':'passed', 'state':'prepared' if side=='before' else 'committed',
            'rawAndSemanticCurrentSourceDriftRejected':True, 'productReplaceCalls':0,
            'destinationCreated':False, 'receiptsAndChainUnchanged':True})

    def assert_u19_sources_checkpoint_drift_rejected(self, side):
        if self.manifest.get('unit') != 'LV3-U19':
            return
        target = self.parent_checkpoint if side == 'before' else 'LV3-U19'
        tx = self.fixture / 'output/lv3-audit-20261107/transactions'
        receipts = {p.relative_to(tx).as_posix(): p.read_bytes() for p in tx.rglob('*') if p.is_file()} if tx.exists() else {}
        chain_before = (self.fixture / pipeline.CHAIN).read_bytes()
        for path in [pipeline._U18_SOURCE_PATH, pipeline._U19_SOURCE_PATH]:
            original = (self.fixture / path).read_bytes()
            changed = json.loads(original); changed['unrecordedSourceRoot'] = True
            for kind, content in [('raw', original+b' '), ('semantic', pipeline.serialize(changed))]:
                destination = Path(self.temporary.name) / ('u19-'+Path(path).stem+'-'+side+'-'+kind+'-rejected')
                try:
                    (self.fixture / path).write_bytes(content)
                    snapshot = self.snapshot()
                    with patch.object(pipeline.os, 'replace', wraps=pipeline.os.replace) as replacements:
                        with self.assertRaises(ValueError):
                            pipeline.project_checkpoint(self.fixture, destination, target=target)
                        replacements.assert_not_called()
                    self.assert_snapshot(snapshot); self.assertFalse(destination.exists())
                    self.assertEqual((self.fixture / pipeline.CHAIN).read_bytes(), chain_before)
                    now = {p.relative_to(tx).as_posix(): p.read_bytes() for p in tx.rglob('*') if p.is_file()} if tx.exists() else {}
                    self.assertEqual(now, receipts)
                finally:
                    (self.fixture / path).write_bytes(original)
        audit.dump(base.OUTPUT / ('u19-'+side+'-two-source-checkpoint-negatives.json'), {
            'status': 'passed', 'state': 'prepared' if side == 'before' else 'committed',
            'bothSourceRawAndSemanticDriftRejected': True, 'productReplaceCalls': 0,
            'destinationCreated': False, 'receiptsAndChainUnchanged': True})

    def test_01_real_seal_and_dry_run_do_not_change_inputs(self):
        expected_paths = fixture_expected_write_paths(self.manifest)
        snapshot = self.snapshot()
        sealed = pipeline.seal_step(self.fixture, self.fixture / base.MANIFEST, self.capture)
        self.assertEqual(sealed['readiness'], 'ready')
        self.assertEqual(sealed['files'], self.manifest['files'])
        self.assertEqual(sealed['afterMeta']['contentHash'], self.manifest['afterMeta']['contentHash'])
        self.assertEqual(sealed['afterMeta']['wordsHash'], self.manifest['afterMeta']['wordsHash'])
        self.assert_snapshot(snapshot)
        result = audit.run(self.fixture, self.fixture / base.MANIFEST)
        self.assertEqual(result['state'], 'dry_run')
        self.assertEqual(result['productWrites'], 0)
        self.assertEqual(set(result['files']), expected_paths)
        self.assertEqual(len(result['files']), len(expected_paths))
        self.assert_snapshot(snapshot)
        self.assert_u18_source_checkpoint_drift_rejected('before')
        self.assert_u19_sources_checkpoint_drift_rejected('before')

    def test_02_real_apply_idempotence_and_single_shared_file_write(self):
        original = self.snapshot()
        real_replace = pipeline.os.replace
        writes = []
        def record(source, target):
            writes.append(Path(target).relative_to(self.fixture).as_posix())
            return real_replace(source, target)
        with patch.object(pipeline.os, 'replace', side_effect=record):
            result = self.apply_fixture()
        expected_paths = fixture_expected_write_paths(self.manifest)
        self.assertEqual(result['state'], 'applied')
        self.assertEqual(result['productWrites'], len(expected_paths))
        for path in expected_paths:
            self.assertEqual(writes.count(path), 1, path)
        for path, guard in self.manifest['files'].items():
            self.assertEqual(audit.node_hash(audit.read_json(self.fixture / path)), guard['afterHash'])
            self.assertEqual(audit.file_hash(self.fixture / path), guard['afterByteHash'])
        for path, digest in self.manifest['derivedAfter'].items():
            self.assertEqual(audit.file_hash(self.fixture / path), digest)
        for path in expected_paths:
            target = base.OUTPUT / 'applied-fixture' / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(self.fixture / path, target)
        after = self.snapshot()
        second = self.apply_fixture()
        self.assertEqual(second['state'], 'already_applied')
        self.assertEqual(second['productWrites'], 0)
        self.assert_snapshot(after)
        before_docs = {p: json.loads(original[p]) for p in self.manifest['files']}
        after_docs = {p: audit.read_json(self.fixture / p) for p in self.manifest['files']}
        self.assertEqual(pipeline.prepare_step(self.manifest, before_docs, self.scope), after_docs)
        inverse = pipeline.inverse_step(self.manifest, after_docs, self.scope)
        self.assertEqual(inverse, before_docs)
        self.commit_fixture_entry()
        projected = Path(self.temporary.name) / 'normalized-parent'
        pipeline.project_checkpoint(self.fixture, projected, target=self.parent_checkpoint)
        for path in self.inputs:
            self.assertEqual((projected / path).read_bytes().replace(b'\r\n', b'\n'),
                             original[path].replace(b'\r\n', b'\n'), path)
        audit.dump(base.OUTPUT / 'python-parity.json', {
            'unit': self.manifest['unit'], 'manifestHash': audit.node_hash(self.manifest),
            'patchCount': len(self.manifest['patches']), 'physicalFileCount': len(expected_paths),
            'inputCount': len(self.inputs), 'productWrites': result['productWrites'],
            'idempotenceWrites': second['productWrites'], 'allRowsForwardInverse': True,
            'normalizedParentBytesEqual': True,
            'afterHashes': {p: audit.file_hash(self.fixture / p) for p in sorted(expected_paths)},
            'normalizedBeforeHashes': {p: audit.file_hash(projected / p) for p in sorted(expected_paths)},
            'scope': 'TEMP fixture only; no repository product application'})

    def test_03_failed_second_replace_rolls_back_every_input(self):
        super().test_03_failed_second_replace_rolls_back_every_input()
        receipt = audit.read_json(next((self.fixture / 'output').rglob('transaction.json')))
        paths = set(self.manifest['files']) | pipeline.DERIVED
        self.assertEqual(set(receipt['files']), paths)
        self.assertEqual(receipt['manifestHash'], audit.node_hash(self.manifest))
        for path in paths:
            self.assertEqual(receipt['beforeHashes'][path], hashlib.sha256(self.original[path]).hexdigest())
            expected = (self.manifest['files'][path]['afterByteHash'] if path in self.manifest['files']
                        else self.manifest['derivedAfter'][path])
            self.assertEqual(receipt['afterHashes'][path], expected)

        if self.manifest.get('unit') == 'LV3-U18':
            # Exercise actual raw restoration after the new source has been replaced.
            before = self.snapshot()
            tx = self.fixture / 'output/lv3-audit-20261107/transactions'
            receipts_before = set(tx.glob('*/transaction.json'))
            expected = sorted(paths)
            self.assertLess(expected.index(pipeline._U18_SOURCE_PATH), len(expected)-1)
            real_replace = pipeline.os.replace
            calls = []
            def fail_after_source(source, target):
                calls.append(Path(target).relative_to(self.fixture).as_posix())
                if len(calls) == len(expected):
                    raise OSError('injected U18 final replace failure after source')
                return real_replace(source, target)
            with patch.object(pipeline.os, 'replace', side_effect=fail_after_source):
                with self.assertRaisesRegex(OSError, 'injected U18 final'):
                    self.apply_fixture()
            self.assertEqual(calls[:len(expected)], expected)
            self.assertIn(pipeline._U18_SOURCE_PATH, calls[len(expected):])
            self.assert_snapshot(before)
            new_receipts = set(tx.glob('*/transaction.json')) - receipts_before
            self.assertEqual(len(new_receipts), 1)
            receipt_path = new_receipts.pop()
            self.assertEqual(audit.read_json(receipt_path)['state'], 'rolled_back')
            for path in expected:
                self.assertEqual((receipt_path.parent / 'before' / path).read_bytes(), before[path])
            audit.dump(base.OUTPUT / 'u18-source-late-rollback.json', {
                'status': 'passed', 'all145RawInputsRestored': len(before)==145,
                'sourceWasReplacedAndRestored': True, 'calls': calls,
                'rawBeforeSha256': hashlib.sha256(before[pipeline._U18_SOURCE_PATH]).hexdigest()})

        if self.manifest.get('unit') == 'LV3-U19':
            # Fail only after the new source has actually been replaced.
            before = self.snapshot()
            tx = self.fixture / 'output/lv3-audit-20261107/transactions'
            receipts_before = set(tx.glob('*/transaction.json'))
            expected = sorted(fixture_expected_write_paths(self.manifest))
            self.assertEqual(len(expected), 7)
            self.assertLess(expected.index(pipeline._U19_SOURCE_PATH), len(expected)-1)
            real_replace = pipeline.os.replace
            calls = []
            def fail_after_u19_source(source, target):
                calls.append(Path(target).relative_to(self.fixture).as_posix())
                if len(calls) == len(expected):
                    raise OSError('injected U19 final replace failure after source')
                return real_replace(source, target)
            with patch.object(pipeline.os, 'replace', side_effect=fail_after_u19_source):
                with self.assertRaisesRegex(OSError, 'injected U19 final'):
                    self.apply_fixture()
            self.assertEqual(calls[:len(expected)], expected)
            self.assertIn(pipeline._U19_SOURCE_PATH, calls[len(expected):])
            self.assertNotIn(pipeline._U18_SOURCE_PATH, calls)
            self.assert_snapshot(before); self.assertEqual(len(before), 146)
            receipts_after = set(tx.glob('*/transaction.json')) - receipts_before
            self.assertEqual(len(receipts_after), 1)
            receipt_path = receipts_after.pop()
            self.assertEqual(audit.read_json(receipt_path)['state'], 'rolled_back')
            for path in expected:
                self.assertEqual((receipt_path.parent / 'before' / path).read_bytes(), before[path])
            audit.dump(base.OUTPUT / 'u19-source-late-rollback.json', {
                'status': 'passed', 'all146RawInputsRestored': True,
                'u19SourceWasReplacedAndRestored': True, 'u18SourceNeverWritten': True,
                'calls': calls, 'rawBeforeSha256': hashlib.sha256(before[pipeline._U19_SOURCE_PATH]).hexdigest()})

    def test_07_real_chain_inverse_restores_u01_and_137_original_guards(self):
        self.apply_fixture()
        self.commit_fixture_entry()
        projected = Path(self.temporary.name) / 'projected-u01'
        pipeline.project_checkpoint(self.fixture, projected)
        u1 = audit.read_json(self.fixture / pipeline.DOCS / 'U01-patches.json')
        self.assertEqual(len(u1['unchangedInputs']), 137)
        for path, digest in u1['unchangedInputs'].items():
            self.assertEqual(audit.file_hash(projected / path), digest, path)
        for data in u1['datasets'].values():
            self.assertEqual(audit.node_hash(audit.read_json(projected / data['path'])), data['afterHash'])
        anchor = audit.read_json(self.fixture / pipeline.DOCS / 'U01-checkpoint.json')
        self.assertEqual(set(anchor['inputs']), audit.input_paths(projected))
        for path, digest in anchor['inputs'].items():
            self.assertEqual(audit.file_hash(projected / path), digest, path)
        if self.manifest.get('unit') == 'LV3-U18':
            source = pipeline._U18_SOURCE_PATH
            self.assertNotIn(source, anchor['inputs'])
            self.assertEqual(len(anchor['inputs']), 144)
            self.assertEqual(audit.file_hash(projected / source), self.manifest['files'][source]['beforeByteHash'])
            self.assertEqual(audit.read_json(projected / source), json.loads(self.original[source]))
            audit.dump(base.OUTPUT / 'u18-supplemental-source-projection.json', {
                'status': 'passed', 'originalAnchorInputs': 144, 'originalU01UnchangedGuards': 137,
                'sourceBeforeByteHash': audit.file_hash(projected / source), 'originalSourceFullDocumentRestored': True})
        if self.manifest.get('unit') == 'LV3-U19':
            self.assertEqual(len(anchor['inputs']), 144)
            for source, guard in [(pipeline._U18_SOURCE_PATH, pipeline._U18_SOURCE_GUARD),
                                  (pipeline._U19_SOURCE_PATH, self.manifest['files'][pipeline._U19_SOURCE_PATH])]:
                self.assertNotIn(source, anchor['inputs'])
                self.assertEqual(audit.file_hash(projected / source), guard['beforeByteHash'])
                self.assertEqual(audit.node_hash(audit.read_json(projected / source)), guard['beforeHash'])
            audit.dump(base.OUTPUT / 'u19-two-source-u01-projection.json', {
                'status': 'passed', 'originalAnchorInputs': 144, 'originalU01UnchangedGuards': 137,
                'bothSupplementalBeforeSourcesRestored': True})
        audit.dump(base.OUTPUT / 'checkpoint-projection.json', {
            'restoredInputCount': len(anchor['inputs']), 'originalU01UnchangedGuards': 137,
            'u01DatasetAfterHashesPreserved': True, 'status': 'passed'})

    def test_08_after_state_checkpoint_caller_rejects_unknown_bytes(self):
        self.apply_fixture()
        self.commit_fixture_entry()
        self.assert_u18_source_checkpoint_drift_rejected('after')
        self.assert_u19_sources_checkpoint_drift_rejected('after')
        if self.manifest.get('unit') == 'LV3-U16':
            # Relations is unchanged and is not an earlier migration source. Test both.
            tx = self.fixture / 'output/lv3-audit-20261107/transactions'
            def transaction_bytes():
                return {p.relative_to(tx).as_posix(): p.read_bytes()
                        for p in tx.rglob('*') if p.is_file()}
            receipts_before = transaction_bytes()
            chain_before = (self.fixture / pipeline.CHAIN).read_bytes()
            for relative, error in [
                    ('public/data/v1/relations.json', 'Input drift'),
                    ('public/data/v1/senses.json', r'^Unknown or mixed before/after state$')]:
                with self.subTest(path=relative):
                    if relative.endswith('relations.json'):
                        self.assertNotIn(relative, {pipeline.media_migration.MEDIA, pipeline.media_migration.PRIORITY})
                        self.assertIn(relative, self.manifest['unchangedInputs'])
                        self.assertNotIn(relative, self.manifest['files'])
                    else:
                        self.assertIn(relative, self.manifest['files'])
                    path = self.fixture / relative
                    original = path.read_bytes()
                    path.write_bytes(original + b' ')
                    snapshot = self.snapshot()
                    with patch.object(pipeline.os, 'replace', wraps=pipeline.os.replace) as replacements:
                        with self.assertRaisesRegex(ValueError, error):
                            pipeline.project_checkpoint(
                                self.fixture, Path(self.temporary.name) / ('tampered-' + path.stem + '-projection'))
                        replacements.assert_not_called()
                    self.assert_snapshot(snapshot)
                    self.assertEqual(transaction_bytes(), receipts_before)
                    self.assertEqual((self.fixture / pipeline.CHAIN).read_bytes(), chain_before)
                    path.write_bytes(original)
            return
        path = self.fixture / 'public/data/v1/senses.json'
        path.write_bytes(path.read_bytes() + b' ')
        snapshot = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'Input drift'):
            pipeline.project_checkpoint(self.fixture, Path(self.temporary.name) / 'tampered-projection')
        self.assert_snapshot(snapshot)

    def test_09_changed_file_raw_drift_fails_closed(self):
        paths = [next(iter(self.manifest['files']))]
        if self.manifest.get('unit') == 'LV3-U18':
            paths.append(pipeline._U18_SOURCE_PATH)
        if self.manifest.get('unit') == 'LV3-U19':
            paths.append(pipeline._U19_SOURCE_PATH)
        for path in paths:
            with self.subTest(path=path):
                (self.fixture / path).write_bytes(self.original[path] + b' ')
                snapshot = self.snapshot()
                with self.assertRaisesRegex(ValueError, 'Unknown or mixed'):
                    self.apply_fixture()
                self.assert_snapshot(snapshot)
                (self.fixture / path).write_bytes(self.original[path])


def main():
    global UNIT, SUMMARY
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--unit', required=True)
    parser.add_argument('--capture', type=Path, required=True)
    parser.add_argument('--summary', type=Path, help='Explicit sealed summary under repository docs; default is UNIT-before-capture.json')
    parser.add_argument('--test', nargs='+', help='Optional exact test methods for a focused rerun')
    args = parser.parse_args()
    import re
    audit.require(re.fullmatch(r'U\d{2}', args.unit), 'Unit must be U followed by two digits')
    UNIT = args.unit
    SUMMARY = args.summary
    base.MANIFEST = pipeline.DOCS + '/' + UNIT + '-patches.json'
    base.CAPTURE = args.capture.resolve()
    base.OUTPUT = base.ROOT / 'output/lv3-audit-20261107' / (UNIT.lower() + '-validation')
    before = {p: (base.ROOT / p).read_bytes() for p in pipeline.unit_input_paths(base.ROOT, 'LV3-' + UNIT)}
    suite = (unittest.TestSuite([RealUnitFixtureTests(name) for name in args.test]) if args.test else
             unittest.defaultTestLoader.loadTestsFromTestCase(RealUnitFixtureTests))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    for path, content in before.items():
        audit.require((base.ROOT / path).read_bytes() == content, 'Repository product input changed: ' + path)
    base.OUTPUT.mkdir(parents=True, exist_ok=True)
    audit.dump(base.OUTPUT / ('python-real-fixture-results.json' if not args.test else 'python-focused-rerun-results.json'), {
        'unit': UNIT, 'testsRun': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
        'successful': result.wasSuccessful(), 'repositoryInputsUnchanged': True,
        'scope': 'Temporary fixtures only; no worktree product application'})
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
