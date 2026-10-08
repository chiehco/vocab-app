"""Transaction regressions using public data and a synthetic staged workbook."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import openpyxl
from PIL import Image
import apply_lv3_approved_review as apply

ROOT = Path(__file__).resolve().parent.parent


class ApplyReviewTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.repo = self.root / 'repo'
        direct = Path('src/features/direct')
        files = [Path('public/data/v1') / name for name in apply.CONTENT_FILES + ['meta.json']]
        files += [direct / name for name in ['curriculum.json', 'curriculumUnit2.json', 'wordCatalog.json']]
        files += [path.relative_to(ROOT) for path in (ROOT / direct).glob('curriculumLV4Unit*.json')]
        files += [Path('src/features/vocabulary/lv1ReviewedImages.json'), Path('public/wordbeast/s/W002812.webp')]
        for relative in files:
            (self.repo / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, self.repo / relative)
        for filename, key, value in [('words.json', 'wordId', apply.WORD_ID), ('senses.json', 'wordId', apply.WORD_ID)]:
            path = self.repo / 'public/data/v1' / filename
            apply.write_json(path, [row for row in apply.read(path) if row[key] != value])
        catalog = self.repo / direct / 'wordCatalog.json'
        apply.write_json(catalog, [row for row in apply.read(catalog) if row['wordId'] != apply.WORD_ID])
        self.review = []
        for filename, target in [('curriculum.json', 'probability'), ('curriculumUnit2.json', 'slender')]:
            path = self.repo / direct / filename
            unit = apply.read(path)
            item = next(row for row in unit['learningItems'] if row.get('displayWord') == target)
            item.pop('illustration', None)
            if target == 'probability':
                image = self.root / 'probability.png'
                Image.new('RGB', (16, 16), 'green').save(image)
                for alias in ['limousine', 'limo']:
                    row = next(row for row in unit['learningItems'] if row.get('displayWord') == alias)
                    row.update(lexemeRef=f'LC-LV3U01-{alias}', officialWordId=None, officialSenseId=None)
            else:
                image = self.repo / 'public/wordbeast/s/W002812.webp'
            self.review.append(dict(word=target, alternative=str(image), alternativeSha256=apply.sha(image), unit=dict(example=item['originalExample'])))
            apply.write_json(path, unit)
        for word, meaning in [('determine', '確定'), ('perform', '執行')]:
            self.review.append(dict(word=word, unit=dict(targetMeaningZh=meaning), captionProposal=dict(en='Candidate only', zh='僅為候選')))
        meta = self.repo / 'public/data/v1/meta.json'
        value = apply.read(meta)
        value['counts'].update(words=6084, senses=765)
        apply.write_json(meta, value)
        self.master = self.root / 'master.xlsx'
        self.master.write_bytes(b'untouched source fixture')
        self.review_path = self.root / 'review.json'
        apply.write_json(self.review_path, self.review)
        self.out = self.repo / 'output/stage'
        self.out.mkdir(parents=True)
        (self.out / self.master.name).write_bytes(b'previous staged workbook')
        (self.out / 'apply-result.json').write_bytes(b'previous receipt')

    def stage_master(self, _source, staged):
        # Workbook generation/preservation is audited separately against the real
        # source. This fixture exercises the entire later App pipeline unchanged.
        workbook = openpyxl.Workbook()
        words = workbook.active
        words.title = 'input_words_單字主表'
        words.append(['word_id', 'word', 'level', 'pos', 'meaning_zh'])
        words.append(['可空；程式自動產生'])
        words.append([apply.WORD_ID, apply.HEADWORD, 'LV3', 'n.', '加長型禮車'])
        senses = workbook.create_sheet('input_senses_義項表')
        senses.append(['sense_id', 'word_id', 'word', 'sense_pos', 'meaning_zh'])
        senses.append([apply.WORD_ID + '-1', apply.WORD_ID, apply.HEADWORD, 'n.', '加長型禮車', None, None, 'limousine/limo', None, 'reviewed'])
        workbook.save(staged)
        workbook.close()
        return dict(stagedSha256=apply.sha(staged))

    def snapshot(self):
        return {path.relative_to(self.root).as_posix(): apply.sha(path) for path in self.root.rglob('*') if path.is_file()}

    def run_apply(self):
        with patch.object(apply, 'stage_master', side_effect=self.stage_master):
            return apply.apply_review(self.repo, self.master, self.review_path, self.out)

    def assert_failure_preserves_all_files(self, error):
        before = self.snapshot()
        with self.assertRaises(error):
            self.run_apply()
        self.assertEqual(self.snapshot(), before)

    def test_missing_later_review_entry_changes_no_files(self):
        apply.write_json(self.review_path, [row for row in self.review if row['word'] != 'slender'])
        self.assert_failure_preserves_all_files(KeyError)

    def test_missing_later_image_changes_no_files(self):
        self.review[1]['alternative'] = str(self.root / 'missing.webp')
        apply.write_json(self.review_path, self.review)
        self.assert_failure_preserves_all_files(FileNotFoundError)

    def test_bad_later_image_hash_changes_no_files(self):
        self.review[1]['alternativeSha256'] = 'invalid'
        apply.write_json(self.review_path, self.review)
        self.assert_failure_preserves_all_files(AssertionError)

    def test_missing_later_image_hash_changes_no_files(self):
        del self.review[1]['alternativeSha256']
        apply.write_json(self.review_path, self.review)
        self.assert_failure_preserves_all_files(KeyError)

    def test_changed_later_example_changes_no_files(self):
        self.review[1]['unit']['example'] = {'sentenceEn': 'Different sentence'}
        apply.write_json(self.review_path, self.review)
        self.assert_failure_preserves_all_files(AssertionError)

    def test_late_pack_failure_changes_no_files(self):
        original = apply.build_sa_pack
        def fail_after_pack(*args):
            original(*args)
            raise RuntimeError('Injected failure after pack generation')
        with patch.object(apply, 'build_sa_pack', side_effect=fail_after_pack):
            self.assert_failure_preserves_all_files(RuntimeError)
        self.assertEqual(self.run_apply()['packCounts']['words'], 1529)

    def test_replacement_failure_rolls_back_all_files(self):
        original = apply.os.replace
        for failure_at in [3, 10]:
            with self.subTest(failure_at=failure_at):
                calls = 0
                def fail_once(source, destination):
                    nonlocal calls
                    calls += 1
                    if calls == failure_at:
                        raise OSError('Injected replacement failure')
                    return original(source, destination)
                with patch.object(apply.os, 'replace', side_effect=fail_once):
                    self.assert_failure_preserves_all_files(OSError)

    def test_success_commits_complete_outputs_and_keeps_sources(self):
        before = self.snapshot()
        result = self.run_apply()
        self.assertEqual(result['packCounts']['words'], 1529)
        data = self.repo / 'public/data/v1'
        self.assertEqual(len(apply.read(data / 'words.json')), 6085)
        self.assertEqual(len(apply.read(data / 'senses.json')), 766)
        self.assertEqual(apply.read(data / 'meta.json')['contentHash'], apply.published_content_hash(data))
        items = apply.read(self.repo / 'src/features/direct/curriculum.json')['learningItems']
        self.assertEqual([row['officialWordId'] for row in items if row.get('displayWord') in ['limousine', 'limo']], [apply.WORD_ID] * 2)
        after = self.snapshot()
        for name in apply.UNCHANGED_DATA:
            self.assertEqual(after['repo/public/data/v1/' + name], before['repo/public/data/v1/' + name])
        for name in ['master.xlsx', 'review.json', 'probability.png']:
            self.assertEqual(after[name], before[name])
        changed = {name for name in before.keys() | after.keys() if before.get(name) != after.get(name)}
        self.assertEqual(changed, {'repo/' + name for name in apply.OUTPUT_FILES} | {'repo/output/stage/master.xlsx', 'repo/output/stage/apply-result.json'})
        self.assertEqual(apply.read(self.out / 'apply-result.json'), result)


if __name__ == '__main__':
    unittest.main()
