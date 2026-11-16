from pathlib import Path
import copy,json,unittest
import lv3_audit_pipeline as p
from test_lv3_u20_source_contract import source_manifest,rescope
ROOT=Path(__file__).resolve().parents[1]
FROZEN=p.read_json(ROOT/'scripts/fixtures/lv3-u20-pattern-contract-test.json')['patches']
class U20PatternContractTests(unittest.TestCase):
 def manifest(self):
  m,_=source_manifest();path='src/features/direct/curriculumLV3Unit20.json'
  m['collections']['curriculum']={'path':path,'key':'learningItemId','rowsField':'learningItems'}
  m['files'][path]={'beforeHash':'1'*64,'afterHash':'2'*64,'beforeByteHash':'3'*64,'afterByteHash':'4'*64}
  m['patches'].extend(copy.deepcopy(FROZEN));return m,rescope(m)
 def test_exact_three_pattern_fields(self):
  m,s=self.manifest();p.validate_manifest(m,s)
  self.assertEqual({x['id'] for x in FROZEN},{'LI-LV3U20-G023','LI-LV3U20-G051','LI-LV3U20-G055'})
  for q in FROZEN:self.assertEqual(set(q['after']),{'pattern'});self.assertTrue(p.verified_u20_pattern_patch(m,q))
 def test_mutated_complete_patch_rejected_even_after_rescope(self):
  for idx in range(3):
   for field,value in [('id','LI-LV3U20-G001'),('reason','changed'),('evidence',[]),('before',{}),('after',{'pattern':'unreviewed'}),('fieldEvidence',{})]:
    with self.subTest(idx=idx,field=field):
     m,_=self.manifest();m['patches'][idx+1][field]=value
     # The accepted patches may have no evidence URLs; mutate to a definitely different list.
     if field=='evidence':m['patches'][idx+1][field]=['https://example.invalid/unreviewed']
     with self.assertRaises((ValueError,KeyError,TypeError)):p.validate_manifest(m,rescope(m))
 def test_added_explanation_and_wrong_unit_are_not_allowed(self):
  for q in FROZEN:
   changed=copy.deepcopy(q);changed['after']['explanationZh']='unreviewed'
   self.assertFalse(p.verified_u20_pattern_patch({'unit':'LV3-U20'},changed))
   self.assertFalse(p.verified_u20_pattern_patch({'unit':'LV3-U21'},q))
 def test_reserved_id_cannot_be_disguised_as_explanation_only(self):
  m,_=self.manifest();q=m['patches'][1];q['after']={'explanationZh':'unreviewed'};q['fieldEvidence']={'explanationZh':[{'sources':['test']}]}
  with self.assertRaises(ValueError):p.validate_manifest(m,rescope(m))
 def test_numeric_boolean_evidence_is_rejected(self):
  q=copy.deepcopy(FROZEN[0]);q['fieldEvidence']['pattern'][0]['beforePresent']=1
  self.assertFalse(p.verified_u20_pattern_patch({'unit':'LV3-U20'},q))
 def test_exact_six_file_shape(self):
  from verify_lv3_unit_fixture import fixture_expected_write_paths
  paths={'public/data/v1/words.json','public/data/v1/examples.json','src/features/direct/curriculumLV3Unit20.json','scripts/sources/LV3Unit20.json'}
  m={'unit':'LV3-U20','files':dict.fromkeys(paths),'derivedAfter':dict.fromkeys(p.DERIVED)}
  self.assertEqual(fixture_expected_write_paths(m),paths|p.DERIVED)
  for bad in ['public/data/v1/notes.json','scripts/sources/LV3Unit19.json']:
   altered=copy.deepcopy(m);altered['files'][bad]={}
   with self.assertRaises(ValueError):fixture_expected_write_paths(altered)
if __name__=='__main__':unittest.main()
