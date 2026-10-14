"""Regression coverage for scoped LV5 pending retention in disposable Temp dictionaries."""
from __future__ import annotations

import copy
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Import the builder being tested from the same repo scripts directory.
import build_sa_pack as CANDIDATE

SCRIPTS = Path(__file__).resolve().parent
# A configurable fixture destination keeps tests outside the repo. On Windows,
# use the user-local Temp directory instead of a sandbox-redirected gettempdir().
configured_temp = os.environ.get('VOCAB_SA_PACK_TEST_TEMP')
if configured_temp:
    temp_candidate = Path(configured_temp).expanduser()
    if not temp_candidate.is_absolute():
        raise ValueError('VOCAB_SA_PACK_TEST_TEMP must be an absolute directory')
elif os.name == 'nt':
    temp_candidate = Path.home() / 'AppData/Local/Temp'
else:
    temp_candidate = Path(tempfile.gettempdir())
TEMP_ROOT = temp_candidate.resolve()
if not TEMP_ROOT.is_dir():
    raise ValueError('Fixture Temp directory must already exist')
if TEMP_ROOT == SCRIPTS.parent or TEMP_ROOT.is_relative_to(SCRIPTS.parent):
    raise ValueError('Fixture Temp directory must stay outside the repo')


def load_baseline():
    path = SCRIPTS / 'fixtures/build_sa_pack_before_lv5_pending.py'
    spec = importlib.util.spec_from_file_location('builder_before_lv5_pending', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ORIGINAL = load_baseline()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def pending_item():
    # A public curriculum fixture, independent of the predicate implementation.
    return dict(learningItemId='LI-LV5U16-V064', kind='vocabulary', displayWord='prohibition',
                lexemeRef='prohibition', officialWordId=None, officialSenseId=None,
                sensePos='vt.', targetMeaningZh='禁止', chapterMeaningsZh='禁止', sourcePage=144,
                sourceRole='related', meaningSource='textbook_transcription',
                review='source_checked_text_only', practiceMode='read_only', printedLabel='衍')


class KeeperBehaviorTest(unittest.TestCase):
    def fixture(self, *, legacy=True, item=None, level='LV5', unit=16, delivery='text_only'):
        temporary = tempfile.TemporaryDirectory(prefix='vocab-sa-pack-legacy-', dir=TEMP_ROOT)
        root = Path(temporary.name).resolve()
        self.assertTrue(root.is_relative_to(TEMP_ROOT))

        def cleanup_fixture():
            # Validate the absolute deletion target stays in the system Temp directory.
            self.assertTrue(Path(temporary.name).resolve().is_relative_to(TEMP_ROOT))
            temporary.cleanup()

        self.addCleanup(cleanup_fixture)
        data, direct = root / 'public/data/v1', root / 'src/features/direct'
        base = dict(wordId='BASE', word='base', pos='n.', meaningZh='底部')
        old = dict(wordId='W005711', word='prohibition', pos='n.', posAll=['n.'],
                   meaningZh='禁令；禁止', usagePattern='a/the prohibition; prohibition of N',
                   arbitraryExistingField={'must': ['remain', 'intact']})
        words = [base, dict(wordId='LV3', word='lvthree'), old,
                 dict(wordId='LV4', word='lvfour'), dict(wordId='LV1', word='lvone')]
        if not legacy:
            words.remove(old)
        write(data / 'words.json', words)
        write(data / 'meta.json', dict(schemaVersion=2, generatedAt='fixture-fixed', contentHash='fixture-source'))
        write(data / 'exam_priority.json', [dict(wordId='BASE', word='base', priorityTier='A'),
                                           dict(wordId='W005711', word='prohibition', priorityTier='B')])
        write(data / 'senses.json', [dict(senseId='legacy-noun', wordId='W005711', sensePos='n.', meaningZh='禁令')])
        write(data / 'examples.json', [dict(exampleId='old-noun-example', word='prohibition', sentenceEn='The prohibition remains in force.')])
        write(data / 'relations.json', [dict(word='prohibition', relatedWord='base')])
        write(data / 'morphemes.json', [dict(word='prohibition', morpheme='-tion')])
        write(data / 'notes.json', [dict(word='prohibition', note='unchanged legacy noun note')])
        write(data / 'media.json', [dict(targetWord='base', path='base.webp'), dict(targetWord='prohibition', path='unapproved.webp')])
        for filename in ['curriculum.json', 'curriculumUnit2.json']:
            write(direct / filename, dict(learningItems=[]))
        write(direct / 'curriculumLV3Unit7.json', dict(template=dict(deliveryMode='text_only'),
              learningItems=[dict(kind='vocabulary', officialWordId='LV3')]))
        write(direct / 'curriculumLV4Unit17.json', dict(learningItems=[dict(kind='vocabulary',
              officialWordId='LV4', review='content_reviewed', illustration=dict(path='reviewed.webp'))]))
        write(direct.parent / 'vocabulary/lv1ReviewedImages.json', [dict(officialWordId='LV1')])
        if item is not None:
            write(direct / 'curriculumLV5Unit16.json', dict(template=dict(level=level, unit=unit, deliveryMode=delivery),
                                                         learningItems=[copy.deepcopy(item)]))
        return data, direct, old

    def pack(self, builder, data, direct):
        counts = builder.build_sa_pack(data, direct)
        return read(data / 'sa-pack.json'), counts

    def test_custom_fixture_without_target_does_not_inject_missing_legacy_id(self):
        data, direct, _ = self.fixture(legacy=False)
        before, _ = self.pack(ORIGINAL, data, direct)
        raw = (data / 'sa-pack.json').read_bytes()
        after, counts = self.pack(CANDIDATE, data, direct)
        self.assertEqual(counts['words'], 4)
        self.assertEqual(after, before)
        self.assertEqual((data / 'sa-pack.json').read_bytes(), raw)

    def test_pending_keeps_complete_ordinary_noun_card_and_every_pack_dataset(self):
        pending = pending_item()
        mapped = dict(pending, officialWordId='W005711', lexemeRef='W005711')
        data, direct, old = self.fixture(item=mapped)
        before, _ = self.pack(ORIGINAL, data, direct)
        raw = (data / 'sa-pack.json').read_bytes()
        unit_path = direct / 'curriculumLV5Unit16.json'
        unit = read(unit_path)
        unit['learningItems'] = [pending]
        write(unit_path, unit)
        after, counts = self.pack(CANDIDATE, data, direct)
        self.assertEqual(next(row for row in after['words'] if row['wordId'] == 'W005711'), old)
        self.assertEqual(counts['words'], 5)
        self.assertEqual(after, before)
        self.assertEqual((data / 'sa-pack.json').read_bytes(), raw)
        self.assertEqual(read(unit_path)['learningItems'], [pending])
        self.assertEqual(after['senses'][0]['sensePos'], 'n.')
        self.assertEqual(after['examples'][0]['exampleId'], 'old-noun-example')
        self.assertEqual(after['media'], [dict(targetWord='base', path='base.webp')])

    def test_without_keeper_pending_fixture_loses_legacy_card_so_positive_test_is_sensitive(self):
        data, direct, _ = self.fixture(item=pending_item())
        before, _ = self.pack(ORIGINAL, data, direct)
        after, _ = self.pack(CANDIDATE, data, direct)
        self.assertNotIn('W005711', [row['wordId'] for row in before['words']])
        self.assertIn('W005711', [row['wordId'] for row in after['words']])
        self.assertEqual(len(after['words']), len(before['words']) + 1)

    def test_same_display_word_with_different_occurrence_does_not_inherit_legacy_id(self):
        unrelated = dict(pending_item(), learningItemId='LI-LV5U16-V099')
        data, direct, _ = self.fixture(legacy=False, item=unrelated)
        before, _ = self.pack(ORIGINAL, data, direct)
        after, _ = self.pack(CANDIDATE, data, direct)
        self.assertEqual(after, before)

    def test_changed_identity_or_readability_cannot_trigger_keeper(self):
        changes = [('kind', 'usage'), ('officialWordId', ''), ('displayWord', 'different'),
                   ('lexemeRef', 'different'), ('sensePos', 'n.'), ('sourcePage', 145),
                   ('targetMeaningZh', '禁令'), ('chapterMeaningsZh', '禁令'),
                   ('meaningSource', 'dictionary'), ('review', 'draft'), ('practiceMode', 'quiz')]
        for key, value in changes:
            with self.subTest(field=key):
                item = pending_item()
                item[key] = value
                data, direct, _ = self.fixture(legacy=False, item=item)
                before, _ = self.pack(ORIGINAL, data, direct)
                after, _ = self.pack(CANDIDATE, data, direct)
                self.assertEqual(after, before)

    def test_absent_mapping_key_is_not_an_explicit_pending_occurrence(self):
        item = pending_item()
        del item['officialWordId']
        data, direct, _ = self.fixture(legacy=False, item=item)
        result, _ = self.pack(CANDIDATE, data, direct)
        self.assertNotIn('W005711', [row['wordId'] for row in result['words']])

    def test_wrong_unit_level_or_non_text_delivery_does_not_inherit(self):
        for options in [dict(level='LV4'), dict(unit=17), dict(delivery='image')]:
            with self.subTest(options=options):
                data, direct, _ = self.fixture(legacy=False, item=pending_item(), **options)
                before, _ = self.pack(ORIGINAL, data, direct)
                after, _ = self.pack(CANDIDATE, data, direct)
                self.assertEqual(after, before)

    def test_printed_marker_changes_do_not_affect_mapping_retention(self):
        for label in ['', '衍', 'an independently reviewed marker']:
            with self.subTest(label=label):
                item = dict(pending_item(), printedLabel=label)
                data, direct, old = self.fixture(item=item)
                result, _ = self.pack(CANDIDATE, data, direct)
                self.assertEqual(next(row for row in result['words'] if row['wordId'] == 'W005711'), old)

    def test_existing_mapped_occurrence_uses_original_selection_without_new_behavior(self):
        mapped = dict(pending_item(), officialWordId='W005711', lexemeRef='W005711')
        data, direct, _ = self.fixture(item=mapped)
        before, _ = self.pack(ORIGINAL, data, direct)
        after, _ = self.pack(CANDIDATE, data, direct)
        self.assertEqual(after, before)

    def test_exact_pending_with_absent_dictionary_fails_before_overwriting_pack(self):
        data, direct, _ = self.fixture(legacy=False, item=pending_item())
        sentinel = b'previous pack must survive a missing retained dictionary record\n'
        (data / 'sa-pack.json').write_bytes(sentinel)
        before = {p: p.read_bytes() for p in data.glob('*.json')}
        with self.assertRaises(SystemExit) as raised:
            self.pack(CANDIDATE, data, direct)
        self.assertIn('1', str(raised.exception))
        self.assertEqual({p: p.read_bytes() for p in data.glob('*.json')}, before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
