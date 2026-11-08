"""Shared U08 Oxford forms matrix through both the exact guard and real validator."""
import copy
import json
from pathlib import Path
import unittest
import lv3_audit_pipeline as p

CASES = json.loads((Path(__file__).parent / 'fixtures/lv3_u08_discomfort_cases.json').read_text(encoding='utf8'))


class U08DiscomfortFormsTests(unittest.TestCase):
    pass


def make_test(case):
    def test(self):
        q = copy.deepcopy(case['patch'])
        path = q['path']
        collections = {q['dataset']: {'path': path, 'key': q['key'], 'rowsField': None}}
        # Every mutation gets fresh row/scope seals; stale hashes cannot pass a negative.
        scope = {'schemaVersion': 1, 'unit': case['unit'], 'baseline': p.v1.BASELINE,
                 'collections': collections, 'rows': [{'dataset': q['dataset'], 'id': q['id'],
                 'beforeHash': p.sha(q['before']), 'after': q['after']}]}
        manifest = {'schemaVersion': 2, 'unit': case['unit'], 'baseline': p.v1.BASELINE,
                    'parentManifestHash': '0' * 64, 'readiness': 'pending_independent_before_capture',
                    'scope': case['unit'][4:] + '-scope.json', 'scopeHash': p.sha(scope),
                    'collections': collections, 'files': {path: {k: '0' * 64 for k in
                    ['beforeHash', 'afterHash', 'beforeByteHash', 'afterByteHash']}},
                    'patches': [q], 'unchangedInputs': {}, 'derivedBefore': {}, 'beforeMeta': {},
                    'beforePackMeta': {}, 'derivedAfter': None, 'afterMeta': None}
        self.assertEqual(p.verified_u08_discomfort_forms(manifest, q, q['after']['verbForms']), case['guardValid'])
        if case['valid']:
            p.validate_manifest(manifest, scope)
        else:
            with self.assertRaisesRegex(ValueError, case['error']):
                p.validate_manifest(manifest, scope)
    return test


for case in CASES:
    setattr(U08DiscomfortFormsTests, 'test_' + case['name'], make_test(case))

if __name__ == '__main__':
    unittest.main()
