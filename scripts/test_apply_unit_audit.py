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
        for name in ['VERIFIED-VERB-FORMS-SOURCES.json', 'VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json', 'VERIFIED-U16-VERB-FORMS-SOURCES.json', 'VERIFIED-U17-VERB-FORMS-SOURCES.json', 'VERIFIED-U18-VERB-FORMS-SOURCES.json', 'VERIFIED-U19-VERB-FORMS-SOURCES.json', 'VERIFIED-U20-VERB-FORMS-SOURCES.json', 'VERIFIED-U21-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U05-U06-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U07-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U08-U09-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U10-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U11-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U12-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U13-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U14-VERB-FORMS-SOURCES.json', 'VERIFIED-INTEGRATED-U15-VERB-FORMS-SOURCES.json', 'VERIFIED-U18-TRANSLATION-SOURCES.json', 'VERIFIED-TRANSLATION-SOURCES.json', 'VERIFIED-NOTE-SOURCES.json', 'VERIFIED-U22-VERB-FORMS-SOURCES.json', 'VERIFIED-U22-TRANSLATION-SOURCES.json', 'VERIFIED-U23-VERB-FORMS-SOURCES.json', 'VERIFIED-U23-TRANSLATION-SOURCES.json', 'VERIFIED-U24-VERB-FORMS-SOURCES.json', 'VERIFIED-U24-NOTE-SOURCES.json', 'VERIFIED-U25-VERB-FORMS-SOURCES.json', 'VERIFIED-LV2-U27-VERB-FORMS-SOURCES.json', 'VERIFIED-LV2-U27-NOTE-SOURCES.json', 'VERIFIED-LV2-U28-VERB-FORMS-SOURCES.json', 'VERIFIED-LV2-U28-NOTE-SOURCES.json', 'VERIFIED-LV2-U29-VERB-FORMS-SOURCES.json', 'VERIFIED-LV2-U29-NOTE-SOURCES.json', 'VERIFIED-LV2-U29-TRANSLATION-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U30-VERB-FORMS-SOURCES.json', 'VERIFIED-LV2-U30-NOTE-SOURCES.json', 'VERIFIED-LV2-U30-TRANSLATION-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U31-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U31-NOTE-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U32-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U32-NOTE-SOURCES.json','VERIFIED-LV2-U32-TRANSLATION-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U33-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U33-NOTE-SOURCES.json','VERIFIED-LV2-U33-TRANSLATION-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U34-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U34-NOTE-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U35-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U35-NOTE-SOURCES.json','VERIFIED-LV2-U35-TRANSLATION-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U36-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U36-NOTE-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U37-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U37-NOTE-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U38-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U38-NOTE-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        for name in ['VERIFIED-LV2-U39-VERB-FORMS-SOURCES.json','VERIFIED-LV2-U39-NOTE-SOURCES.json']:
            audit.write_json(evidence_dir / name, audit.read(audit.ROOT / 'docs/unit-audit-20261105' / name))
        self.integrated_words = audit.read(audit.ROOT / 'public/data/v1/words.json')
        speed39 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U39-speed-usage-followup.json')['patches'][0]
        speed_row = next(w for w in self.integrated_words if w['wordId'] == speed39['id'])
        self.assertEqual(speed_row['usagePatternZh'], speed39['after']['usagePatternZh'])
        speed_row['usagePatternZh'] = speed39['before']['usagePatternZh']
        u39 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U39-patches.json')['patches']
        for recorded in [p for p in u39 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        only38 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U38-only-definition-followup.json')['patches']
        for recorded in only38:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u38 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U38-patches.json')['patches']
        for recorded in [p for p in u38 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u37 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U37-patches.json')['patches']
        for recorded in [p for p in u37 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u36 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U36-patches.json')['patches']
        for recorded in [p for p in u36 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u35 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U35-patches.json')['patches']
        for recorded in [p for p in u35 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u34 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U34-patches.json')['patches']
        for recorded in [p for p in u34 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u33 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U33-patches.json')['patches']
        for recorded in [p for p in u33 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u32 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U32-patches.json')['patches']
        for recorded in [p for p in u32 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        u31 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U31-patches.json')['patches']
        for recorded in [p for p in u31 if p['dataset'] == 'words']:
            row = next(w for w in self.integrated_words if w['wordId'] == recorded['id'])
            for key, value in recorded['after'].items():
                self.assertEqual(row[key], value)
                row[key] = recorded['before'][key]
        # Reconstruct the earlier integrated U11 fixture only through the exact later fine correction.
        fine_patch = next(p for p in audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV1-U23-patches.json')['patches'] if p['dataset'] == 'words' and p['id'] == 'W000310')
        fine = next(w for w in self.integrated_words if w['wordId'] == 'W000310')
        for key, value in fine_patch['after'].items():
            self.assertEqual(fine[key], value)
            fine[key] = fine_patch['before'][key]
        # The U15 wet fixture predates only this exact U25 usage correction.
        wet_patch = next(p for p in audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV1-U25-patches.json')['patches'] if p['dataset'] == 'words' and p['id'] == 'W000962')
        wet = next(w for w in self.integrated_words if w['wordId'] == 'W000962')
        for key, value in wet_patch['after'].items():
            self.assertEqual(wet[key], value)
            wet[key] = wet_patch['before'][key]
        # The U05-U06 part fixture predates only its exact U28 summary/usage correction.
        part_patch = next(p for p in audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U28-patches.json')['patches'] if p['dataset'] == 'words' and p['id'] == 'W000628')
        part = next(w for w in self.integrated_words if w['wordId'] == 'W000628')
        for key, value in part_patch['after'].items():
            self.assertEqual(part[key], value)
            part[key] = part_patch['before'][key]
        # Only these three later U29 field patches precede the historical form fixtures.
        u29 = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U29-patches.json')['patches']
        for identity in ['W001523', 'W001307', 'W000677']:
            recorded = next(p for p in u29 if p['dataset'] == 'words' and p['id'] == identity)
            current = next(row for row in self.integrated_words if row['wordId'] == identity)
            for field, value in recorded['after'].items():
                self.assertEqual(current[field], value)
                current[field] = recorded['before'][field]
        self.data = self.root / "public/data/v1"
        self.data.mkdir(parents=True)
        self.row = {"exampleId": "EXtest", "word": "man", "sensePos": "n.",
                    "sentenceEn": "They man the desk.", "sentenceZh": "他們值守服務台。",
                    "blankSentence": "They _____ the desk.", "answer": "man"}
        audit.write_json(self.data / "examples.json", [self.row])
        for name in ("words", "senses", "notes", "meta", "sa-pack"):
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

    def test_each_followup_allows_only_exact_verified_field_and_rejects_existing_values(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual({fact['wordId'] for fact in facts}, audit.FOLLOWUP_FORM_IDS)
        self.assertFalse(audit.FORM_IDS & audit.FOLLOWUP_FORM_IDS)
        for fact in facts:
            p = {'dataset':'words','key':'wordId','id':fact['wordId'],
                 'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},
                 'reason':'Verified missing field only.','evidence':fact['verbForms']['sourceRef']}
            original = {'wordId':fact['wordId'],'word':fact['word'],'pos':fact['originalPos'],
                        'status':'needs_check','meaningZh':'Preserve existing source value'}
            with patch.object(audit,'ROOT',self.root):
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                self.assertEqual({key:value for key,value in row.items() if key != 'verbForms'},original)
                for existing in [None, {'base':fact['word'],'past':'user-new-value'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    changed = copy.deepcopy(p)
                    changed['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed = copy.deepcopy(p)
                changed['before']['status'] = 'needs_check'
                changed['after']['status'] = 'reviewed'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)

    def test_u16_forms_require_each_exact_source_and_genuine_missing_key(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U16-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts),25)
        self.assertEqual({f['wordId'] for f in facts},audit.U16_FORM_IDS)
        self.assertFalse(audit.U16_FORM_IDS & (audit.FORM_IDS | audit.FOLLOWUP_FORM_IDS))
        for fact in facts:
            p={'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Only verified U16 absence.','evidence':fact['verbForms']['sourceRef']}
            original={'wordId':fact['wordId'],'word':fact['word'],'pos':'n./v.','status':'draft','meaningZh':'Preserve'}
            with patch.object(audit,'ROOT',self.root):
                audit.validate_patch_shape(p)
                row=copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
                for existing in [None,{'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    changed=copy.deepcopy(p);changed['after']['verbForms'][field]='unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed=copy.deepcopy(p);changed['id']='W999999'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed=copy.deepcopy(p);changed['before']={}
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)

    def test_u17_forms_require_exact_identity_source_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U17-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts),18)
        self.assertEqual({f['wordId'] for f in facts},audit.U17_FORM_IDS)
        self.assertFalse(audit.U17_FORM_IDS & (audit.FORM_IDS | audit.FOLLOWUP_FORM_IDS | audit.U16_FORM_IDS))
        with patch.object(audit,'ROOT',self.root):
            for fact in facts:
                p={'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact U17 absence','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                original={'wordId':p['id'],'word':fact['word'],'pos':'n./v.','status':'draft'}
                row=copy.deepcopy(original);self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
                for existing in [None,{'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong=copy.deepcopy(p);wrong['after']['verbForms'][field]='unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                wrong=copy.deepcopy(p);wrong['before']={}
                with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                for identity in ['W000717','W000639','W999999']:
                    wrong=copy.deepcopy(p);wrong['id']=identity
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)

    def test_u18_forms_require_exact_identity_source_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U18-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts),20)
        self.assertEqual({f['wordId'] for f in facts},audit.U18_FORM_IDS)
        self.assertFalse(audit.U18_FORM_IDS & (audit.FORM_IDS | audit.FOLLOWUP_FORM_IDS | audit.U16_FORM_IDS | audit.U17_FORM_IDS))
        with patch.object(audit,'ROOT',self.root):
            for fact in facts:
                p={'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact U18 absence','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                original={'wordId':p['id'],'word':fact['word'],'pos':'n./v.','status':'draft'}
                row=copy.deepcopy(original);self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
                for existing in [None,{'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong=copy.deepcopy(p);wrong['after']['verbForms'][field]='unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                wrong=copy.deepcopy(p);wrong['before']={}
                with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                for identity in ['W000717','W000639','W999999']:
                    wrong=copy.deepcopy(p);wrong['id']=identity
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)

    def test_u19_forms_require_exact_identity_source_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U19-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts),13)
        self.assertEqual({f['wordId'] for f in facts},audit.U19_FORM_IDS)
        self.assertFalse(audit.U19_FORM_IDS & (audit.FORM_IDS | audit.FOLLOWUP_FORM_IDS | audit.U16_FORM_IDS | audit.U17_FORM_IDS | audit.U18_FORM_IDS))
        with patch.object(audit,'ROOT',self.root):
            for fact in facts:
                p={'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact U19 absence','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                original={'wordId':p['id'],'word':fact['word'],'pos':'n./v.','status':'draft'}
                row=copy.deepcopy(original);self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
                for existing in [None,{'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong=copy.deepcopy(p);wrong['after']['verbForms'][field]='unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                wrong=copy.deepcopy(p);wrong['before']={}
                with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                for identity in ['W000717','W000639','W999999']:
                    wrong=copy.deepcopy(p);wrong['id']=identity
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)

    def test_u20_forms_require_exact_identity_source_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U20-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts),15)
        self.assertEqual({f['wordId'] for f in facts},audit.U20_FORM_IDS)
        self.assertFalse(audit.U20_FORM_IDS & (audit.FORM_IDS | audit.FOLLOWUP_FORM_IDS | audit.U16_FORM_IDS | audit.U17_FORM_IDS | audit.U18_FORM_IDS | audit.U19_FORM_IDS))
        with patch.object(audit,'ROOT',self.root):
            for fact in facts:
                p={'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact U20 absence','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                original={'wordId':p['id'],'word':fact['word'],'pos':'n./v.','status':'draft'}
                row=copy.deepcopy(original);self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
                for existing in [None,{'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong=copy.deepcopy(p);wrong['after']['verbForms'][field]='unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                wrong=copy.deepcopy(p);wrong['before']={}
                with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                for identity in ['W000862','W000717','W000639','W999999']:
                    wrong=copy.deepcopy(p);wrong['id']=identity
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)

    def test_u21_forms_require_exact_identity_source_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U21-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts),9)
        self.assertEqual({f['wordId'] for f in facts},audit.U21_FORM_IDS)
        self.assertFalse(audit.U21_FORM_IDS & (audit.FORM_IDS | audit.FOLLOWUP_FORM_IDS | audit.U16_FORM_IDS | audit.U17_FORM_IDS | audit.U18_FORM_IDS | audit.U19_FORM_IDS | audit.U20_FORM_IDS))
        with patch.object(audit,'ROOT',self.root):
            for fact in facts:
                p={'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact U21 absence','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                original={'wordId':p['id'],'word':fact['word'],'pos':'n./v.','status':'draft'}
                row=copy.deepcopy(original);self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual({k:v for k,v in row.items() if k!='verbForms'},original)
                for existing in [None,{'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError):audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong=copy.deepcopy(p);wrong['after']['verbForms'][field]='unverified'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                wrong=copy.deepcopy(p);wrong['before']={}
                with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)
                for identity in ['W000862','W000717','W000639','W999999']:
                    wrong=copy.deepcopy(p);wrong['id']=identity
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(wrong)

    def test_followup_pending_homographs_and_duplicate_identities_cannot_be_written(self):
        p = self.form_patch()
        p['id'] = 'W000139'  # can remains pending, not an allowlisted word.
        self.assert_rejected_without_write({**self.manifest,'patches':[p]})
        audit.write_json(self.data / 'examples.json',[self.row,self.row])
        self.assert_rejected_without_write(self.manifest)

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

    def test_each_translation_requires_its_own_exact_source_and_cannot_expand_scope(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual(len(facts), 9)
        self.assertEqual({f['exampleId'] for f in facts}, audit.TRANSLATION_IDS)
        for fact in facts:
            p = {'dataset':'examples','key':'exampleId','id':fact['exampleId'],
                 'before':{'sentenceEn':fact['sentenceEn'],'sentenceZh':fact['before']},
                 'after':{'sentenceZh':fact['after']},'reason':fact['reason'],'evidence':fact['evidence']}
            with patch.object(audit,'ROOT',self.root):
                audit.validate_patch_shape(p)
                row = {'exampleId':p['id'],**p['before'],'blankSentence':'preserve exact cloze','answer':'preserve answer'}
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual(row['blankSentence'],'preserve exact cloze')
                self.assertEqual(row['answer'],'preserve answer')
                for field in ['sentenceEn','sentenceZh']:
                    changed = copy.deepcopy(p);changed['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed = copy.deepcopy(p);changed['after']['sentenceZh'] = 'unrecorded'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed = copy.deepcopy(p);changed['id'] = 'EXoutside_scope'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)


    def test_u18_translation_requires_its_own_exact_source_and_cannot_expand_scope(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U18-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual(len(facts), 2)
        self.assertEqual({f['exampleId'] for f in facts}, audit.U18_TRANSLATION_IDS)
        for fact in facts:
            p = {'dataset':'examples','key':'exampleId','id':fact['exampleId'],
                 'before':{'sentenceEn':fact['sentenceEn'],'sentenceZh':fact['before']},
                 'after':{'sentenceZh':fact['after']},'reason':fact['reason'],'evidence':fact['evidence']}
            with patch.object(audit,'ROOT',self.root):
                audit.validate_patch_shape(p)
                row = {'exampleId':p['id'],**p['before'],'blankSentence':'preserve exact cloze','answer':'preserve answer'}
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertEqual(row['blankSentence'],'preserve exact cloze')
                self.assertEqual(row['answer'],'preserve answer')
                for field in ['sentenceEn','sentenceZh']:
                    changed = copy.deepcopy(p);changed['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed = copy.deepcopy(p);changed['after']['sentenceZh'] = 'unrecorded'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
                changed = copy.deepcopy(p);changed['id'] = 'EXoutside_scope'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)


    def test_note_content_is_limited_to_one_exact_duplicate_translation(self):
        fact=audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-NOTE-SOURCES.json')['facts'][0]
        p={'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
        with patch.object(audit,'ROOT',self.root):
            audit.validate_patch_shape(p)
            row={'noteId':fact['noteId'],**copy.deepcopy(fact['before'])}
            self.assertTrue(audit.apply_to_row(row,p));self.assertFalse(audit.apply_to_row(row,p))
            self.assertEqual({k:v for k,v in row.items() if k!='content'},{k:v for k,v in {'noteId':fact['noteId'],**fact['before']}.items() if k!='content'})
            for field in ['word','noteType','title','status','content']:
                changed=copy.deepcopy(p);changed['before'][field]='unrecorded'
                with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
            changed=copy.deepcopy(p);changed['after']['content']='Different English or Chinese'
            with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
            changed=copy.deepcopy(p);changed['id']='NXunknown'
            with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
            changed=copy.deepcopy(p);changed['after']['status']='reviewed'
            with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)
            changed=copy.deepcopy(p);changed.update(dataset='examples',key='exampleId')
            with self.assertRaises(AssertionError):audit.validate_patch_shape(changed)

    def test_integrated_u05_u06_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U05-U06-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 45)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U05_U06_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u07_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U07-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 36)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U07_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u08_u09_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U08-U09-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 49)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U08_U09_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u10_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U10-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 26)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U10_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u11_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U11-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 25)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U11_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u12_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U12-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 28)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U12_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u13_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U13-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 19)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U13_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u14_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U14-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 18)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U14_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_integrated_u15_forms_preserve_exact_non_form_rows_and_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U15-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 22)
        self.assertEqual({f['wordId'] for f in facts}, audit.INTEGRATED_U15_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(next(w for w in self.integrated_words if w['wordId'] == fact['wordId']))
                original.pop('verbForms', None)
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact reconciled field','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                for field in ['word', 'pos', 'status', 'meaningZh', 'meaningEn', 'usagePattern']:
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'], 'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original, 'verbForms':existing}, p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_u22_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U22-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 17)
        self.assertEqual({f['wordId'] for f in facts}, audit.U22_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced U22 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000717']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_u22_translation_is_limited_to_exact_unchanged_source_and_one_chinese_string(self):
        fact = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U22-TRANSLATION-SOURCES.json')['facts'][0]
        p = {'dataset':'examples','key':'exampleId','id':fact['exampleId'],'before':fact['before'],'after':fact['after'],'reason':'Verified shirt precision','evidence':'shirt dictionary and exact source image'}
        with patch.object(audit,'ROOT',self.root):
            audit.validate_patch_shape(p)
            row = copy.deepcopy(fact['before'])
            self.assertTrue(audit.apply_to_row(row,p))
            self.assertFalse(audit.apply_to_row(row,p))
            for field in ['word','sentenceEn','blankSentence','answer']:
                bad_row = copy.deepcopy(row); bad_row[field] = 'changed'
                with self.assertRaises(AssertionError): audit.apply_to_row(bad_row,p)
                bad = copy.deepcopy(p); bad['before'][field] = 'changed'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(bad)
            for bad_id in ['EXunknown','EX51e703b4']:
                bad = copy.deepcopy(p); bad['id'] = bad_id
                with self.assertRaises(AssertionError): audit.validate_patch_shape(bad)
            bad = copy.deepcopy(p); bad['after']['sentenceZh'] = 'unverified'
            with self.assertRaises(AssertionError): audit.validate_patch_shape(bad)

    def test_u23_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U23-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 23)
        self.assertEqual({f['wordId'] for f in facts}, audit.U23_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced U23 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_u24_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U24-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 7)
        self.assertEqual({f['wordId'] for f in facts}, audit.U24_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced U24 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_u23_translations_reject_unverified_text_and_immutable_source_drift(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U23-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual({f['exampleId'] for f in facts}, audit.U23_TRANSLATION_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'examples','key':'exampleId','id':fact['exampleId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence'][0]['url']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in ['word','sentenceEn','blankSentence','answer']:
                    bad = copy.deepcopy(row); bad[field] = 'changed'
                    with self.assertRaises(AssertionError): audit.apply_to_row(bad,p)
                    bad = copy.deepcopy(p); bad['before'][field] = 'changed'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(bad)
                bad = copy.deepcopy(p); bad['after']['sentenceZh'] = 'unverified'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(bad)
                bad = copy.deepcopy(p); bad['id'] = 'EXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(bad)

    def test_u24_flat_note_all_immutable_guards_and_exact_content(self):
        fact = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U24-NOTE-SOURCES.json')['facts'][0]
        p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
        with patch.object(audit,'ROOT',self.root):
            audit.validate_patch_shape(p)
            row = copy.deepcopy(fact['before'])
            self.assertTrue(audit.apply_to_row(row,p))
            self.assertFalse(audit.apply_to_row(row,p))
            for field in ['word','title','noteType','status','noteId']:
                wrong = copy.deepcopy(row); wrong[field] = 'changed'
                with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                wrong = copy.deepcopy(p); wrong['before'][field] = 'changed'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            for field in ['word','status','content']:
                wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
            with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_u25_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-U25-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 24)
        self.assertEqual({f['wordId'] for f in facts}, audit.U25_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced U25 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u27_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U27-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 20)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U27_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U27 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u27_notes_title_exception_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U27-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 8)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U27_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u28_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U28-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 17)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U28_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U28 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u28_notes_title_exception_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U28-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 3)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U28_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u29_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U29-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 22)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U29_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U29 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u29_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U29-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 2)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U29_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u29_translation_exact_source_and_chinese_only(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U29-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual({f['exampleId'] for f in facts}, audit.LV2_U29_TRANSLATION_IDS)
        self.assertEqual(len(facts), 1)
        with patch.object(audit, 'ROOT', self.root):
            f = facts[0]
            p = {'dataset':'examples','key':'exampleId','id':f['exampleId'],'before':f['before'],'after':f['after'],'reason':f['reason'],'evidence':f['evidence'][0]['url']}
            audit.validate_patch_shape(p)
            row = {'exampleId':p['id'], **copy.deepcopy(f['before']), 'status':'reviewed','sensePos':'v.'}
            self.assertTrue(audit.apply_to_row(row,p))
            self.assertFalse(audit.apply_to_row(row,p))
            for field in ['word','sentenceEn','blankSentence','answer']:
                wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            for field in ['sentenceZh','sentenceEn','status','sensePos']:
                wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            wrong = copy.deepcopy(p); wrong['id'] = 'EXunknown'
            with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u30_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U30-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 17)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U30_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U30 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u30_notes_exact_title_exception_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U30-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 4)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U30_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u30_translation_exact_source_and_chinese_only(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U30-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual({f['exampleId'] for f in facts}, audit.LV2_U30_TRANSLATION_IDS)
        self.assertEqual(len(facts), 1)
        with patch.object(audit, 'ROOT', self.root):
            f = facts[0]
            p = {'dataset':'examples','key':'exampleId','id':f['exampleId'],'before':f['before'],'after':f['after'],'reason':f['reason'],'evidence':f['evidence'][0]['url']}
            audit.validate_patch_shape(p)
            row = {'exampleId':p['id'], **copy.deepcopy(f['before']), 'status':'reviewed','sensePos':'n.'}
            self.assertTrue(audit.apply_to_row(row,p))
            self.assertFalse(audit.apply_to_row(row,p))
            for field in ['word','sentenceEn','blankSentence','answer']:
                wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            for field in ['sentenceZh','sentenceEn','status','sensePos']:
                wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            wrong = copy.deepcopy(p); wrong['id'] = 'EXunknown'
            with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u31_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U31-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 19)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U31_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U31 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u31_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U31-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 7)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U31_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u32_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U32-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 16)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U32_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U32 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u32_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U32-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 1)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U32_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u32_translation_exact_full_row_and_chinese_only(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U32-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual(len(facts), 1)
        self.assertEqual({f['exampleId'] for f in facts}, audit.LV2_U32_TRANSLATION_IDS)
        with patch.object(audit, 'ROOT', self.root):
            f = facts[0]
            p = {'dataset':'examples','key':'exampleId','id':f['exampleId'],'before':f['before'],'after':f['after'],'reason':f['reason'],'evidence':f['evidence']}
            audit.validate_patch_shape(p)
            row = copy.deepcopy(f['before'])
            self.assertTrue(audit.apply_to_row(row,p))
            self.assertFalse(audit.apply_to_row(row,p))
            for field in f['before']:
                if field in f['after']: continue
                wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            for field in ['sentenceZh','sentenceEn','status','sensePos']:
                wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            wrong = copy.deepcopy(p); wrong['id'] = 'EXunknown'
            with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u33_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U33-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 9)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U33_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U33 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u33_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U33-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 6)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U33_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u33_translation_exact_full_row_and_chinese_only(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U33-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual(len(facts), 1)
        self.assertEqual({f['exampleId'] for f in facts}, audit.LV2_U33_TRANSLATION_IDS)
        with patch.object(audit, 'ROOT', self.root):
            f = facts[0]
            p = {'dataset':'examples','key':'exampleId','id':f['exampleId'],'before':f['before'],'after':f['after'],'reason':f['reason'],'evidence':f['evidence']}
            audit.validate_patch_shape(p)
            row = copy.deepcopy(f['before'])
            self.assertTrue(audit.apply_to_row(row,p))
            self.assertFalse(audit.apply_to_row(row,p))
            for field in f['before']:
                if field in f['after']: continue
                wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            for field in ['sentenceZh','sentenceEn','status','sensePos']:
                wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
            wrong = copy.deepcopy(p); wrong['id'] = 'EXunknown'
            with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u34_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U34-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 13)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U34_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U34 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u34_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U34-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 6)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U34_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u35_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U35-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 20)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U35_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U35 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u35_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U35-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 8)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U35_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u35_translation_exact_full_row_and_chinese_only(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U35-TRANSLATION-SOURCES.json')['facts']
        self.assertEqual(len(facts), 2)
        self.assertEqual({f['exampleId'] for f in facts}, audit.LV2_U35_TRANSLATION_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for f in facts:
                p = {'dataset':'examples','key':'exampleId','id':f['exampleId'],'before':f['before'],'after':f['after'],'reason':f['reason'],'evidence':f['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(f['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in f['before']:
                    if field in f['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['sentenceZh','sentenceEn','status','sensePos']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'EXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u36_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U36-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 11)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U36_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U36 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u36_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U36-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 8)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U36_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u37_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U37-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 15)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U37_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U37 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u37_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U37-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 8)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U37_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u38_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U38-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 14)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U38_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U38 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u38_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U38-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 7)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U38_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u39_forms_exact_scope_non_form_guards_and_true_absence(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U39-VERB-FORMS-SOURCES.json')['facts']
        self.assertEqual(len(facts), 16)
        self.assertEqual({f['wordId'] for f in facts}, audit.LV2_U39_FORM_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                original = copy.deepcopy(fact['nonFormRow'])
                p = {'dataset':'words','key':'wordId','id':fact['wordId'],'before':{'verbForms':{'$absent':True}},'after':{'verbForms':fact['verbForms']},'reason':'Exact sourced LV2 U39 form','evidence':fact['verbForms']['sourceRef']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(original)
                self.assertTrue(audit.apply_to_row(row, p))
                self.assertFalse(audit.apply_to_row(row, p))
                self.assertEqual({k:v for k,v in row.items() if k != 'verbForms'}, original)
                del row['verbForms']
                self.assertEqual(row, original)
                for field in ['word','pos','status','meaningZh','meaningEn','usagePattern']:
                    wrong = copy.deepcopy(original); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong, p)
                for existing in [None, {'base':fact['word'],'past':'custom'}]:
                    with self.assertRaises(AssertionError): audit.apply_to_row({**original,'verbForms':existing},p)
                for field in ['base','past','pastParticiple','sourceRef','status']:
                    wrong = copy.deepcopy(p); wrong['after']['verbForms'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for identity in ['W999999','W000139','W000397']:
                    wrong = copy.deepcopy(p); wrong['id'] = identity
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['before'] = {}
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)

    def test_lv2_u39_notes_content_only_is_exact_and_every_other_field_is_guarded(self):
        facts = audit.read(self.root / 'docs/unit-audit-20261105/VERIFIED-LV2-U39-NOTE-SOURCES.json')['facts']
        self.assertEqual(len(facts), 6)
        self.assertEqual({f['noteId'] for f in facts}, audit.LV2_U39_NOTE_IDS)
        with patch.object(audit, 'ROOT', self.root):
            for fact in facts:
                p = {'dataset':'notes','key':'noteId','id':fact['noteId'],'before':fact['before'],'after':fact['after'],'reason':fact['reason'],'evidence':fact['evidence']}
                audit.validate_patch_shape(p)
                row = copy.deepcopy(fact['before'])
                self.assertTrue(audit.apply_to_row(row,p))
                self.assertFalse(audit.apply_to_row(row,p))
                for field in fact['before']:
                    if field in fact['after']: continue
                    wrong = copy.deepcopy(row); wrong[field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
                    wrong = copy.deepcopy(p); wrong['before'][field] = 'unrecorded'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                for field in ['title','content','status','noteType','word']:
                    wrong = copy.deepcopy(p); wrong['after'][field] = 'unverified'
                    with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)
                wrong = copy.deepcopy(p); wrong['id'] = 'NXunknown'
                with self.assertRaises(AssertionError): audit.validate_patch_shape(wrong)


    def test_lv2_u39_speed_usage_followup_keeps_exact_full_row_and_identity(self):
        p = audit.read(audit.ROOT / 'docs/unit-audit-20261105/LV2-U39-speed-usage-followup.json')['patches'][0]
        self.assertEqual(p['id'], 'W001833')
        self.assertEqual(set(p['after']), {'usagePatternZh'})
        self.assertEqual(len(p['before']['usagePatternZh'].split('；')), 5)
        self.assertEqual(len(p['after']['usagePatternZh'].split('；')), 3)
        row = copy.deepcopy(p['before'])
        audit.validate_patch_shape(p)
        self.assertTrue(audit.apply_to_row(row,p))
        self.assertFalse(audit.apply_to_row(row,p))
        for field in p['before']:
            if field in p['after']: continue
            wrong = copy.deepcopy(p['before']); wrong[field] = 'unrecorded'
            with self.assertRaises(AssertionError): audit.apply_to_row(wrong,p)
        wrong = copy.deepcopy(p); wrong['id'] = 'W999999'
        with self.assertRaises(AssertionError): audit.apply_to_row(copy.deepcopy(p['before']),wrong)

if __name__ == "__main__":
    unittest.main()
