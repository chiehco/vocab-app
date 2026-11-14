"""Small identity regressions only; never load or execute a real-unit fixture."""
import copy
import unittest
from pathlib import Path
import verify_lv3_unit_fixture as fixture


class FixtureIdentityTests(unittest.TestCase):
    def setUp(self):
        self.parent_hash = 'a' * 64
        self.manifest = {'schemaVersion': 2, 'unit': 'LV3-U06',
                         'parentManifestHash': self.parent_hash}
        self.parent = {'kind': 'migration', 'migrationId': 'starter-media-actual-names-v1',
                       'path': 'starter-media-actual-names-v1-manifest.json',
                       'manifestHash': self.parent_hash, 'status': 'committed'}
        self.target = {'unit': 'LV3-U06', 'path': 'U06-patches.json',
                       'manifestHash': fixture.audit.node_hash(self.manifest), 'status': 'prepared'}
        self.entries = [self.parent, self.target]

    def test_migration_parent_and_ordinary_target_are_selected_by_kind(self):
        self.assertEqual(fixture.fixture_unit_index(self.entries, self.manifest), 1)
        self.assertEqual(fixture.fixture_parent_checkpoint(self.entries, self.manifest),
                         'starter-media-actual-names-v1')

    def test_existing_ordinary_unit_parents_keep_their_identity(self):
        for unit, parent in [('LV3-U02', 'LV3-U01'), ('LV3-U04', 'LV3-U02'), ('LV3-U05', 'LV3-U04')]:
            with self.subTest(unit=unit):
                manifest = {**self.manifest, 'unit': unit}
                entries = [{'unit': parent, 'path': parent[4:] + '-patches.json',
                            'manifestHash': self.parent_hash, 'status': 'committed'},
                           {**self.target, 'unit': unit, 'path': unit[4:] + '-patches.json',
                            'manifestHash': fixture.audit.node_hash(manifest)}]
                self.assertEqual(fixture.fixture_unit_index(entries, manifest), 1)
                self.assertEqual(fixture.fixture_parent_checkpoint(entries, manifest), parent)

    def test_fixture_promotion_changes_only_the_ordinary_target(self):
        before = copy.deepcopy(self.entries)
        self.entries[fixture.fixture_unit_index(self.entries, self.manifest)]['status'] = 'committed'
        self.assertEqual(self.entries[0], before[0])
        self.assertEqual(self.entries[1], {**before[1], 'status': 'committed'})
        self.assertEqual(fixture.fixture_unit_index(self.entries, self.manifest), 1)

    def test_missing_duplicate_and_migration_targets_are_rejected(self):
        cases = [[], [self.parent], self.entries + [self.target],
                 [{**self.parent, 'migrationId': 'LV3-U06', 'unit': 'LV3-U06'}]]
        for entries in cases:
            with self.subTest(entries=entries), self.assertRaisesRegex(ValueError, 'Missing or duplicate'):
                fixture.fixture_unit_index(entries, self.manifest)

    def test_target_schema_identity_hash_and_shape_are_not_bypassed(self):
        cases = [({**self.manifest, 'schemaVersion': 3}, self.entries, 'schema-2'),
                 ({**self.manifest, 'unit': None}, self.entries, 'identity'),
                 ({**self.manifest, 'extra': True}, self.entries, 'manifest chain mismatch'),
                 (self.manifest, [self.parent, {**self.target, 'kind': 'other'}], 'Invalid ordinary'),
                 (self.manifest, [self.parent, {**self.target, 'status': 'unknown'}], 'Unknown fixture')]
        for manifest, entries, message in cases:
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                fixture.fixture_unit_index(entries, manifest)

    def test_missing_or_uncommitted_parent_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'no predecessor'):
            fixture.fixture_parent_checkpoint([self.target], self.manifest)
        for status in ['prepared', 'unknown']:
            with self.subTest(status=status), self.assertRaisesRegex(ValueError, 'not committed'):
                fixture.fixture_parent_checkpoint([{**self.parent, 'status': status}, self.target], self.manifest)

    def test_parent_identity_and_manifest_link_remain_required(self):
        for parent, message in [({**self.parent, 'migrationId': None}, 'identity'),
                                ({**self.parent, 'manifestHash': 'b' * 64}, 'manifest mismatch')]:
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                fixture.fixture_parent_checkpoint([parent, self.target], self.manifest)

    def test_resolution_does_not_mutate_inputs(self):
        before = copy.deepcopy((self.entries, self.manifest))
        fixture.fixture_unit_index(self.entries, self.manifest)
        fixture.fixture_parent_checkpoint(self.entries, self.manifest)
        self.assertEqual((self.entries, self.manifest), before)


