"""Exact U19 source contract drafts; synthetic source-only tests, not a final U19 fixture."""
from pathlib import Path
import copy
import json
import tempfile
import unittest
import lv3_audit_pipeline as p

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = p.read_json(ROOT / 'scripts/fixtures/lv3-u19-source-contract-test.json')
SOURCE = 'scripts/sources/LV3Unit19.json'
U18_SOURCE = 'scripts/sources/LV3Unit18.json'


def source_manifest():
    row = copy.deepcopy(FIXTURE['patch'])
    scope = {'schemaVersion': 1, 'unit': 'LV3-U19', 'baseline': p.v1.BASELINE,
             'collections': {'source': copy.deepcopy(FIXTURE['collection'])},
             'rows': [{'dataset': 'source', 'id': 'rumor', 'beforeHash': p.sha(row['before']),
                       'after': copy.deepcopy(row['after'])}]}
    manifest = {'schemaVersion': 2, 'unit': 'LV3-U19', 'baseline': p.v1.BASELINE,
                'parentManifestHash': FIXTURE['parentManifestHash'],
                'readiness': 'pending_independent_before_capture',
                'scope': 'U19-source-contract-test-scope.json', 'scopeHash': p.sha(scope),
                'collections': copy.deepcopy(scope['collections']),
                'files': {SOURCE: copy.deepcopy(FIXTURE['guard'])}, 'patches': [row],
                'unchangedInputs': {}, 'derivedBefore': {}, 'beforeMeta': {},
                'beforePackMeta': {}, 'derivedAfter': None, 'afterMeta': None}
    return manifest, scope


def rescope(manifest):
    scope = {'schemaVersion': 1, 'unit': manifest['unit'], 'baseline': p.v1.BASELINE,
             'collections': copy.deepcopy(manifest['collections']),
             'rows': [{'dataset': row['dataset'], 'id': row['id'],
                       'beforeHash': p.sha(row['before']), 'after': copy.deepcopy(row['after'])}
                      for row in manifest['patches']]}
    manifest['scopeHash'] = p.sha(scope)
    return scope


