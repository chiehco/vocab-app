import tempfile
import unittest
from pathlib import Path
from import_data import content_hash, parse_media, parse_words, parse_examples


class ContentHashTest(unittest.TestCase):
    def test_line_endings_do_not_change_content_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            names=["words", "senses", "examples", "relations", "morphemes", "notes", "exam_priority", "hooks", "media"]
            for name in names:(root/f"{name}.json").write_bytes(b"[]\n")
            before=content_hash(root)
            for name in names:(root/f"{name}.json").write_bytes(b"[]\r\n")
            self.assertEqual(before,content_hash(root))

    def test_caption_only_change_invalidates_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ["words", "senses", "examples", "relations", "morphemes", "notes", "exam_priority", "hooks", "media"]:
                (root / f"{name}.json").write_text("[]", encoding="utf-8")
            before = content_hash(root)
            (root / "media.json").write_text('[{"captionZh":"更新說明"}]', encoding="utf-8")
            self.assertNotEqual(before, content_hash(root))
            self.assertEqual(content_hash(root), content_hash(root))


class MediaWorksheet:
    title = "input_media_prompts_圖卡"

    def __init__(self, rows):
        self.rows = [["asset_id"], ["可空；程式自動產生"], *rows]

    def iter_rows(self, **_kwargs):
        return iter(self.rows)


class MediaIdentityTest(unittest.TestCase):
    def test_rejects_same_id_for_different_scenes(self):
        rows = [
            ["same", "word", "big", "大的", "image", "scenario", "pumpkin", "大南瓜", "approved"],
            ["same", "word", "big", "大的", "image", "scenario", "blue ball", "大藍球", "approved"],
        ]
        with self.assertRaisesRegex(SystemExit, "圖卡 asset_id 重複：same"):
            parse_media(MediaWorksheet(rows))

    def test_allows_distinct_scenes_and_keeps_draft_status(self):
        rows = [
            ["old", "word", "big", "大的", "image", "scenario", "pumpkin", "大南瓜", "approved"],
            ["new", "word", "big", "大的", "image", "scenario", "blue ball", "大藍球", "needs_check"],
        ]
        result = {row["assetId"]: row for row in parse_media(MediaWorksheet(rows))}
        self.assertEqual(result["old"]["status"], "approved")
        self.assertEqual(result["new"]["status"], "needs_check")

class OptionalMeaningFieldsTest(unittest.TestCase):
    def test_verified_forms_round_trip_without_deriving_from_answers(self):
        sheet=MediaWorksheet([])
        sheet.rows=[['word_id','word','level','pos']+['']*12+['verb_base','verb_past','verb_past_participle','verb_forms_source','verb_forms_status'],['填表說明'],
          ['W999001','zzverb','LV1','v.']+[None]*12+['zzverb','zzpast','zzparticiple','synthetic:checked','approved']]
        self.assertEqual(parse_words(sheet)[0]['verbForms']['pastParticiple'],'zzparticiple')
        sheet.rows[-1][-3]=None
        with self.assertRaisesRegex(SystemExit,'動詞三態缺欄位'):
            parse_words(sheet)

    def test_example_sense_link_uses_named_column_after_existing_guidance(self):
        sheet=MediaWorksheet([])
        sheet.rows=[['example_id','word','sense_pos','meaning_hint','example_type','sentence_en','sentence_zh','blank_sentence','answer','difficulty','status','填表說明','sense_id'],['填表說明'],
          ['E-SYNTHETIC','zzword','n.','測試','basic','Synthetic sentence.',None,None,None,'LV1','reviewed',None,'W999001-2']]
        self.assertEqual(parse_examples(sheet)[0]['senseId'],'W999001-2')


if __name__ == "__main__":
    unittest.main()
