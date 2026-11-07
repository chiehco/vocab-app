"""Small shared Python/TypeScript v2 forms regression cases; no product IO."""
import json
from pathlib import Path
import unittest
import lv3_audit_pipeline as p

class WageFormsTests(unittest.TestCase):
    def test_shared_cases_through_manifest_guard(self):
        cases=json.loads((Path(__file__).parent/'fixtures/lv3_wage_forms_cases.json').read_text(encoding='utf-8'))
        for case in cases:
            q=case['patch']; path=q['path']
            # Recompute all scope hashes so rejection exercises the forms guard.
            q['before']['wordId']=q['id']
            cols={'words':{'path':path,'key':'wordId','rowsField':None}}
            scope={'schemaVersion':1,'unit':'LV3-U05','baseline':p.v1.BASELINE,'collections':cols,
                   'rows':[{'dataset':'words','id':q['id'],'beforeHash':p.sha(q['before']),'after':q['after']}]}
            m={'schemaVersion':2,'unit':'LV3-U05','baseline':p.v1.BASELINE,'parentManifestHash':'0'*64,
               'readiness':'pending_independent_before_capture','scope':'U05-scope.json','scopeHash':p.sha(scope),
               'collections':cols,'files':{path:{k:'0'*64 for k in ['beforeHash','afterHash','beforeByteHash','afterByteHash']}},
               'patches':[q],'unchangedInputs':{},'derivedBefore':{},'beforeMeta':{},'beforePackMeta':{},'derivedAfter':None,'afterMeta':None}
            with self.subTest(case=case['name']):
                if case['valid']:p.validate_manifest(m,scope)
                else:
                    with self.assertRaises(ValueError):p.validate_manifest(m,scope)

if __name__=='__main__':unittest.main()