class U19SourceContractTests(unittest.TestCase):
    def test_exact_reviewed_contract_is_only_rumor_source_pos(self):
        m, s = source_manifest()
        self.assertEqual(m['patches'][0]['after'], {'sourcePos': 'n./vt.'})
        self.assertEqual(m['patches'][0]['before']['sourcePos'], 'n./vi.')
        self.assertEqual(m['collections']['source'], {'path': SOURCE, 'key': 'word', 'rowsField': 'headwords'})
        self.assertEqual(len(m['patches']), 1)
        p.validate_manifest(m, s)

    def reject_change(self, change):
        m, _ = source_manifest()
        change(m)
        with self.assertRaises((ValueError, KeyError, TypeError)):
            p.validate_manifest(m, rescope(m))

    def test_numeric_one_cannot_replace_boolean_evidence(self):
        m, s = source_manifest()
        m['patches'][0]['fieldEvidence']['sourcePos'][0]['beforePresent'] = 1
        self.assertFalse(p.verified_u19_source_patch(m, m['patches'][0]))
        with self.assertRaises(ValueError):
            p.validate_manifest(m, s)

    def test_wrong_unit_cannot_reuse_source(self):
        for unit in ['LV3-U18', 'LV3-U20', 'LV3-U24']:
            with self.subTest(unit=unit):
                self.reject_change(lambda m: m.update(unit=unit))

    def test_collection_path_key_and_array_are_exact(self):
        for key, value in [('path', U18_SOURCE), ('key', 'learningItemId'), ('rowsField', 'related'), ('rowsField', 'usage')]:
            with self.subTest(key=key, value=value):
                self.reject_change(lambda m: m['collections']['source'].update({key: value}))

    def test_complete_patch_rejects_mutated_identity_before_after_and_evidence(self):
        cases = [('id', 'echo'), ('path', U18_SOURCE), ('key', 'learningItemId'),
                 ('before', {'word': 'rumor'}), ('after', {'sourcePos': 'v.'}),
                 ('reason', 'changed'), ('evidence', ['https://example.com']), ('fieldEvidence', {})]
        for key, value in cases:
            with self.subTest(key=key):
                self.reject_change(lambda m: m['patches'][0].update({key: value}))

    def test_every_extra_source_field_is_rejected_even_with_rescope(self):
        for field in ['chapterMeaningsZh', 'word', 'sourcePage', 'officialWordId', 'learningItemId', 'status', 'photos']:
            with self.subTest(field=field):
                self.reject_change(lambda m: m['patches'][0]['after'].update({field: 'unreviewed'}))

    def test_dropping_only_source_field_rejects(self):
        self.reject_change(lambda m: m['patches'][0].update(after={}))

    def test_missing_duplicate_or_additional_source_patch_rejects(self):
        self.reject_change(lambda m: m.update(patches=[]))
        self.reject_change(lambda m: m['patches'].append(copy.deepcopy(m['patches'][0])))
        def extra(m):
            row = copy.deepcopy(m['patches'][0]); row['id'] = row['before']['word'] = 'echo'; m['patches'].append(row)
        self.reject_change(extra)

    def test_each_whole_file_guard_is_frozen(self):
        for field in ['beforeHash', 'afterHash', 'beforeByteHash', 'afterByteHash']:
            with self.subTest(field=field):
                self.reject_change(lambda m: m['files'][SOURCE].update({field: '0' * 64}))
        self.reject_change(lambda m: m['files'][SOURCE].update(beforeFixture='docs/unreviewed.json'))

    def test_field_evidence_reason_presence_and_source_hash_are_frozen(self):
        def mutate(m, key, value):
            m['patches'][0]['fieldEvidence']['sourcePos'][0][key] = value
        for key, value in [('beforePresent', False), ('reason', 'changed'), ('proposal', 'other'), ('originFindingIds', ['other'])]:
            with self.subTest(key=key): self.reject_change(lambda m: mutate(m, key, value))
        self.reject_change(lambda m: m['patches'][0]['fieldEvidence']['sourcePos'][0]['sources'][0].update(sha256='0'*64))

    def test_exact_historical_and_future_domains(self):
        core = p.u03_extension.historical_domain(ROOT, p.v1.input_paths(ROOT))
        self.assertEqual(len(core), 144)
        for unit in ['LV3-U01', 'LV3-U02', 'LV3-U17']:
            self.assertEqual(p.unit_input_paths(ROOT, unit), core)
        self.assertEqual(p.unit_input_paths(ROOT, 'LV3-U18'), core | {U18_SOURCE})
        for unit in ['LV3-U19']:
            domain = p.unit_input_paths(ROOT, unit)
            self.assertEqual(domain, core | {U18_SOURCE, SOURCE}); self.assertEqual(len(domain), 146)

    def admission(self):
        m, _ = source_manifest()
        old = p.read_json(ROOT / p.DOCS / 'U18-patches.json')
        previous = {**old['unchangedInputs'], **old['derivedAfter'],
                    **{path: g['afterByteHash'] for path, g in old['files'].items()}}
        return [previous, p.read_json(ROOT / p.DOCS / 'U01-checkpoint.json')['inputs'],
                {'unit': 'LV3-U18', 'status': 'committed'}, FIXTURE['parentManifestHash'], m]

    def test_admission_adds_only146th_path_to_a_copy(self):
        args = self.admission(); original = copy.deepcopy(args)
        result = p.admit_u19_source_before(*args)
        self.assertEqual(args, original); self.assertEqual(len(args[0]), 145); self.assertEqual(len(args[1]), 144)
        self.assertEqual(len(result), 146); self.assertEqual(set(result)-set(args[0]), {SOURCE})
        self.assertEqual(result[SOURCE], FIXTURE['guard']['beforeByteHash'])
        self.assertEqual(result[U18_SOURCE], args[0][U18_SOURCE])

    def test_admission_rejects_every_parent_and_domain_mismatch(self):
        cases = [lambda a: a[2].update(unit='LV3-U17'), lambda a: a[2].update(status='prepared'),
                 lambda a: a.__setitem__(2, None), lambda a: a.__setitem__(3, '0'*64),
                 lambda a: a[4].update(parentManifestHash='0'*64),
                 lambda a: a[0].pop(next(iter(a[0]))), lambda a: a[0].update({'unregistered.json': '0'*64}),
                 lambda a: a[0].update({SOURCE: FIXTURE['guard']['beforeByteHash']}),
                 lambda a: a[0].update({U18_SOURCE: '0'*64}), lambda a: a[1].pop(next(iter(a[1])))]
        for i, change in enumerate(cases):
            with self.subTest(case=i):
                args = self.admission(); change(args)
                with self.assertRaises(ValueError): p.admit_u19_source_before(*args)

    def test_source_whole_document_forward_inverse_and_all_unrelated_arrays(self):
        m, s = source_manifest()
        before = p.read_json(ROOT / SOURCE)
        index = next(i for i, row in enumerate(before['headwords']) if row['word'] == 'rumor')
        before['headwords'][index] = copy.deepcopy(FIXTURE['patch']['before'])
        original = copy.deepcopy(before)
        after = p.prepare_step(m, {SOURCE: before}, s)[SOURCE]
        self.assertEqual(before, original)
        self.assertEqual(p.inverse_step(m, {SOURCE: after}, s), {SOURCE: before})
        for key in ['related', 'usage', 'photos', 'headwordOrder', 'notes']:
            self.assertEqual(after[key], before[key])
        self.assertEqual([r['word'] for r in after['headwords']], [r['word'] for r in before['headwords']])
        self.assertEqual(len(after['headwords']), 45)

    def test_raw_root_photo_unrelated_headword_related_usage_and_notes_drift_fail_closed(self):
        m, _ = source_manifest()
        before = p.read_json(ROOT / SOURCE)
        index = next(i for i, row in enumerate(before['headwords']) if row['word'] == 'rumor')
        before['headwords'][index] = copy.deepcopy(FIXTURE['patch']['before'])
        after = copy.deepcopy(before); after['headwords'][index].update(FIXTURE['patch']['after'])
        with tempfile.TemporaryDirectory(prefix='lv3-u19-source-guards-') as temporary:
            root = Path(temporary); target = root / SOURCE; target.parent.mkdir(parents=True)
            for side, document in [('before', before), ('after', after)]:
                raw = p.serialize(document); target.write_bytes(raw); self.assertEqual(p.known_state(root, m), side)
                mutations = {'raw': raw+b' '}
                for key in ['root', 'photos', 'headwords', 'related', 'usage', 'notes']:
                    changed = copy.deepcopy(document)
                    if key == 'root': changed['unrecorded'] = True
                    elif isinstance(changed[key][0], dict): changed[key][0]['unrecorded'] = True
                    else: changed[key].append('unrecorded')
                    mutations[key] = p.serialize(changed)
                for kind, content in mutations.items():
                    with self.subTest(side=side, kind=kind):
                        target.write_bytes(content)
                        with self.assertRaisesRegex(ValueError, 'Unknown or mixed'): p.known_state(root, m)
                        self.assertEqual(target.read_bytes(), content)
                        target.write_bytes(raw)

if __name__ == '__main__':
    unittest.main()
