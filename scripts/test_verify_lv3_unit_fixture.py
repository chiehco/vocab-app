"""Small identity regressions only; never load or execute a real-unit fixture."""
import copy
import unittest
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


if __name__ == '__main__':
    unittest.main()
