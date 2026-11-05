"""Negative write-boundary tests; temporary fixtures never touch public data."""
import copy
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import apply_unit_audit as audit


class AuditWriteBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "public/data/v1"
        self.data.mkdir(parents=True)
        self.row = {"exampleId": "EXtest", "word": "man", "sensePos": "n.",
                    "sentenceEn": "They man the desk.", "sentenceZh": "他們值守服務台。",
                    "blankSentence": "They _____ the desk.", "answer": "man"}
        audit.write_json(self.data / "examples.json", [self.row])
        for name in ("words", "senses", "meta", "sa-pack"):
            audit.write_json(self.data / (name + ".json"), [])
        self.manifest = {"baseCommit": "29cfc684d7a11b07f09988c478d30358830f1951", "patches": [{
            "dataset": "examples", "key": "exampleId", "id": "EXtest",
            "before": {"sensePos": "n."}, "after": {"sensePos": "v."},
            "reason": "The target is a verb in this sentence.", "evidence": "Explicit sentence and cloze."}]}

    def run_manifest(self, manifest):
        path = self.root / "negative.json"
        audit.write_json(path, manifest)
        with patch.object(audit, "ROOT", self.root), patch.object(sys, "argv", ["audit", str(path), "--apply"]), redirect_stdout(io.StringIO()):
            audit.main()

    def assert_rejected_without_write(self, manifest):
        original = {p.name: p.read_bytes() for p in self.data.iterdir()}
        with self.assertRaises(AssertionError):
            self.run_manifest(manifest)
        self.assertEqual(original, {p.name: p.read_bytes() for p in self.data.iterdir()})
        self.assertFalse((self.root / "output").exists())

    def test_missing_before_is_rejected_even_if_already_after(self):
        self.manifest["patches"][0]["before"] = {}
        self.assert_rejected_without_write(self.manifest)
        audit.write_json(self.data / "examples.json", [{**self.row, "sensePos": "v."}])
        self.assert_rejected_without_write(self.manifest)

    def test_wrong_old_value_is_rejected(self):
        self.manifest["patches"][0]["before"]["sensePos"] = "adj."
        self.assert_rejected_without_write(self.manifest)

    def test_unlisted_sentence_field_is_rejected(self):
        p = self.manifest["patches"][0]
        p["before"]["sentenceEn"] = self.row["sentenceEn"]
        p["after"]["sentenceEn"] = "A different sentence."
        self.assert_rejected_without_write(self.manifest)

    def test_unknown_row_and_changed_identity_are_rejected(self):
        unknown = copy.deepcopy(self.manifest)
        unknown["patches"][0]["id"] = "EXmissing"
        self.assert_rejected_without_write(unknown)
        identity = copy.deepcopy(self.manifest)
        identity["patches"][0]["key"] = "word"
        identity["patches"][0]["id"] = "man"
        self.assert_rejected_without_write(identity)

    def test_later_invalid_patch_prevents_earlier_valid_write(self):
        bad = copy.deepcopy(self.manifest["patches"][0])
        bad["id"] = "EXmissing"
        self.manifest["patches"].append(bad)
        self.assert_rejected_without_write(self.manifest)


if __name__ == "__main__":
    unittest.main()
