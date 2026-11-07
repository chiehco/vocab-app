"""Small in-memory pipeline tests. Does not build packs or apply product data."""
import copy
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import lv3_audit_pipeline as p


def fixture():
    path = 'src/features/direct/curriculumUnit2.json'
    documents = {path: {'template': {'unchanged': True},
                       'learningItems': [{'learningItemId': 'LI-1', 'kind': 'grammar', 'explanationZh': 'old'}],
                       'grammarQuestions': [{'questionId': 'Q-1', 'targetMeaningZh': 'old'}]}}
    after = copy.deepcopy(documents)
    after[path]['learningItems'][0]['explanationZh'] = 'new'
    after[path]['grammarQuestions'][0]['targetMeaningZh'] = 'new'
    cols = {'curriculum': {'path': path, 'rowsField': 'learningItems', 'key': 'learningItemId'},
            'grammarQuestions': {'path': path, 'rowsField': 'grammarQuestions', 'key': 'questionId'}}
    patches = []
    for name, col in cols.items():
        before = documents[path][col['rowsField']][0]
        field = 'explanationZh' if name == 'curriculum' else 'targetMeaningZh'
        patches.append({'dataset': name, 'path': path, 'key': col['key'],
                        'id': before[col['key']], 'before': before, 'after': {field: 'new'},
                        'reason': 'exact test correction', 'evidence': [],
                        'fieldEvidence': {field: [{'sources': ['test'], 'reason': 'test', 'proposal': 'test'}]}})
    scope = {'schemaVersion': 1, 'unit': 'LV3-U02', 'baseline': p.v1.BASELINE,
             'collections': cols,
             'rows': [{'dataset': x['dataset'], 'id': x['id'], 'beforeHash': p.sha(x['before']),
                       'after': x['after']} for x in patches]}
    manifest = {'schemaVersion': 2, 'unit': 'LV3-U02', 'baseline': p.v1.BASELINE,
                'parentManifestHash': '0' * 64, 'readiness': 'pending_independent_before_capture',
                'scope': 'U02-scope.json', 'scopeHash': p.sha(scope),
                'collections': cols,
                'files': {path: {'beforeHash': p.sha(documents[path]), 'afterHash': p.sha(after[path]),
                                 'beforeByteHash': p.byte_hash(p.serialize(documents[path])),
                                 'afterByteHash': p.byte_hash(p.serialize(after[path]))}},
                'patches': patches, 'unchangedInputs': {}, 'derivedBefore': {}, 'beforeMeta': {},
                'beforePackMeta': {}, 'derivedAfter': None, 'afterMeta': None}
    return manifest, scope, documents, after


class PurePipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = fixture()

    def case(self):
        return copy.deepcopy(self.fixture)

    def test_same_file_collections_and_exact_roundtrip(self):
        m, scope, before, after = self.case()
        self.assertEqual(p.prepare_step(m, before, scope), after)
        self.assertEqual(p.inverse_step(m, after, scope), before)
        self.assertEqual(len(m['files']), 1)
        self.assertEqual(len(m['collections']), 2)

    def test_successive_edits_to_same_rows_reverse_in_order(self):
        first, first_scope, before, middle = self.case()
        second, scope, _, after = self.case()
        for item in second['patches']:
            item['before'] = {**item['before'], **item['after']}
            item['after'] = {key: 'latest' for key in item['after']}
        for item in scope['rows']:
            patch_row = next(x for x in second['patches'] if x['id'] == item['id'])
            item['beforeHash'] = p.sha(patch_row['before'])
            item['after'] = copy.deepcopy(patch_row['after'])
        second['scopeHash'] = p.sha(scope)
        for path in after:
            for collection, col in second['collections'].items():
                field = 'explanationZh' if collection == 'curriculum' else 'targetMeaningZh'
                after[path][col['rowsField']][0][field] = 'latest'
            second['files'][path] = {'beforeHash': p.sha(middle[path]), 'afterHash': p.sha(after[path]),
                                    'beforeByteHash': p.byte_hash(p.serialize(middle[path])),
                                    'afterByteHash': p.byte_hash(p.serialize(after[path]))}
        self.assertEqual(p.prepare_step(second, middle, scope), after)
        restored = p.inverse_step(second, after, scope)
        self.assertEqual(p.inverse_step(first, restored, first_scope), before)
        with self.assertRaisesRegex(ValueError, 'Unknown whole-file'):
            p.inverse_step(first, after, first_scope)

    def test_unknown_template_drift_rejected(self):
        m, scope, before, _ = self.case()
        next(iter(before.values()))['template']['extra'] = True
        with self.assertRaisesRegex(ValueError, 'Unknown whole-file drift'):
            p.prepare_step(m, before, scope)

    def test_scope_cannot_be_expanded_by_patch(self):
        m, scope, before, _ = self.case()
        m['patches'][0]['after']['status'] = 'approved'
        with self.assertRaises(ValueError):
            p.prepare_step(m, before, scope)

    def test_even_scope_cannot_allow_protected_field(self):
        m, scope, before, _ = self.case()
        m['patches'][0]['after']['status'] = 'approved'
        scope['rows'][0]['after']['status'] = 'approved'
        m['scopeHash'] = p.sha(scope)
        with self.assertRaisesRegex(ValueError, 'Disallowed after field'):
            p.prepare_step(m, before, scope)

    def test_incomplete_document_set_and_duplicate_patch(self):
        m, scope, before, _ = self.case()
        with self.assertRaisesRegex(ValueError, 'Incomplete physical'):
            p.prepare_step(m, {}, scope)
        m['patches'].append(copy.deepcopy(m['patches'][0]))
        with self.assertRaisesRegex(ValueError, 'Scope row set'):
            p.prepare_step(m, before, scope)

    def test_inverse_requires_complete_after(self):
        m, scope, _, after = self.case()
        next(iter(after.values()))['learningItems'][0]['extra'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'Unknown whole-file'):
            p.inverse_step(m, after, scope)

    def test_normalized_byte_hash_does_not_ignore_formatting(self):
        value = {'a': 1}
        canonical = p.serialize(value)
        self.assertEqual(p.byte_hash(canonical), p.byte_hash(canonical.replace(b'\n', b'\r\n')))
        self.assertNotEqual(p.byte_hash(canonical), p.byte_hash(b'{"a":1}\n'))

    def test_exclusive_and_stale_locks_fail_closed(self):
        with tempfile.TemporaryDirectory(prefix='lv3-pure-lock-') as temp:
            with p.transaction_lock(temp):
                with self.assertRaisesRegex(ValueError, 'lock exists'):
                    with p.transaction_lock(temp):
                        self.fail('second lock entered')
            self.assertFalse((Path(temp) / 'output/lv3-audit-20261107/transactions/apply.lock').exists())

    def test_pending_transaction_blocks_and_preserves_receipt(self):
        with tempfile.TemporaryDirectory(prefix='lv3-pure-pending-') as temp:
            receipt = Path(temp) / 'output/lv3-audit-20261107/transactions/test/transaction.json'
            receipt.parent.mkdir(parents=True)
            receipt.write_text('{"state":"pending"}', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Pending transaction'):
                with p.transaction_lock(temp):
                    self.fail('pending transaction entered')
            self.assertEqual(receipt.read_text(encoding='utf-8'), '{"state":"pending"}')

    def test_final_replace_before_receipt_crash_blocks_dry_run_and_reapply(self):
        # Reproduce durable bytes after the last replace, without executing or
        # killing a product transaction. The pending receipt is never promoted.
        for pending, stale_lock in [(True, False), (False, True), (True, True)]:
            with self.subTest(pending=pending, stale_lock=stale_lock), tempfile.TemporaryDirectory(prefix='lv3-crash-state-') as temp:
                root = Path(temp)
                product = root / 'tiny-product.json'
                replacement = root / 'tiny-product.tmp'
                replacement.write_bytes(b'{"state":"exact-after"}\n')
                p.os.replace(replacement, product)
                manifest = root / 'manifest.json'
                manifest.write_text('{"schemaVersion":1}', encoding='utf8')
                tx = root / 'output/lv3-audit-20261107/transactions'
                tx.mkdir(parents=True)
                if pending:
                    receipt = tx / 'interrupted/transaction.json'
                    receipt.parent.mkdir()
                    receipt.write_text('{"state":"pending"}', encoding='utf8')
                if stale_lock:
                    (tx / 'apply.lock').write_text('{"pid":999999}', encoding='utf8')
                snapshot = {f: f.read_bytes() for f in root.rglob('*') if f.is_file()}
                with patch.object(p.v1, '_run_v1', return_value={'state': 'already_applied', 'productWrites': 0}) as runner:
                    for apply in [False, True]:
                        with self.assertRaisesRegex(ValueError, 'recovery|Pending'):
                            p.v1.run(root, manifest, apply=apply)
                    runner.assert_not_called()
                self.assertEqual({f: f.read_bytes() for f in root.rglob('*') if f.is_file()}, snapshot)

    def test_idempotent_apply_still_rechecks_under_exclusive_lock(self):
        with tempfile.TemporaryDirectory(prefix='lv3-idempotent-lock-') as temp:
            root = Path(temp)
            manifest = root / 'manifest.json'
            manifest.write_text('{"schemaVersion":1}', encoding='utf8')
            calls = []
            def runner(root_arg, path_arg, apply):
                calls.append(apply)
                self.assertEqual((root / 'output/lv3-audit-20261107/transactions/apply.lock').exists(), apply)
                return {'state': 'already_applied', 'productWrites': 0}
            with patch.object(p.v1, '_run_v1', side_effect=runner):
                self.assertEqual(p.v1.run(root, manifest, apply=True)['productWrites'], 0)
            self.assertEqual(calls, [False, True])

    def test_v1_guard_remains_narrow(self):
        m = p.read_json(Path(__file__).resolve().parents[1] / p.DOCS / 'U01-patches.json')
        m['patches'][0]['after']['pos'] = 'adj.'
        with self.assertRaisesRegex(ValueError, 'Disallowed after field'):
            p.validate_manifest(m)


if __name__ == '__main__':
    unittest.main(verbosity=2)
