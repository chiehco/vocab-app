"""Real U02 file/pack integration, only in an isolated TemporaryDirectory.

Run explicitly after the independent before-capture gate. Does not apply to the
repository. Writes reproducible parity evidence under output only.
"""
from __future__ import annotations
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import apply_lv3_unit_audit as audit
import lv3_audit_pipeline as pipeline

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = pipeline.DOCS + '/U02-patches.json'
OUTPUT = ROOT / 'output/lv3-audit-20261107/fixture-validation'
CAPTURE = ROOT / 'output/lv3-audit-20261107/independent-before-input-hashes.json'


@unittest.skipUnless(__name__ == '__main__' or os.environ.get('LV3_PIPELINE_REAL_FIXTURES') == '1',
                     'Explicit real-fixture run requires the independent capture artifact')
class U02RealFixtureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = audit.read_json(ROOT / MANIFEST)
        audit.require(cls.manifest['readiness'] == 'ready', 'Independent capture/seal gate not complete')
        cls.scope = audit.read_json(ROOT / pipeline.DOCS / cls.manifest['scope'])
        cls.capture = audit.read_json(CAPTURE)
        summary = audit.read_json(ROOT / pipeline.DOCS / 'U02-before-capture.json')
        audit.require(hashlib.sha256(CAPTURE.read_bytes()).hexdigest() == summary['captureFileSha256'],
                      'Independent capture artifact changed')
        audit.require(set(cls.capture) == audit.input_paths(ROOT), 'Capture domain changed')
        for path, digest in cls.capture.items():
            audit.require(audit.file_hash(ROOT / path) == digest, 'Repository before input drift: ' + path)
        cls.temporary = tempfile.TemporaryDirectory(prefix='lv3-u02-real-fixture-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.fixture = Path(cls.temporary.name) / 'worktree'
        cls.fixture.mkdir()
        for path in audit.input_paths(ROOT):
            destination = cls.fixture / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / path, destination)
        shutil.copytree(ROOT / pipeline.DOCS, cls.fixture / pipeline.DOCS)
        cls.original = {p.relative_to(cls.fixture).as_posix(): p.read_bytes()
                        for p in cls.fixture.rglob('*') if p.is_file()}
        cls.inputs = audit.input_paths(cls.fixture)
        OUTPUT.mkdir(parents=True, exist_ok=True)

    def setUp(self):
        self.extra_paths = []

    def tearDown(self):
        self.assertTrue(self.fixture.resolve().is_relative_to(Path(self.temporary.name).resolve()))
        self.assertNotEqual(self.fixture.resolve(), ROOT.resolve())
        for path, content in self.original.items():
            target = self.fixture / path
            if target.read_bytes() != content:
                target.write_bytes(content)
        for target in self.extra_paths:
            self.assertTrue(target.resolve().is_relative_to(self.fixture.resolve()))
            if target.exists():
                target.unlink()
        transactions = self.fixture / 'output/lv3-audit-20261107/transactions'
        if transactions.exists():
            shutil.rmtree(transactions)
        for target in self.fixture.rglob('*.lv3-audit-*.tmp'):
            self.assertTrue(target.resolve().is_relative_to(self.fixture.resolve()))
            target.unlink()

    def snapshot(self):
        return {p: (self.fixture / p).read_bytes() for p in self.inputs}

    def assert_snapshot(self, snapshot):
        for path, content in snapshot.items():
            self.assertEqual((self.fixture / path).read_bytes(), content, path)

    def apply_fixture(self):
        return audit.run(self.fixture, self.fixture / MANIFEST, apply=True)

    def test_01_real_seal_and_dry_run_do_not_change_inputs(self):
        snapshot = self.snapshot()
        sealed = pipeline.seal_step(self.fixture, self.fixture / MANIFEST, self.capture)
        self.assertEqual(sealed['readiness'], 'ready')
        self.assertEqual(sealed['files'], self.manifest['files'])
        self.assertEqual(sealed['afterMeta']['contentHash'], self.manifest['afterMeta']['contentHash'])
        self.assertEqual(sealed['afterMeta']['wordsHash'], self.manifest['afterMeta']['wordsHash'])
        self.assert_snapshot(snapshot)
        result = audit.run(self.fixture, self.fixture / MANIFEST)
        self.assertEqual(result['state'], 'dry_run')
        self.assertEqual(result['productWrites'], 0)
        self.assertEqual(len(result['files']), 6)
        self.assert_snapshot(snapshot)

    def test_02_real_apply_idempotence_and_single_shared_file_write(self):
        real_replace = pipeline.os.replace
        writes = []
        def record(source, target):
            writes.append(Path(target).relative_to(self.fixture).as_posix())
            return real_replace(source, target)
        with patch.object(pipeline.os, 'replace', side_effect=record):
            result = self.apply_fixture()
        self.assertEqual(result['state'], 'applied')
        self.assertEqual(result['productWrites'], 6)
        self.assertEqual(writes.count('src/features/direct/curriculumUnit2.json'), 1)
        for path, guard in self.manifest['files'].items():
            self.assertEqual(audit.node_hash(audit.read_json(self.fixture / path)), guard['afterHash'])
            self.assertEqual(audit.file_hash(self.fixture / path), guard['afterByteHash'])
        for path, digest in self.manifest['derivedAfter'].items():
            self.assertEqual(audit.file_hash(self.fixture / path), digest)
        after = self.snapshot()
        second = self.apply_fixture()
        self.assertEqual(second['state'], 'already_applied')
        self.assertEqual(second['productWrites'], 0)
        self.assert_snapshot(after)
        # Persist only validation artifacts, not the repository product tree.
        for path in result['files']:
            target = OUTPUT / 'applied-fixture' / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(self.fixture / path, target)
        before_docs = {p: json.loads(self.original[p].decode('utf8')) for p in self.manifest['files']}
        after_docs = {p: audit.read_json(self.fixture / p) for p in self.manifest['files']}
        inverse = pipeline.inverse_step(self.manifest, after_docs, self.scope)
        self.assertEqual(inverse, before_docs)
        parity = {
            'manifestHash': audit.node_hash(self.manifest),
            'patchCount': len(self.manifest['patches']),
            'physicalFileCount': len(after_docs),
            'beforeHashes': {p: audit.node_hash(v) for p, v in before_docs.items()},
            'afterHashes': {p: audit.node_hash(v) for p, v in after_docs.items()},
            'inverseHashes': {p: audit.node_hash(v) for p, v in inverse.items()},
            'inverseByteHashes': {p: pipeline.byte_hash(pipeline.serialize(v)) for p, v in inverse.items()},
            'derivedBefore': self.manifest['derivedBefore'],
            'derivedAfter': self.manifest['derivedAfter'],
            'productWrites': result['productWrites'],
            'sharedCurriculumWrites': writes.count('src/features/direct/curriculumUnit2.json'),
        }
        audit.dump(OUTPUT / 'python-parity.json', parity)

    def test_03_failed_second_replace_rolls_back_every_input(self):
        snapshot = self.snapshot()
        real_replace = pipeline.os.replace
        calls = []
        def fail_second(source, target):
            calls.append(str(target))
            if len(calls) == 2:
                raise OSError('injected U02 second replace failure')
            return real_replace(source, target)
        with patch.object(pipeline.os, 'replace', side_effect=fail_second):
            with self.assertRaisesRegex(OSError, 'injected U02'):
                self.apply_fixture()
        self.assertGreaterEqual(len(calls), 3)
        self.assert_snapshot(snapshot)
        receipts = list((self.fixture / 'output').rglob('transaction.json'))
        self.assertEqual(len(receipts), 1)
        self.assertEqual(audit.read_json(receipts[0])['state'], 'rolled_back')

    def test_04_unknown_unpatched_row_drift_fails_without_writes(self):
        path = 'public/data/v1/examples.json'
        value = audit.read_json(self.fixture / path)
        patched = {p['id'] for p in self.manifest['patches'] if p['dataset'] == 'examples'}
        next(r for r in value if r['exampleId'] not in patched)['unrecordedField'] = True
        (self.fixture / path).write_bytes(pipeline.serialize(value))
        snapshot = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'Unknown or mixed'):
            self.apply_fixture()
        self.assert_snapshot(snapshot)
        self.assertFalse((self.fixture / 'output/lv3-audit-20261107/transactions').exists())

    def test_05_unchanged_input_and_input_set_drift_fail_closed(self):
        path = 'public/data/v1/senses.json'
        (self.fixture / path).write_bytes(self.original[path] + b' ')
        snapshot = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'Input drift'):
            self.apply_fixture()
        self.assert_snapshot(snapshot)
        (self.fixture / path).write_bytes(self.original[path])
        extra = self.fixture / 'src/features/direct/unregistered-test.json'
        extra.write_text('{}\n', encoding='utf8')
        self.extra_paths.append(extra)
        with self.assertRaisesRegex(ValueError, 'Input set changed'):
            self.apply_fixture()
        self.assertEqual(extra.read_text(encoding='utf8'), '{}\n')

    def test_06_exact_after_pending_receipt_never_reports_clean(self):
        self.apply_fixture()
        tx = self.fixture / 'output/lv3-audit-20261107/transactions'
        receipt_path = next(tx.glob('*/transaction.json'))
        receipt = audit.read_json(receipt_path)
        receipt['state'] = 'pending'
        audit.dump(receipt_path, receipt)
        snapshot = self.snapshot()
        for apply in (False, True):
            with self.assertRaisesRegex(ValueError, 'Pending transaction'):
                audit.run(self.fixture, self.fixture / MANIFEST, apply=apply)
        (tx / 'apply.lock').write_text('{"pid":999999}', encoding='utf8')
        for apply in (False, True):
            with self.assertRaisesRegex(ValueError, 'lock exists'):
                audit.run(self.fixture, self.fixture / MANIFEST, apply=apply)
        self.assert_snapshot(snapshot)
        self.assertEqual(audit.read_json(receipt_path)['state'], 'pending')

    def test_07_real_chain_inverse_restores_u01_and_137_original_guards(self):
        self.apply_fixture()
        chain_path = self.fixture / pipeline.CHAIN
        chain = audit.read_json(chain_path)
        chain['entries'][1]['status'] = 'committed'
        audit.dump(chain_path, chain)
        projected = Path(self.temporary.name) / 'projected-u01'
        pipeline.project_checkpoint(self.fixture, projected)
        u1 = audit.read_json(self.fixture / pipeline.DOCS / 'U01-patches.json')
        self.assertEqual(len(u1['unchangedInputs']), 137)
        for path, digest in u1['unchangedInputs'].items():
            self.assertEqual(audit.file_hash(projected / path), digest, path)
        for data in u1['datasets'].values():
            self.assertEqual(audit.node_hash(audit.read_json(projected / data['path'])), data['afterHash'])
        anchor = audit.read_json(self.fixture / pipeline.DOCS / 'U01-checkpoint.json')
        for path, digest in anchor['inputs'].items():
            self.assertEqual(audit.file_hash(projected / path), digest, path)
        audit.dump(OUTPUT / 'checkpoint-projection.json',
                   {'restoredInputCount': len(anchor['inputs']), 'originalU01UnchangedGuards': 137,
                    'u01DatasetAfterHashesPreserved': True, 'status': 'passed'})


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(U02RealFixtureTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    audit.dump(OUTPUT / 'python-real-fixture-results.json',
               {'testsRun': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
                'successful': result.wasSuccessful(), 'scope': 'Temporary fixtures only; no worktree product application'})
    raise SystemExit(0 if result.wasSuccessful() else 1)
