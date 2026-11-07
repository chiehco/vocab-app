import copy
import json
import tempfile
import unittest
from pathlib import Path

from import_data import parse_words, content_hash
from stage_interact_correction import (
    ROOT, MANIFEST, read, sha, corrected_word, locate_source, stage_records,
)


class Sheet:
    title = 'input_words_單字主表'

    def __init__(self, rows):
        self.rows = rows

    def iter_rows(self, **_kwargs):
        return iter(self.rows)


class InteractCorrectionTest(unittest.TestCase):
    def setUp(self):
        self.manifest = read(MANIFEST)
        self.data = ROOT / 'public/data/v1'

    def sheet(self, meaning=None, status='draft', word_id='W003558'):
        return Sheet([
            ['word_id', 'word', 'level', 'pos', 'meaning_zh', 'meaning_en',
             'usage_pattern', 'syllables', 'stress_pattern', 'phonetic_us',
             'family_key', 'is_core', 'source_note', 'status'],
            ['填表說明'],
            [word_id, 'interact', 'LV4', 'v.', meaning or self.manifest['after'],
             None, None, None, None, None, 'interact', True, None, status],
        ])

    def test_importer_rejects_each_known_contaminant_before_output(self):
        for meaning in [self.manifest['before'], '互動；幕間劇', '互動；幕間休息']:
            with self.subTest(meaning=meaning), self.assertRaisesRegex(SystemExit, '請先修正最新母表'):
                parse_words(self.sheet(meaning))

    def test_importer_keeps_ids_status_and_remaining_meanings(self):
        for status in ['draft', 'needs_check', 'reviewed', 'approved']:
            row = parse_words(self.sheet(status=status))[0]
            self.assertEqual(row['wordId'], 'W003558')
            self.assertEqual(row['status'], status)
            self.assertEqual(row['meaningZh'], self.manifest['after'])

    def test_other_words_are_not_sanitized_or_promoted(self):
        ws = self.sheet('幕間劇', status='needs_check', word_id='W999999')
        ws.rows[2][1] = 'synthetic-other-word'
        self.assertEqual(parse_words(ws)[0]['meaningZh'], '幕間劇')
        self.assertEqual(parse_words(ws)[0]['status'], 'needs_check')

    def test_source_is_located_by_identity_not_a_fixed_row_number(self):
        ws = self.sheet(self.manifest['before'])
        ws.rows.insert(2, ['W999999', 'synthetic', 'LV1', 'n.', '測試'])
        result = locate_source({ws.title: ws}, self.manifest)
        self.assertEqual((result['row'], result['column']), (4, 5))
        self.assertFalse(result['alreadyCorrected'])
        self.assertEqual(result['after'], self.manifest['after'])

    def test_source_rejects_duplicate_ids_pos_status_or_changed_meaning(self):
        for field, value in [(0, 'W999999'), (1, 'wrong-word'), (3, 'n.'), (4, '不同義'), (13, 'approved')]:
            ws = self.sheet()
            ws.rows[-1][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                locate_source({ws.title: ws}, self.manifest)
        ws = self.sheet()
        ws.rows.append(ws.rows[-1].copy())
        with self.assertRaises(ValueError):
            locate_source({ws.title: ws}, self.manifest)

    def test_corrected_source_stages_only_summary_hashes_and_starter(self):
        # This supplies a synthetic corrected row, not a recovered latest master.
        original_hashes = {p.name: sha(p) for p in self.data.glob('*.json')}
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'staged'
            word = corrected_word(self.manifest)
            result = stage_records(self.data, out, word, [], 'synthetic-source-sha', self.manifest)
            expected_words = read(self.data / 'words.json')
            for row in expected_words:
                if row['wordId'] == word['wordId']:
                    row['meaningZh'] = self.manifest['after']
            self.assertEqual(read(out / 'words.json'), expected_words)
            old_pack, new_pack = read(self.data / 'sa-pack.json'), read(out / 'sa-pack.json')
            old_pack['meta'] = new_pack['meta']
            for row in old_pack['words']:
                if row['wordId'] == word['wordId']:
                    row['meaningZh'] = self.manifest['after']
            self.assertEqual(old_pack, new_pack)
            meta = read(out / 'meta.json')
            self.assertEqual(meta['contentHash'], content_hash(out))
            self.assertEqual(meta['wordsHash'], sha(out / 'words.json'))
            self.assertNotEqual(meta['contentHash'], read(self.data / 'meta.json')['contentHash'])
            self.assertNotEqual(new_pack['meta']['contentHash'], read(self.data / 'sa-pack.json')['meta']['contentHash'])
            self.assertEqual(result['newSenseIds'], [])
            self.assertEqual(result['reviewStatus'], 'draft')
            for name in original_hashes:
                if name not in {'words.json', 'meta.json', 'sa-pack.json'}:
                    self.assertEqual((out / name).read_bytes(), (self.data / name).read_bytes())
        self.assertEqual(original_hashes, {p.name: sha(p) for p in self.data.glob('*.json')})

    def test_stage_rejects_unfixed_source_new_senses_changed_status_or_stale_public(self):
        for word, senses in [
            (self.manifest['publishedWordBefore'], []),
            ({**corrected_word(self.manifest), 'status': 'approved'}, []),
            (corrected_word(self.manifest), [{'senseId': 'W003558-1', 'status': 'draft'}]),
        ]:
            with tempfile.TemporaryDirectory() as directory:
                out = Path(directory) / 'staged'
                with self.assertRaises(ValueError):
                    stage_records(self.data, out, word, senses, 'synthetic', self.manifest)
                self.assertFalse(out.exists())
        manifest = copy.deepcopy(self.manifest)
        manifest['publicBaselineSha256']['words.json'] = 'changed'
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'staged'
            with self.assertRaisesRegex(ValueError, 're-audit'):
                stage_records(self.data, out, corrected_word(manifest), [], 'synthetic', manifest)
            self.assertFalse(out.exists())

    def test_stage_refuses_live_data_or_existing_output(self):
        for out in [self.data, self.data / 'nested', self.data.parent]:
            with self.assertRaises(ValueError):
                stage_records(self.data, out, corrected_word(self.manifest), [], 'synthetic', self.manifest)
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
            stage_records(self.data, Path(directory), corrected_word(self.manifest), [], 'synthetic', self.manifest)


if __name__ == '__main__':
    unittest.main()
