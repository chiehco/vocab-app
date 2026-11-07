"""Regression tests for the currently U01-scoped LV3 audit applier.

The reusable fixture is reconstructed by exact manifest inversion of the checked
current AFTER datasets. It never accepts an unknown hash or recomputes a relaxed
expected guard. Only temporary fixture files are mutated.
"""
from __future__ import annotations
import copy
import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import apply_lv3_unit_audit as audit
import lv3_audit_pipeline as pipeline

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'docs/lv3-audit-20261107/U01-patches.json'
# Captured pre-application metadata; its entire canonical file hash must equal
# the immutable manifest derivedBefore guard before the fixture can run.
BEFORE_META = {
    'schemaVersion': 2,
    'generatedAt': '2026-11-07T05:15:37Z',
    'sourceFile': '萬詞譜母表_SA義項清理整合_20260904.xlsx',
    'counts': {'words': 6090, 'senses': 772, 'examples': 7871, 'relations': 40,
               'morphemes': 3798, 'media': 1177, 'notes': 4290,
               'examPriority': 3792, 'hooks': 0},
    'wordsHash': 'a83514c5fab5c2cbd24ca97d0346c7ba9cb82f372dc0227caeb6163d30922619',
    'contentHash': '2f2ec85789ebeb410404eda608c14fe4d8475f6c57083299db4c1f393a3015cd',
    'houseSourceSha256': '98fa208835caf7184acc95f26dcff56ace23ba281ff8d4b9b8c37e18e407be14',
}


def exact_inverse(manifest, current):
    """Reject drift first, then restore full before rows and verify base hashes."""
    audit.validate_manifest(manifest)
    audit.require(set(current) == set(audit.SPECS), 'Incomplete inverse datasets')
    for name, value in current.items():
        audit.require(audit.node_hash(value) == manifest['datasets'][name]['afterHash'],
                      f'Unknown current after hash: {name}')
    restored = copy.deepcopy(current)
    for item in manifest['patches']:
        rr = audit.rows(restored[item['dataset']], audit.SPECS[item['dataset']][2])
        indices = [i for i, row in enumerate(rr) if row.get(item['key']) == item['id']]
        audit.require(len(indices) == 1, f'Nonunique inverse row: {item["id"]}')
        index = indices[0]
        audit.require(rr[index] == {**item['before'], **item['after']},
                      f'Inverse full-row drift: {item["id"]}')
        rr[index] = copy.deepcopy(item['before'])
    for name, value in restored.items():
        audit.require(audit.node_hash(value) == manifest['datasets'][name]['beforeHash'],
                      f'Inverse baseline hash mismatch: {name}')
    return restored


