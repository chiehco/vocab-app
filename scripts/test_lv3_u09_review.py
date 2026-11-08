"""U09 exact review contracts: shared mutations through the real validator and inverse."""
import copy
import json
from pathlib import Path
import unittest
import lv3_audit_pipeline as p
FIXTURE = json.loads((Path(__file__).parent / 'fixtures/lv3_u09_review_cases.json').read_text(encoding='utf8'))
CASES = FIXTURE['cases']

def materialize(case):
    q = copy.deepcopy(FIXTURE['bases'][case['base']])
    for mutation in case['mutations']:
        owner = q
        for key in mutation['path'][:-1]:
            owner = owner[key]
        key = mutation['path'][-1]
        if mutation['op'] == 'remove':
            owner.pop(key)
        elif isinstance(owner, list) and key == len(owner):
            owner.append(copy.deepcopy(mutation['value']))
        else:
            owner[key] = copy.deepcopy(mutation['value'])
    def reverse_keys(value):
        if isinstance(value, dict):
            return {k: reverse_keys(v) for k, v in reversed(list(value.items()))}
        return [reverse_keys(v) for v in value] if isinstance(value, list) else value
    return reverse_keys(q) if case.get('reverseObjectKeys') else q

class U09ReviewTests(unittest.TestCase):
    pass

def make_test(case):
    def test(self):
        q = materialize(case)
        path = q['path']
        collections = {q['dataset']: {'path': path, 'key': q['key'],
                       'rowsField': 'learningItems' if q['dataset'] == 'curriculum' else None}}
        # Mutations receive fresh scopes and hashes. Stale seals cannot cause a false negative.
        scope = {'schemaVersion': 1, 'unit': case['unit'], 'baseline': p.v1.BASELINE,
                 'collections': collections, 'rows': [{'dataset': q['dataset'], 'id': q['id'],
                 'beforeHash': p.sha(q['before']), 'after': q['after']}]}
        manifest = {'schemaVersion': 2, 'unit': case['unit'], 'baseline': p.v1.BASELINE,
                    'parentManifestHash': '0' * 64, 'readiness': 'pending_independent_before_capture',
                    'scope': 'U09-scope.json', 'scopeHash': p.sha(scope), 'collections': collections,
                    'files': {path: {k: '0' * 64 for k in
                    ['beforeHash', 'afterHash', 'beforeByteHash', 'afterByteHash']}},
                    'patches': [q], 'unchangedInputs': {}, 'derivedBefore': {}, 'beforeMeta': {},
                    'beforePackMeta': {}, 'derivedAfter': None, 'afterMeta': None}
        guard = p.verified_u09_pattern_erratum if q['dataset'] == 'curriculum' else p.verified_u09_republic_fact
        self.assertEqual(guard(manifest, q), case['guardValid'])
        if not case['valid']:
            with self.assertRaises(ValueError):
                p.validate_manifest(manifest, scope)
            return
        p.validate_manifest(manifest, scope)
        # Independent expected rows from fixture before+after, never from projection output.
        before, after = [copy.deepcopy(q['before'])], [{**q['before'], **q['after']}]
        if q['dataset'] == 'curriculum':
            sentinel = {'learningItemId': 'LI-LV3U09-G999', 'kind': 'grammar', 'pattern': 'untouched'}
            template = {'templateId': 'TEXTBOOK-LV3-U09', 'level': 'LV3', 'unit': 9}
            before = {'template': template, 'learningItems': before + [sentinel]}
            after = {'template': template, 'learningItems': after + [sentinel]}
        else:
            sentinel = {'exampleId': 'EX-untouched', 'sentenceEn': 'Original.', 'answer': 'Original', 'status': 'reviewed'}
            before.append(sentinel); after.append(sentinel)
        manifest['files'][path].update(beforeHash=p.sha(before), afterHash=p.sha(after))
        self.assertEqual(p.prepare_step(manifest, {path: before}, scope), {path: after})
        self.assertEqual(p.inverse_step(manifest, {path: after}, scope), {path: before})
    return test
for case in CASES:
    setattr(U09ReviewTests, 'test_' + case['name'], make_test(case))
if __name__ == '__main__':
    unittest.main()
