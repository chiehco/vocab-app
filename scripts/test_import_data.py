import tempfile
import unittest
from pathlib import Path
from import_data import content_hash, parse_media


class ContentHashTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
