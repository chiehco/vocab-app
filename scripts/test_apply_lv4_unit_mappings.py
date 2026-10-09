"""Exercise the four-word transaction and safe publication in disposable fixtures."""
import copy
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import openpyxl

import apply_lv4_unit_mappings as apply

ROOT = Path(__file__).resolve().parent.parent


class FourWordApplyTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.repo = self.root / 'repo'
        self.cards = apply.contract()['cards']
        direct = Path('src/features/direct')
        files = [Path('public/data/v1') / n for n in apply.CONTENT_FILES + ['meta.json', 'sa-pack.json']]
        files += [direct / n for n in ['curriculum.json', 'curriculumUnit2.json', 'wordCatalog.json']]
        files += [p.relative_to(ROOT) for p in (ROOT / direct).glob('curriculumLV4Unit*.json')]
        files += [Path('src/features/vocabulary/lv1ReviewedImages.json')]
        for path in files:
            target = self.repo / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / path, target)
        for filename, key, id_key in [('words.json', 'wordId', 'wordId'), ('senses.json', 'senseId', 'senseId'), ('examples.json', 'exampleId', 'exampleId')]:
            path = self.repo / 'public/data/v1' / filename
            ids = {c[id_key] for c in self.cards}
            apply.write_json(path, [r for r in apply.read(path) if r[key] not in ids])
        for name in {c['unitFile'] for c in self.cards}:
            path = self.repo / direct / name
            unit = apply.read(path)
            for card in [c for c in self.cards if c['unitFile'] == name]:
                index = next(n for n, item in enumerate(unit['learningItems']) if item['learningItemId'] == card['originalItem']['learningItemId'])
                unit['learningItems'][index] = copy.deepcopy(card['originalItem'])
            apply.write_json(path, unit)
        data = self.repo / 'public/data/v1'
        meta = apply.read(data / 'meta.json')
        for n in ['words', 'senses', 'examples']:
            meta['counts'][n] = len(apply.read(data / (n + '.json')))
        apply.write_json(data / 'meta.json', meta)
        apply.build_sa_pack(data, self.repo / direct)
        self.master = self.root / 'master.xlsx'
        self.master.write_bytes(b'original synthetic source')
        self.out = self.repo / 'output/source'
        self.out.mkdir(parents=True)
        (self.out / self.master.name).write_bytes(b'previous staged workbook')
        (self.out / 'apply-result.json').write_bytes(b'previous receipt')
        # Source-hash validation is separately exercised; avoid copying external art.
        self.source_contract = apply.contract()
        self.source_contract['sourceSha256'] = {}

    def stage_master(self, _source, staged):
        workbook = openpyxl.Workbook()
        workbook.remove(workbook.active)
        for name in apply.SHEETS:
            sheet = workbook.create_sheet(name)
            sheet.append(['identifier'])
            if name != apply.SHEETS[1]:
                sheet.append(['可空；程式自動產生'])
            for card in self.cards:
                sheet.append(apply.row_values(card)[name])
        workbook.save(staged)
        workbook.close()
        return dict(stagedSha256=apply.sha(staged))

    def run_apply(self):
        with patch.object(apply, 'stage_master', side_effect=self.stage_master), patch.object(apply, 'validate_sources'), patch.object(apply, 'contract', return_value=self.source_contract):
            # Keep the immutable published asset bytes in the fixture snapshot.
            for card in self.cards:
                path = Path('public') / card['originalItem']['illustration']['path']
                target = self.repo / path
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists():
                    shutil.copy2(ROOT / path, target)
            return apply.apply_review(self.repo, self.master, self.root, self.out)

    def snapshot(self):
        return {p.relative_to(self.root).as_posix(): apply.sha(p) for p in self.root.rglob('*') if p.is_file()}

    def prepare_assets(self):
        for card in self.cards:
            path = Path('public') / card['originalItem']['illustration']['path']
            target = self.repo / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / path, target)

    def assert_failure_unchanged(self, error):
        self.prepare_assets()
        before = self.snapshot()
        with self.assertRaises(error):
            self.run_apply()
        self.assertEqual(self.snapshot(), before)

    def test_late_pack_failure_preserves_all_files_and_allows_retry(self):
        original = apply.build_sa_pack
        def fail_after_generation(*args):
            original(*args)
            raise RuntimeError('Late pack failure')
        with patch.object(apply, 'build_sa_pack', side_effect=fail_after_generation):
            self.assert_failure_unchanged(RuntimeError)
        self.assertEqual(self.run_apply()['packCounts']['words'], 1534)
        self.assertEqual(self.master.read_bytes(), b'original synthetic source')
        before = self.snapshot()
        with self.assertRaisesRegex(AssertionError, 'Already applied'):
            self.run_apply()
        self.assertEqual(self.snapshot(), before)

    def test_unapproved_sentence_aborts_every_output(self):
        path = self.repo / 'src/features/direct/curriculumLV4Unit18.json'
        unit = apply.read(path)
        next(i for i in unit['learningItems'] if i.get('displayWord') == 'preferable')['originalExample']['sentenceEn'] = 'Unapproved replacement'
        apply.write_json(path, unit)
        self.assert_failure_unchanged(AssertionError)

    def test_replacement_failure_rolls_back_data_and_new_manifest(self):
        from apply_lv3_approved_review import os
        original, calls = os.replace, 0
        def fail_once(source, destination):
            nonlocal calls
            calls += 1
            if calls == 10:
                raise OSError('Replacement failure after manifest')
            return original(source, destination)
        with patch.object(os, 'replace', side_effect=fail_once):
            self.assert_failure_unchanged(OSError)

    def prepare_publish(self):
        result = self.run_apply()
        apply.write_json(self.out.parent / 'scope-audit.json', dict(status='pass', master=dict(sha256=result['stagedSha256']),
            appSha256={n: apply.sha(self.repo / n) for n in apply.OUTPUT_FILES}))

    def test_source_replace_failure_keeps_original_and_valid_backup(self):
        self.prepare_publish()
        from apply_lv3_approved_review import os
        with patch.object(apply, 'BASE_MASTER_HASH', apply.sha(self.master)), patch.object(os, 'replace', side_effect=OSError('Replace failed')):
            with self.assertRaises(OSError):
                apply.publish_master(self.master, self.out, self.repo)
        self.assertEqual(self.master.read_bytes(), b'original synthetic source')
        self.assertEqual(self.master.with_name('master_before_lv4_u18_u20_4words_20261009.xlsx').read_bytes(), self.master.read_bytes())

    def test_publish_retains_backup_and_refuses_repeat(self):
        self.prepare_publish()
        original = self.master.read_bytes()
        with patch.object(apply, 'BASE_MASTER_HASH', apply.sha(self.master)):
            result = apply.publish_master(self.master, self.out, self.repo)
            before = self.snapshot()
            with self.assertRaises(AssertionError):
                apply.publish_master(self.master, self.out, self.repo)
            self.assertEqual(self.snapshot(), before)
        self.assertTrue(result['published'])
        self.assertEqual(Path(result['backup']).read_bytes(), original)
        self.assertEqual(self.master.read_bytes(), (self.out / self.master.name).read_bytes())

    def test_concurrent_master_change_and_audited_app_change_abort(self):
        self.prepare_publish()
        with self.assertRaisesRegex(AssertionError, 'Source changed'):
            apply.publish_master(self.master, self.out, self.repo)
        (self.repo / 'public/data/v1/examples.json').write_bytes(b'changed after audit')
        before = self.snapshot()
        with patch.object(apply, 'BASE_MASTER_HASH', apply.sha(self.master)):
            with self.assertRaisesRegex(AssertionError, 'Audited App outputs changed'):
                apply.publish_master(self.master, self.out, self.repo)
        self.assertEqual(self.snapshot(), before)

    def test_changed_source_hash_is_rejected(self):
        path = self.root / 'approval.json'
        path.write_text('approved')
        source_contract = copy.deepcopy(self.source_contract)
        source_contract['sourceSha256'] = {'approval.json': apply.sha(path)}
        path.write_text('changed')
        with patch.object(apply, 'contract', return_value=source_contract):
            with self.assertRaisesRegex(AssertionError, 'Approved source changed'):
                apply.validate_sources(self.root, self.repo)


if __name__ == '__main__':
    unittest.main()
