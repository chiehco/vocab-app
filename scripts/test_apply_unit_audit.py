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
        evidence_dir = self.root / 'docs/unit-audit-20261105'
        evidence_dir.mkdir(parents=True)
        for name in ['VERIFIED-VERB-FORMS-SOURCES.json', 'VERIFIED-TRANSLATION-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
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

    def test_exam_source_is_limited_to_sense_rows(self):
        self.manifest["patches"][0]["before"] = {"examEvidence": "old"}
        self.manifest["patches"][0]["after"] = {"examEvidence": "new"}
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

    def form_patch(self):
        fact = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json')['facts'][0]
        return {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Direct authoritative past and participle fields.','evidence':fact['evidence']['url']}

    def translation_patch(self):
        fact = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-TRANSLATION-SOURCES.json')['facts'][0]
        return {'dataset':'examples','key':'exampleId','id':fact['exampleId'],'before':{'sentenceEn':fact['sentenceEn'],'sentenceZh':fact['before']},'after':{'sentenceZh':fact['after']},'reason':fact['reason'],'evidence':fact['evidence']}

    def test_optional_forms_reject_unknown_identity_unverified_value_or_missing_before(self):
        for field, value in [('id','W999999'),('before',{}),('before',{'verbForms':None}),('dataset','examples')]:
            p=self.form_patch();p[field]=value;self.assert_rejected_without_write({**self.manifest,'patches':[p]})
        p=self.form_patch();p['after']['verbForms']['past']='invented';self.assert_rejected_without_write({**self.manifest,'patches':[p]})

    def test_forms_distinguish_missing_from_null_and_preserve_unrelated_fields(self):
        p=self.form_patch();row={'wordId':p['id'],'word':'arm','pos':'n. v.','status':'draft'};original=copy.deepcopy(row)
        with patch.object(audit,'ROOT',self.root):
            audit.validate_patch_shape(p)
            self.assertTrue(audit.apply_to_row(row,p));self.assertFalse(audit.apply_to_row(row,p))
            self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
            with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':None},p)
            with self.assertRaises(AssertionError):audit.apply_to_row({**original,'word':'another'},p)

    def test_translation_requires_exact_english_guard_known_identity_and_known_chinese(self):
        for field,value in [('id','EXunknown'),('before',{'sentenceZh':'old'})]:
            p=self.translation_patch();p[field]=value;self.assert_rejected_without_write({**self.manifest,'patches':[p]})
        p=self.translation_patch();p['before']['sentenceEn']='Changed English';self.assert_rejected_without_write({**self.manifest,'patches':[p]})
        p=self.translation_patch();p['after']['sentenceZh']='Unverified replacement';self.assert_rejected_without_write({**self.manifest,'patches':[p]})

    def test_translation_preserves_cloze_and_checks_guard_even_when_already_applied(self):
        p=self.translation_patch();row={'exampleId':p['id'],**p['before'],'blankSentence':'The girl _____ from head injuries.','answer':'died','sensePos':'v.'}
        with patch.object(audit,'ROOT',self.root):
            audit.validate_patch_shape(p);self.assertTrue(audit.apply_to_row(row,p));self.assertFalse(audit.apply_to_row(row,p))
            self.assertEqual(row['sentenceEn'],p['before']['sentenceEn']);self.assertEqual(row['answer'],'died')
            row['sentenceEn']='Unrecorded English drift'
            with self.assertRaises(AssertionError):audit.apply_to_row(row,p)


if __name__ == "__main__":
    unittest.main()