class U01AuditApplierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.projection_temp = tempfile.TemporaryDirectory(prefix='lv3-u01-projection-')
        cls.addClassCleanup(cls.projection_temp.cleanup)
        checkpoint = pipeline.project_checkpoint(ROOT, Path(cls.projection_temp.name) / 'checkpoint')
        cls.manifest = audit.read_json(ROOT / MANIFEST)
        cls.current_after = {name: audit.read_json(checkpoint / spec[0])
                             for name, spec in audit.SPECS.items()}
        cls.before = exact_inverse(cls.manifest, cls.current_after)
        cls.temporary = tempfile.TemporaryDirectory(prefix='lv3-u01-unittest-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.fixture = Path(cls.temporary.name).resolve()
        for relative in audit.input_paths(ROOT) | {MANIFEST}:
            target = cls.fixture / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile((ROOT if relative == MANIFEST else checkpoint) / relative, target)
        for name, value in cls.before.items():
            audit.dump(cls.fixture / audit.SPECS[name][0], value)
        audit.dump(cls.fixture / audit.DERIVED[0], BEFORE_META)
        builder_path = cls.fixture / audit.BUILDER
        spec = importlib.util.spec_from_file_location('u01_fixture_pack_builder', builder_path)
        builder = importlib.util.module_from_spec(spec)
        exec(compile(builder_path.read_text(encoding='utf-8'), str(builder_path), 'exec'), builder.__dict__)
        builder.build_sa_pack(cls.fixture / 'public/data/v1', cls.fixture / 'src/features/direct')
        for relative, expected in cls.manifest['derivedBefore'].items():
            audit.require(audit.file_hash(cls.fixture / relative) == expected,
                          f'Fixture derived guard mismatch: {relative}')
        for relative, expected in cls.manifest['unchangedInputs'].items():
            audit.require(audit.file_hash(cls.fixture / relative) == expected,
                          f'Fixture input guard mismatch: {relative}')
        cls.original_bytes = {relative: (cls.fixture / relative).read_bytes()
                              for relative in audit.input_paths(cls.fixture) | {MANIFEST}}

    def tearDown(self):
        # One large fixture per class, restored after each test. Deletion is
        # restricted to this test-created temporary root, never the repository.
        self.assertTrue(self.fixture.is_relative_to(Path(tempfile.gettempdir()).resolve()))
        self.assertNotEqual(self.fixture, ROOT)
        for relative, content in self.original_bytes.items():
            target = self.fixture / relative
            if target.read_bytes() != content:
                target.write_bytes(content)
        transactions = self.fixture / 'output/lv3-audit-20261107/transactions'
        if transactions.exists():
            self.assertTrue(transactions.resolve().is_relative_to(self.fixture))
            shutil.rmtree(transactions)
        for leftover in self.fixture.rglob('*.lv3-audit-*.tmp'):
            self.assertTrue(leftover.resolve().is_relative_to(self.fixture))
            leftover.unlink()

    def assert_inputs_unchanged(self):
        for relative, content in self.original_bytes.items():
            self.assertEqual((self.fixture / relative).read_bytes(), content, relative)

    def test_01_complete_before_row_guard(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['patches'][0]['before']['meaningZh'] = 'unlisted drift'
        with self.assertRaisesRegex(ValueError, 'Complete row drift'):
            audit.prepare(manifest, self.before)
        # Exact inverse likewise rejects even a nonpatched current row drift.
        drift = copy.deepcopy(self.current_after)
        drift['words'][0]['meaningZh'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'Unknown current after hash'):
            exact_inverse(self.manifest, drift)
        self.assert_inputs_unchanged()

    def test_02_path_traversal_rejected(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['patches'][0]['path'] = '../words.json'
        with self.assertRaisesRegex(ValueError, 'path/key mismatch'):
            audit.prepare(manifest, self.before)
        with self.assertRaisesRegex(ValueError, 'Unsafe path'):
            audit.safe_path(self.fixture, '../outside.json')
        self.assert_inputs_unchanged()

    def test_03_duplicate_patch_rejected(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['patches'].append(copy.deepcopy(manifest['patches'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate patch row'):
            audit.prepare(manifest, self.before)
        self.assert_inputs_unchanged()

    def test_04_protected_status_rejected(self):
        manifest = copy.deepcopy(self.manifest)
        manifest['patches'][0]['after']['status'] = 'approved'
        with self.assertRaisesRegex(ValueError, 'Disallowed after field'):
            audit.prepare(manifest, self.before)
        self.assert_inputs_unchanged()

    def test_05_unrelated_dataset_drift_rejected_before_writes(self):
        data = copy.deepcopy(self.before['words'])
        data[0]['meaningZh'] = 'unrelated drift'
        audit.dump(self.fixture / audit.SPECS['words'][0], data)
        snapshot = {p: (self.fixture / p).read_bytes() for p in self.original_bytes}
        with self.assertRaisesRegex(ValueError, 'Unknown whole-dataset drift'):
            audit.run(self.fixture, self.fixture / MANIFEST, apply=True)
        for relative, content in snapshot.items():
            self.assertEqual((self.fixture / relative).read_bytes(), content, relative)
        self.assertFalse((self.fixture / 'output').exists())

    def test_06_mixed_state_rejected(self):
        data = copy.deepcopy(self.before)
        data['words'] = self.current_after['words']
        with self.assertRaisesRegex(ValueError, 'Mixed before/after'):
            audit.prepare(self.manifest, data)
        self.assert_inputs_unchanged()

    def test_07_dry_run_zero_product_writes(self):
        result = audit.run(self.fixture, self.fixture / MANIFEST)
        self.assertEqual(result['state'], 'dry_run')
        self.assertEqual(result['productWrites'], 0)
        self.assert_inputs_unchanged()

    def test_08_failed_second_replace_rolls_back_all_inputs(self):
        real_replace = audit.os.replace
        calls = []
        def fail_second(source, target):
            calls.append(str(target))
            if len(calls) == 2:
                raise OSError('injected second-file failure')
            return real_replace(source, target)
        with patch.object(audit.os, 'replace', side_effect=fail_second):
            with self.assertRaisesRegex(OSError, 'injected second-file failure'):
                audit.run(self.fixture, self.fixture / MANIFEST, apply=True)
        self.assertGreaterEqual(len(calls), 3)  # rollback itself performs replace
        self.assert_inputs_unchanged()
        receipts = list((self.fixture / 'output').rglob('transaction.json'))
        self.assertEqual(len(receipts), 1)
        self.assertEqual(audit.read_json(receipts[0])['state'], 'rolled_back')

    def test_09_apply_and_reapply_are_idempotent(self):
        result = audit.run(self.fixture, self.fixture / MANIFEST, apply=True)
        self.assertEqual(result['state'], 'applied')
        self.assertEqual(result['productWrites'], 7)
        snapshot = {p: (self.fixture / p).read_bytes() for p in self.original_bytes}
        second = audit.run(self.fixture, self.fixture / MANIFEST, apply=True)
        self.assertEqual(second['state'], 'already_applied')
        self.assertEqual(second['productWrites'], 0)
        for relative, content in snapshot.items():
            self.assertEqual((self.fixture / relative).read_bytes(), content, relative)
        for name, spec in audit.SPECS.items():
            self.assertEqual(audit.node_hash(audit.read_json(self.fixture / spec[0])),
                             self.manifest['datasets'][name]['afterHash'])

    def test_10_all_result_hashes_and_exact_inverse(self):
        state, after = audit.prepare(self.manifest, self.before)
        self.assertEqual(state, 'before')
        self.assertEqual(after, self.current_after)
        for name, data in after.items():
            self.assertEqual(audit.node_hash(data), self.manifest['datasets'][name]['afterHash'])
        self.assertEqual(exact_inverse(self.manifest, after), self.before)
        self.assert_inputs_unchanged()


if __name__ == '__main__':
    unittest.main(verbosity=2)