class FixtureWritePathTests(unittest.TestCase):
    def make_manifest(self, unit):
        curriculum = 'curriculumUnit2.json' if unit == 'LV3-U02' else 'curriculumLV3Unit' + str(int(unit[-2:])) + '.json'
        source = {'public/data/v1/words.json', 'public/data/v1/examples.json', 'src/features/direct/' + curriculum}
        if unit != 'LV3-U07':
            source.add('public/data/v1/notes.json')
        return {'unit': unit, 'files': dict.fromkeys(source),
                'derivedAfter': dict.fromkeys(fixture.pipeline.DERIVED)}

    def test_registered_five_and_original_six_file_shapes_are_exact(self):
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07']:
            with self.subTest(unit=unit):
                manifest = self.make_manifest(unit)
                paths = fixture.fixture_expected_write_paths(manifest)
                self.assertEqual(paths, set(manifest['files']) | {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'})
                self.assertEqual(len(paths), 5 if unit == 'LV3-U07' else 6)
                self.assertEqual('public/data/v1/notes.json' in paths, unit != 'LV3-U07')

    def test_missing_extra_or_wrong_source_path_fails(self):
        for unit in ['LV3-U06', 'LV3-U07']:
            for mode in ['missing', 'extra', 'wrong']:
                with self.subTest(unit=unit, mode=mode):
                    manifest = self.make_manifest(unit)
                    if mode in ['missing', 'wrong']:
                        del manifest['files']['public/data/v1/words.json']
                    if mode in ['extra', 'wrong']:
                        manifest['files']['public/data/v1/senses.json'] = None
                    with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                        fixture.fixture_expected_write_paths(manifest)

    def test_unknown_units_and_derived_path_drift_fail(self):
        manifest = self.make_manifest('LV3-U07')
        with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
            fixture.fixture_expected_write_paths({**manifest, 'unit': 'LV3-U99'})
        with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
            fixture.fixture_expected_write_paths({**manifest, 'unit': 'LV3-U11'})
        for paths in [{'public/data/v1/meta.json'}, fixture.pipeline.DERIVED | {'public/data/v1/notes.json'}]:
            with self.subTest(paths=paths), self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                fixture.fixture_expected_write_paths({**manifest, 'derivedAfter': dict.fromkeys(paths)})


class U08FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit8.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U08', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_five_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 5)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_notes_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/notes.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/notes.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u08_shape(self):
        for unit in ['LV3-U99', 'U08', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U09', 'LV3-U10', 'LV3-U11']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


class U09FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit9.json', 'public/data/v1/notes.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U09', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_six_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 6)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_media_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/media.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/media.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u09_shape(self):
        for unit in ['LV3-U99', 'U09', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U10', 'LV3-U11']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


class U10FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit10.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U10', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_five_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 5)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_notes_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/notes.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/notes.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u10_shape(self):
        for unit in ['LV3-U99', 'U10', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U09', 'LV3-U11']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


class U11FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit11.json', 'public/data/v1/notes.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U11', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_six_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 6)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_media_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/media.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/media.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u11_shape(self):
        for unit in ['LV3-U99', 'U11', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U09', 'LV3-U10']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


class FixtureSummaryPathTests(unittest.TestCase):
    def test_default_keeps_each_legacy_before_capture_path(self):
        root = Path.cwd().resolve()
        for unit in ['U02', 'U04', 'U05', 'U06', 'U07', 'U08']:
            with self.subTest(unit=unit):
                self.assertEqual(fixture.fixture_summary_path(root, unit),
                                 root / fixture.pipeline.DOCS / (unit + '-before-capture.json'))

    def test_explicit_relative_and_absolute_summary_paths(self):
        root = Path.cwd().resolve()
        relative = Path(fixture.pipeline.DOCS) / 'U08-sealed-capture.json'
        for value in [relative, root / relative]:
            with self.subTest(value=value):
                self.assertEqual(fixture.fixture_summary_path(root, 'U08', value),
                                 root / relative)
        self.assertNotEqual(fixture.fixture_summary_path(root, 'U08', relative),
                            fixture.fixture_summary_path(root, 'U08'))

    def test_u09_uses_separate_explicit_sealed_summary(self):
        root = Path.cwd().resolve()
        relative = Path(fixture.pipeline.DOCS) / 'U09-sealed-capture.json'
        self.assertEqual(fixture.fixture_summary_path(root, 'U09', relative), root / relative)
        self.assertNotEqual(fixture.fixture_summary_path(root, 'U09', relative),
                            fixture.fixture_summary_path(root, 'U09'))

    def test_explicit_summary_cannot_escape_repository_docs(self):
        root = Path.cwd().resolve()
        for value in [Path('output/summary.json'), Path('../summary.json'),
                      root / 'docs/../summary.json', root.parent / 'summary.json']:
            with self.subTest(value=value), self.assertRaisesRegex(
                    ValueError, 'Fixture summary must reside under repository docs'):
                fixture.fixture_summary_path(root, 'U08', value)


class U14FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit14.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U14', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_five_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 5)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_notes_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/notes.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/notes.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u14_shape(self):
        for unit in ['LV3-U99', 'U14', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U09', 'LV3-U10', 'LV3-U11', 'LV3-U12', 'LV3-U13']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


    def test_u14_parent_is_exact_committed_u13(self):
        parent_hash = 'a' * 64
        manifest = {'schemaVersion': 2, 'unit': 'LV3-U14', 'parentManifestHash': parent_hash}
        parent = {'unit': 'LV3-U13', 'path': 'U13-patches.json', 'manifestHash': parent_hash, 'status': 'committed'}
        target = {'unit': 'LV3-U14', 'path': 'U14-patches.json', 'manifestHash': fixture.audit.node_hash(manifest), 'status': 'prepared'}
        entries = [parent, target]
        original = copy.deepcopy((entries, manifest))
        self.assertEqual(fixture.fixture_parent_checkpoint(entries, manifest), 'LV3-U13')
        self.assertEqual((entries, manifest), original)
        with self.assertRaisesRegex(ValueError, 'not committed'):
            fixture.fixture_parent_checkpoint([{**parent, 'status': 'prepared'}, target], manifest)
        with self.assertRaisesRegex(ValueError, 'manifest mismatch'):
            fixture.fixture_parent_checkpoint([{**parent, 'manifestHash': 'b' * 64}, target], manifest)

    def test_u14_sealed_summary_is_separate_from_original_before_capture(self):
        root = Path.cwd().resolve()
        sealed = Path(fixture.pipeline.DOCS) / 'U14-sealed-capture.json'
        before = root / fixture.pipeline.DOCS / 'U14-before-capture.json'
        self.assertEqual(fixture.fixture_summary_path(root, 'U14'), before)
        for value in [sealed, root / sealed]:
            with self.subTest(value=value):
                self.assertEqual(fixture.fixture_summary_path(root, 'U14', value), root / sealed)
                self.assertNotEqual(fixture.fixture_summary_path(root, 'U14', value), before)


class U15FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit15.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U15', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_five_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 5)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_notes_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/notes.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/notes.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u15_shape(self):
        for unit in ['LV3-U99', 'U15', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U09', 'LV3-U10', 'LV3-U11', 'LV3-U12', 'LV3-U13', 'LV3-U14']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


    def test_u15_parent_is_exact_committed_u14(self):
        parent_hash = 'a' * 64
        manifest = {'schemaVersion': 2, 'unit': 'LV3-U15', 'parentManifestHash': parent_hash}
        parent = {'unit': 'LV3-U14', 'path': 'U14-patches.json', 'manifestHash': parent_hash, 'status': 'committed'}
        target = {'unit': 'LV3-U15', 'path': 'U15-patches.json', 'manifestHash': fixture.audit.node_hash(manifest), 'status': 'prepared'}
        entries = [parent, target]
        original = copy.deepcopy((entries, manifest))
        self.assertEqual(fixture.fixture_parent_checkpoint(entries, manifest), 'LV3-U14')
        self.assertEqual((entries, manifest), original)
        with self.assertRaisesRegex(ValueError, 'not committed'):
            fixture.fixture_parent_checkpoint([{**parent, 'status': 'prepared'}, target], manifest)
        with self.assertRaisesRegex(ValueError, 'manifest mismatch'):
            fixture.fixture_parent_checkpoint([{**parent, 'manifestHash': 'b' * 64}, target], manifest)

    def test_u15_sealed_summary_is_separate_from_original_before_capture(self):
        root = Path.cwd().resolve()
        sealed = Path(fixture.pipeline.DOCS) / 'U15-sealed-capture.json'
        before = root / fixture.pipeline.DOCS / 'U15-before-capture.json'
        self.assertEqual(fixture.fixture_summary_path(root, 'U15'), before)
        for value in [sealed, root / sealed]:
            with self.subTest(value=value):
                self.assertEqual(fixture.fixture_summary_path(root, 'U15', value), root / sealed)
                self.assertNotEqual(fixture.fixture_summary_path(root, 'U15', value), before)


class U16FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit16.json', 'public/data/v1/notes.json', 'public/data/v1/senses.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U16', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_seven_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 7)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_media_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/media.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/media.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json', 'public/data/v1/senses.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u16_shape(self):
        for unit in ['LV3-U99', 'U16', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U09', 'LV3-U10', 'LV3-U11', 'LV3-U12', 'LV3-U13', 'LV3-U14', 'LV3-U15']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


    def test_u16_parent_is_exact_committed_u15(self):
        parent_hash = 'a' * 64
        manifest = {'schemaVersion': 2, 'unit': 'LV3-U16', 'parentManifestHash': parent_hash}
        parent = {'unit': 'LV3-U15', 'path': 'U15-patches.json', 'manifestHash': parent_hash, 'status': 'committed'}
        target = {'unit': 'LV3-U16', 'path': 'U16-patches.json', 'manifestHash': fixture.audit.node_hash(manifest), 'status': 'prepared'}
        entries = [parent, target]
        original = copy.deepcopy((entries, manifest))
        self.assertEqual(fixture.fixture_parent_checkpoint(entries, manifest), 'LV3-U15')
        self.assertEqual((entries, manifest), original)
        with self.assertRaisesRegex(ValueError, 'not committed'):
            fixture.fixture_parent_checkpoint([{**parent, 'status': 'prepared'}, target], manifest)
        with self.assertRaisesRegex(ValueError, 'manifest mismatch'):
            fixture.fixture_parent_checkpoint([{**parent, 'manifestHash': 'b' * 64}, target], manifest)

    def test_u16_sealed_summary_is_separate_from_original_before_capture(self):
        root = Path.cwd().resolve()
        sealed = Path(fixture.pipeline.DOCS) / 'U16-sealed-capture.json'
        before = root / fixture.pipeline.DOCS / 'U16-before-capture.json'
        self.assertEqual(fixture.fixture_summary_path(root, 'U16'), before)
        for value in [sealed, root / sealed]:
            with self.subTest(value=value):
                self.assertEqual(fixture.fixture_summary_path(root, 'U16', value), root / sealed)
                self.assertNotEqual(fixture.fixture_summary_path(root, 'U16', value), before)


class U17FixtureWritePathTests(unittest.TestCase):
    # Literal reviewed write contract, never inferred from actual writes.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'src/features/direct/curriculumLV3Unit17.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def make_manifest(self):
        return {'unit': 'LV3-U17', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_five_paths_and_input_immutability(self):
        manifest = self.make_manifest()
        before = copy.deepcopy(manifest)
        self.assertEqual(fixture.fixture_expected_write_paths(manifest),
                         self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(manifest)), 5)
        self.assertEqual(manifest, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                del manifest['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_extra_notes_senses_or_other_unit_source_is_rejected(self):
        for path in ['public/data/v1/notes.json', 'public/data/v1/senses.json',
                     'src/features/direct/curriculumLV3Unit7.json']:
            with self.subTest(path=path):
                manifest = self.make_manifest()
                manifest['files'][path] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_same_count_wrong_source_is_rejected(self):
        for original in self.SOURCES:
            with self.subTest(original=original):
                manifest = self.make_manifest()
                del manifest['files'][original]
                manifest['files']['public/data/v1/notes.json'] = None
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_missing_extra_and_same_count_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED - {path} for path in self.DERIVED]
        cases += [self.DERIVED | {'public/data/v1/notes.json'}]
        cases += [(self.DERIVED - {path}) | {'public/data/v1/media.json'}
                  for path in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                manifest = self.make_manifest()
                manifest['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(manifest)

    def test_unknown_or_wrong_unit_cannot_reuse_u17_shape(self):
        for unit in ['LV3-U99', 'U17', None]:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unregistered real-fixture write shape'):
                    fixture.fixture_expected_write_paths(manifest)
        for unit in ['LV3-U02', 'LV3-U04', 'LV3-U05', 'LV3-U06', 'LV3-U07', 'LV3-U08', 'LV3-U09', 'LV3-U10', 'LV3-U11', 'LV3-U12', 'LV3-U13', 'LV3-U14', 'LV3-U15', 'LV3-U16']:
            with self.subTest(unit=unit):
                manifest = {**self.make_manifest(), 'unit': unit}
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(manifest)


    def test_u17_parent_is_exact_committed_u16(self):
        parent_hash = 'a' * 64
        manifest = {'schemaVersion': 2, 'unit': 'LV3-U17', 'parentManifestHash': parent_hash}
        parent = {'unit': 'LV3-U16', 'path': 'U16-patches.json', 'manifestHash': parent_hash, 'status': 'committed'}
        target = {'unit': 'LV3-U17', 'path': 'U17-patches.json', 'manifestHash': fixture.audit.node_hash(manifest), 'status': 'prepared'}
        entries = [parent, target]
        original = copy.deepcopy((entries, manifest))
        self.assertEqual(fixture.fixture_parent_checkpoint(entries, manifest), 'LV3-U16')
        self.assertEqual((entries, manifest), original)
        with self.assertRaisesRegex(ValueError, 'not committed'):
            fixture.fixture_parent_checkpoint([{**parent, 'status': 'prepared'}, target], manifest)
        with self.assertRaisesRegex(ValueError, 'manifest mismatch'):
            fixture.fixture_parent_checkpoint([{**parent, 'manifestHash': 'b' * 64}, target], manifest)

    def test_u17_sealed_summary_is_separate_from_original_before_capture(self):
        root = Path.cwd().resolve()
        sealed = Path(fixture.pipeline.DOCS) / 'U17-sealed-capture.json'
        before = root / fixture.pipeline.DOCS / 'U17-before-capture.json'
        self.assertEqual(fixture.fixture_summary_path(root, 'U17'), before)
        for value in [sealed, root / sealed]:
            with self.subTest(value=value):
                self.assertEqual(fixture.fixture_summary_path(root, 'U17', value), root / sealed)
                self.assertNotEqual(fixture.fixture_summary_path(root, 'U17', value), before)


class U19FixtureWritePathTests(unittest.TestCase):
    # Literal independent scope, not inferred from generated manifests or replace calls.
    SOURCES = {'public/data/v1/words.json', 'public/data/v1/examples.json',
               'public/data/v1/notes.json', 'src/features/direct/curriculumLV3Unit19.json',
               'scripts/sources/LV3Unit19.json'}
    DERIVED = {'public/data/v1/meta.json', 'public/data/v1/sa-pack.json'}

    def manifest(self):
        return {'unit': 'LV3-U19', 'files': dict.fromkeys(self.SOURCES),
                'derivedAfter': dict.fromkeys(self.DERIVED)}

    def test_exact_seven_paths_and_input_immutability(self):
        m = self.manifest(); before = copy.deepcopy(m)
        self.assertEqual(fixture.fixture_expected_write_paths(m), self.SOURCES | self.DERIVED)
        self.assertEqual(len(fixture.fixture_expected_write_paths(m)), 7)
        self.assertEqual(m, before)

    def test_each_missing_source_is_rejected(self):
        for path in self.SOURCES:
            with self.subTest(path=path):
                m = self.manifest(); del m['files'][path]
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(m)

    def test_extra_or_same_count_wrong_source_is_rejected(self):
        for wrong in ['scripts/sources/LV3Unit18.json', 'public/data/v1/senses.json', 'public/data/v1/media.json', 'src/features/direct/curriculumLV3Unit20.json']:
            for removed in [None, *self.SOURCES]:
                with self.subTest(wrong=wrong, removed=removed):
                    m = self.manifest()
                    if removed: del m['files'][removed]
                    m['files'][wrong] = None
                    with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                        fixture.fixture_expected_write_paths(m)

    def test_missing_extra_or_wrong_derived_paths_are_rejected(self):
        cases = [self.DERIVED-{p} for p in self.DERIVED] + [self.DERIVED|{'public/data/v1/media.json'}]
        cases += [(self.DERIVED-{p})|{'public/data/v1/media.json'} for p in self.DERIVED]
        for paths in cases:
            with self.subTest(paths=paths):
                m = self.manifest(); m['derivedAfter'] = dict.fromkeys(paths)
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture derived paths'):
                    fixture.fixture_expected_write_paths(m)

    def test_other_unit_cannot_reuse_u19_shape(self):
        for unit in ['LV3-U18', 'LV3-U17', 'LV3-U16']:
            with self.subTest(unit=unit):
                m = self.manifest(); m['unit'] = unit
                with self.assertRaisesRegex(ValueError, 'Unexpected real-fixture source paths'):
                    fixture.fixture_expected_write_paths(m)

    def test_parent_must_be_committed_u18_with_exact_manifest_hash(self):
        parent_hash = 'cb6dd8d826d9ed47c7627eff8c15527773f6101440afeca4a6654b931e922dc6'
        m = {'schemaVersion': 2, 'unit': 'LV3-U19', 'parentManifestHash': parent_hash}
        parent = {'unit': 'LV3-U18', 'path': 'U18-patches.json', 'manifestHash': parent_hash, 'status': 'committed'}
        target = {'unit': 'LV3-U19', 'path': 'U19-patches.json', 'manifestHash': fixture.audit.node_hash(m), 'status': 'prepared'}
        self.assertEqual(fixture.fixture_parent_checkpoint([parent, target], m), 'LV3-U18')
        with self.assertRaisesRegex(ValueError, 'not committed'):
            fixture.fixture_parent_checkpoint([{**parent, 'status': 'prepared'}, target], m)
        with self.assertRaisesRegex(ValueError, 'manifest mismatch'):
            fixture.fixture_parent_checkpoint([{**parent, 'manifestHash': '0'*64}, target], m)


if __name__ == '__main__':
    unittest.main()
