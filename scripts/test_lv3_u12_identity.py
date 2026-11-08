"""U12 original identities remain fixed; all older namespaces stay strict."""
import copy,json,unittest
from pathlib import Path
import lv3_audit_pipeline as p
F=json.loads((Path(__file__).parent/'fixtures/lv3_u12_identity_cases.json').read_text(encoding='utf8'))
class IdentityTests(unittest.TestCase):
    def test_complete_identity_matrix_cases(self):
        for case in F['cases']:
            with self.subTest(case=case['name']):
                doc=copy.deepcopy(F['document'])
                for m in case['mutations']:
                    owner=doc
                    for key in m['path'][:-1]:owner=owner[key]
                    owner[m['path'][-1]]=copy.deepcopy(m['value'])
                before=copy.deepcopy(doc)
                if case['valid']:p.validate_curriculum_identity('LV3-U12','src/features/direct/curriculumLV3Unit12.json',doc)
                else:
                    with self.assertRaises((ValueError,AssertionError)):p.validate_curriculum_identity('LV3-U12','src/features/direct/curriculumLV3Unit12.json',doc)
                self.assertEqual(doc,before)
    def test_wrong_path_and_other_unit_are_rejected(self):
        with self.assertRaises(ValueError):p.validate_curriculum_identity('LV3-U12','src/features/direct/curriculumLV3Unit13.json',F['document'])
        for n in [4,11,13,24]:
            doc={'template':{'templateId':f'TEXTBOOK-LV3-U{n:02}','level':'LV3','unit':n},'learningItems':[{'learningItemId':f'LI-LV3U{n:02}-V001','kind':'vocabulary'}]}
            p.validate_curriculum_identity(f'LV3-U{n:02}',f'src/features/direct/curriculumLV3Unit{n}.json',doc)
            doc['learningItems'][0]['learningItemId']=f'LI-LV3U{n:02}-P119-capture'
            with self.assertRaises(ValueError):p.validate_curriculum_identity(f'LV3-U{n:02}',f'src/features/direct/curriculumLV3Unit{n}.json',doc)
if __name__=='__main__':unittest.main()
