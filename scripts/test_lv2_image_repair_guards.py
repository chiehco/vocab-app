import copy
import json
import unittest
from pathlib import Path
from lv2_image_repair_guards import exact_published_image_expectation

class ExactLaterImageReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        cls.proof = json.loads((root/'docs/unit-audit-20261105/LV2-U38-U41-image-repairs.json').read_text(encoding='utf-8'))
        cls.building = json.loads((root/'docs/unit-audit-20261105/LV2-U44-building-image-repair.json').read_text(encoding='utf-8'))

    def test_building_changes_only_expected_hash_and_keeps_original_approval(self):
        p = self.building; original = copy.deepcopy(p['originalApproval'])
        result = exact_published_image_expectation(p['after'],original,self.proof,p)
        self.assertEqual(original,p['originalApproval'])
        self.assertEqual(result['publishedImageSha256'],p['replacementImageSha256'])
        result['publishedImageSha256'] = original['publishedImageSha256']
        self.assertEqual(result,original)

    def test_building_rejects_wrong_pair_approval_evidence_and_missing_later_proof(self):
        p = self.building
        for field in p['after']['illustration']:
            wrong = copy.deepcopy(p['after']); wrong['illustration'][field] = 'unverified'
            with self.assertRaises(AssertionError): exact_published_image_expectation(wrong,p['originalApproval'],self.proof,p)
        for field in p['after']:
            wrong = copy.deepcopy(p['after']); wrong[field] = 'unverified'
            with self.assertRaises(AssertionError): exact_published_image_expectation(wrong,p['originalApproval'],self.proof,p)
        for field in p['originalApproval']:
            wrong = copy.deepcopy(p['originalApproval']); wrong[field] = 'unverified'
            with self.assertRaises(AssertionError): exact_published_image_expectation(p['after'],wrong,self.proof,p)
        for part in ['before','after','originalApproval']:
            wrong = copy.deepcopy(p); wrong[part]['unrecorded'] = True
            with self.assertRaises(AssertionError): exact_published_image_expectation(p['after'],p['originalApproval'],self.proof,wrong)
        for part in ['assetCommit','originalImageSha256','replacementImageSha256','dimensions']:
            wrong = copy.deepcopy(p); wrong[part] = 'unverified'
            with self.assertRaises(AssertionError): exact_published_image_expectation(p['after'],p['originalApproval'],self.proof,wrong)
        # Omitting the later proof gives the original hash, never a broad new-image exemption.
        self.assertEqual(exact_published_image_expectation(p['after'],p['originalApproval'],self.proof)['publishedImageSha256'],p['originalImageSha256'])
        with self.assertRaises(AssertionError): exact_published_image_expectation(p['before'],p['originalApproval'],self.proof,p)

    def test_exact_pair_preserves_original_approval_and_uses_only_verified_image_hash(self):
        p = self.proof['playground']; original = copy.deepcopy(p['originalApproval'])
        result = exact_published_image_expectation(p['after'], original, self.proof)
        self.assertEqual(original, p['originalApproval'])
        self.assertEqual(result['publishedImageSha256'], p['replacementImageSha256'])
        del result['publishedImageSha256']; expected = copy.deepcopy(original); del expected['publishedImageSha256']
        self.assertEqual(result, expected)

    def test_rejects_changed_caption_path_identity_approval_and_tampered_evidence(self):
        p = self.proof['playground']
        for field in p['after']['illustration']:
            wrong = copy.deepcopy(p['after']); wrong['illustration'][field] = 'unverified'
            with self.assertRaises(AssertionError): exact_published_image_expectation(wrong,p['originalApproval'],self.proof)
        for field in p['originalApproval']:
            wrong = copy.deepcopy(p['originalApproval']); wrong[field] = 'unverified'
            with self.assertRaises(AssertionError): exact_published_image_expectation(p['after'],wrong,self.proof)
        for part in ['before','after','originalApproval']:
            wrong = copy.deepcopy(self.proof); wrong['playground'][part]['unrecorded'] = True
            with self.assertRaises(AssertionError): exact_published_image_expectation(p['after'],p['originalApproval'],wrong)
        with self.assertRaises(AssertionError): exact_published_image_expectation(p['before'],p['originalApproval'],self.proof)

    def test_unrelated_identity_keeps_original_expectation_without_broad_exception(self):
        card={'id':'LV1-U09-29'}; approval={'id':'LV1-U09-29','publishedImageSha256':'original','dimensions':[1254,1254]}
        result=exact_published_image_expectation(card,approval,{})
        self.assertEqual(result,approval);self.assertIsNot(result,approval)
        with self.assertRaises(AssertionError): exact_published_image_expectation({'id':'LV1-U09-28'},approval,{})

if __name__ == '__main__': unittest.main()
