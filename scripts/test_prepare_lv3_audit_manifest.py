"""Small tests for kind-specific scopes, checkpoint selection, and proposal preparation."""
import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import lv3_audit_pipeline as p
import prepare_lv3_audit_manifest as builder


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='lv3-builder-small-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.path = 'src/features/direct/curriculumLV3Unit4.json'
        self.row = {'learningItemId':'LI-LV3U04-V001','kind':'vocabulary','sensePos':'n.',
                    'targetMeaningZh':'old','review':'source_checked_text_only','practiceMode':'read_only'}
        self.template = {'templateId':'TEXTBOOK-LV3-U04','level':'LV3','unit':4}
        self.data = {self.path:{'template':self.template,'learningItems':[self.row]},
                     'public/data/v1/meta.json':{},'public/data/v1/sa-pack.json':{'meta':{}}}
        for path,value in self.data.items():
            p.v1.dump(self.root/path,value)
        p.v1.dump(self.root/p.DOCS/'LV3-ledger.json',{'units':[{'unit':4,'source':self.path}]})
        self.capture = {path:p.v1.file_hash(self.root/path) for path in self.data}
        self.item = {'dataset':'curriculum','path':self.path,'key':'learningItemId','id':'LI-LV3U04-V001',
                     'field':'targetMeaningZh','beforePresent':True,'beforeValue':'old','afterValue':'new',
                     'reason':'verified test','sources':[{'url':'https://example.com/source'}],
                     'originFindingIds':['test-1'],'beforeRow':copy.deepcopy(self.row)}
        self.accepted = {'unit':'LV3 U04','proposals':[self.item],'beforeRows':{}}
        self.parent = ({'unit':'LV3-U02','status':'committed','manifestHash':'a'*64},
                       {'unit':'LV3-U02'},None)

    def compile(self, accepted=None, capture=None):
        with patch.object(p.v1,'input_paths',return_value=set(self.data)), \
             patch.object(p,'load_chain',return_value=({}, {}, [self.parent])), \
             patch.object(p,'verify_checkpoint') as verify:
            result=builder.compile_candidate(self.root,'LV3-U04',accepted or self.accepted,
                                             self.capture if capture is None else capture)
            verify.assert_called_once()
            return result

    def test_pending_only_with_exact_parent_and_full_before(self):
        before={f:f.read_bytes() for f in self.root.rglob('*') if f.is_file()}
        m,s,fixtures,summary=self.compile()
        self.assertEqual(m['parentManifestHash'],'a'*64)
        self.assertEqual(m['patches'][0]['before'],self.row)
        self.assertEqual(m['readiness'],'pending_independent_before_capture')
        self.assertIsNone(m['afterMeta'])
        self.assertEqual(summary['fieldCount'],1)
        self.assertEqual(fixtures,{})
        self.assertEqual({f:f.read_bytes() for f in self.root.rglob('*') if f.is_file()},before)

    def test_vocabulary_meaning_source_enum_and_grammar_isolation(self):
        for value,valid in [('textbook_source_review',True),('textbook_and_dictionary_review',True),
                            ('textbook_transcription',False)]:
            a=copy.deepcopy(self.accepted);a['proposals'][0].update(field='meaningSource',beforePresent=False,
                beforeValue=None,afterValue=value)
            if valid:self.compile(a)
            else:
                with self.assertRaisesRegex(ValueError,'meaning source'):self.compile(a)
        a=copy.deepcopy(self.accepted);a['proposals'][0].update(field='explanationZh',beforePresent=False,
                beforeValue=None,afterValue='no vocabulary explanation expansion')
        with self.assertRaisesRegex(ValueError,'Disallowed after'):self.compile(a)

    def test_duplicate_noop_incomplete_before_and_private_sources_reject(self):
        for mode in ['duplicate','noop','before','source','protected']:
            a=copy.deepcopy(self.accepted)
            if mode=='duplicate':a['proposals'].append(copy.deepcopy(a['proposals'][0]))
            elif mode=='noop':a['proposals'][0]['afterValue']='old'
            elif mode=='before':del a['proposals'][0]['beforeRow']['review']
            elif mode=='source':a['proposals'][0]['sources']=[{'path':'C:/Users/private/photo.jpg'}]
            else:a['proposals'][0].update(field='review',beforeValue='source_checked_text_only',afterValue='approved')
            with self.subTest(mode=mode),self.assertRaises(ValueError):self.compile(a)

    def test_capture_domain_and_values_are_not_relaxed(self):
        broad={**self.capture,'unrelated-image.png':'0'*64}
        with self.assertRaisesRegex(ValueError,'exact pipeline input domain'):self.compile(capture=broad)
        wrong={**self.capture,self.path:'0'*64}
        with self.assertRaisesRegex(ValueError,'capture drift'):self.compile(capture=wrong)

    def test_grammar_rejects_vocabulary_fields_even_with_exact_scope(self):
        self.row['kind']='grammar'
        self.row['learningItemId']='LI-LV3U04-G001'
        self.item['id']=self.row['learningItemId']
        p.v1.dump(self.root/self.path,{'template':self.template,'learningItems':[self.row]})
        self.capture[self.path]=p.v1.file_hash(self.root/self.path)
        self.item['beforeRow']=copy.deepcopy(self.row)
        with self.assertRaisesRegex(ValueError,'Disallowed after'):self.compile()

    def test_options_aggregate_leaf_overlap_rejects_both_orders(self):
        row={'questionId':'Q4','answer':'A','options':[{'id':x,'text':x,'rationaleZh':'why'} for x in 'ABCD']}
        self.data[self.path]['grammarQuestions']=[row]
        p.v1.dump(self.root/self.path,self.data[self.path])
        self.capture[self.path]=p.v1.file_hash(self.root/self.path)
        base={**self.item,'dataset':'grammarQuestions','key':'questionId','id':'Q4','beforeRow':row}
        aggregate={**base,'field':'options','beforeValue':copy.deepcopy(row['options']),
                   'afterValue':copy.deepcopy(row['options'])}
        aggregate['afterValue'][1]['text']='aggregate B'
        leaf={**base,'field':'options[id=B].text','beforeValue':'B','afterValue':'leaf B'}
        for proposals in [[aggregate,leaf],[leaf,aggregate]]:
            with self.assertRaisesRegex(ValueError,'Overlapping aggregate'):
                self.compile({'unit':'LV3-U04','proposals':proposals})

    def test_wrong_unit_document_and_remapped_ledger_reject(self):
        for key,value in [('templateId','TEXTBOOK-LV3-U05'),('level','LV2'),('unit',5)]:
            bad=copy.deepcopy(self.data[self.path]);bad['template'][key]=value
            p.v1.dump(self.root/self.path,bad);self.capture[self.path]=p.v1.file_hash(self.root/self.path)
            with self.assertRaisesRegex(ValueError,'template mismatch'):self.compile()
        bad=copy.deepcopy(self.data[self.path]);bad['learningItems'][0]['learningItemId']='LI-LV3U05-V001'
        p.v1.dump(self.root/self.path,bad);self.capture[self.path]=p.v1.file_hash(self.root/self.path)
        a=copy.deepcopy(self.accepted);a['proposals'][0].update(id='LI-LV3U05-V001',beforeRow=bad['learningItems'][0])
        with self.assertRaisesRegex(ValueError,'namespace mismatch'):self.compile(a)
        other='src/features/direct/curriculumLV3Unit5.json'
        p.v1.dump(self.root/other,bad)
        p.v1.dump(self.root/p.DOCS/'LV3-ledger.json',{'units':[{'unit':4,'source':other}]})
        with self.assertRaisesRegex(ValueError,'path mismatch'):self.compile(a)

    def test_application_rejects_rehashed_wrong_unit_and_namespace(self):
        m,scope,_,_=self.compile()
        for mode in ['template','namespace']:
            bad=copy.deepcopy(self.data[self.path]);manifest=copy.deepcopy(m);scoped=copy.deepcopy(scope)
            if mode=='template':bad['template']['unit']=5
            else:
                bad['learningItems'][0]['learningItemId']='LI-LV3U05-V001'
                manifest['patches'][0]['id']='LI-LV3U05-V001'
                manifest['patches'][0]['before']=copy.deepcopy(bad['learningItems'][0])
                scoped['rows'][0]['id']='LI-LV3U05-V001'
                scoped['rows'][0]['beforeHash']=p.sha(bad['learningItems'][0])
                manifest['scopeHash']=p.sha(scoped)
            manifest['files'][self.path]['beforeHash']=p.sha(bad)
            with self.assertRaisesRegex(ValueError,'template mismatch|namespace mismatch'):
                p.prepare_step(manifest,{self.path:bad},scoped)

    def test_concurrent_parent_change_rejects(self):
        next_parent=copy.deepcopy(self.parent);next_parent[0]['manifestHash']='b'*64
        with patch.object(p.v1,'input_paths',return_value=set(self.data)), \
             patch.object(p,'load_chain',side_effect=[({}, {}, [self.parent]),({}, {}, [next_parent])]), \
             patch.object(p,'verify_checkpoint'):
            with self.assertRaisesRegex(ValueError,'Concurrent parent chain'):
                builder.compile_candidate(self.root,'LV3-U04',self.accepted,self.capture)

    def test_latest_v2_checkpoint_does_not_use_u01_anchor(self):
        # A no-tail projection must check the target head, not the old U01 map.
        with patch.object(p,'load_chain',return_value=({}, {'inputs':{'wrong-u01': '0'*64}},[self.parent])), \
             patch.object(p,'known_state',return_value='after') as state, \
             patch.object(p,'verify_inputs') as verify, \
             patch.object(p.v1,'input_paths',return_value=set()):
            target=self.root/'projected'
            p.project_checkpoint(self.root,target,'LV3-U02')
            self.assertEqual(state.call_count,2)
            self.assertEqual(verify.call_count,2)
        with patch.object(p,'known_state',return_value='before'):
            with self.assertRaisesRegex(ValueError,'checkpoint after'):
                p.verify_checkpoint(self.root,{'unit':'LV3-U02'},{'inputs':{}})


if __name__=='__main__':
    unittest.main(verbosity=2)
