from pathlib import Path
import copy,json,unittest,tempfile
import lv3_audit_pipeline as p
import verify_lv3_unit_fixture as fixture
ROOT=Path(__file__).resolve().parents[1]
class U18SourceContractTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=p.read_json(ROOT/p.DOCS/'U18-patches.json');cls.scope=p.read_json(ROOT/p.DOCS/'U18-scope.json')
 def documents_before_u18(self,overrides=None):
  # Authenticate complete current documents, then reverse only committed successors.
  # U19/U20 may share global files; undoing U18 alone cannot recreate its checkpoint.
  chain=p.read_json(ROOT/p.CHAIN)
  entries=[entry for entry in chain['entries'] if entry['status']=='committed']
  indices=[i for i,entry in enumerate(entries) if entry.get('unit')=='LV3-U18']
  self.assertEqual(len(indices),1)
  previous=p.sha(self.manifest)
  self.assertEqual(previous,p._U19_PARENT_MANIFEST_HASH,'Frozen U18 manifest anchor drift')
  self.assertEqual(entries[indices[0]]['path'],'U18-patches.json')
  self.assertEqual(entries[indices[0]]['manifestHash'],previous)
  successors=[]
  for entry in entries[indices[0]+1:]:
   manifest=p.read_json(p.safe_path(ROOT,p.DOCS+'/'+entry['path']))
   self.assertEqual(manifest['unit'],entry['unit'])
   self.assertEqual(manifest['parentManifestHash'],previous)
   digest=p.sha(manifest);self.assertEqual(digest,entry['manifestHash'])
   scope=p.read_json(p.safe_path(ROOT,p.DOCS+'/'+manifest['scope']))
   self.assertEqual(p.sha(scope),manifest['scopeHash'])
   successors.append((entry,manifest,scope));previous=digest
  paths=set(self.manifest['files'])
  for _,manifest,_ in successors:
   p.require(not p.media_migration.is_migration(manifest),'Unsupported migration successor in U18 source fixture')
   paths.update(manifest['files'])
  documents={path:p.read_json(ROOT/path) for path in paths}
  if overrides:
   p.require(set(overrides)<=paths,'Unknown U18 fixture override path')
   documents.update(copy.deepcopy(overrides))
  for _,manifest,scope in reversed(successors):
   current={path:documents[path] for path in manifest['files']}
   documents.update(p.inverse_step(manifest,current,scope))
  return p.inverse_step(self.manifest,{path:documents[path] for path in self.manifest['files']},self.scope)
 def test_historical_fixture_rejects_unrecorded_later_values_and_order(self):
  path='public/data/v1/words.json';original=p.read_json(ROOT/path)
  changed=copy.deepcopy(original);changed[-1]['meaningZh']='unrecorded later value'
  for value in [changed,list(reversed(copy.deepcopy(original)))]:
   with self.subTest(kind='value' if value is changed else 'order'):
    with self.assertRaisesRegex(ValueError,'Unknown whole-file drift'):
     self.documents_before_u18({path:value})
  self.assertEqual(p.read_json(ROOT/path),original)
 def altered(self,change):
  m=copy.deepcopy(self.manifest);s=copy.deepcopy(self.scope);change(m,s);m['scopeHash']=p.sha(s);return m,s
 def reject(self,change):
  m,s=self.altered(change)
  with self.assertRaises((ValueError,KeyError,TypeError)):p.validate_manifest(m,s)
 def test_exact_source_contract(self):p.validate_manifest(self.manifest,self.scope)
 def test_domain_is_144_before_u18_145_at_u18_and146_from_u19(self):
  core=p.v1.input_paths(ROOT);self.assertEqual(len(core),144);self.assertEqual(p.unit_input_paths(ROOT,'LV3-U17'),core)
  self.assertEqual(p.unit_input_paths(ROOT,'LV3-U18'),core|{p._U18_SOURCE_PATH});self.assertEqual(p.unit_input_paths(ROOT,'LV3-U19'),core|{p._U18_SOURCE_PATH,p._U19_SOURCE_PATH})
 def test_source_collection_cannot_move_file(self):
  self.reject(lambda m,s:(m['collections']['source'].update(path='scripts/sources/LV3Unit19.json'),s['collections']['source'].update(path='scripts/sources/LV3Unit19.json')))
 def test_source_collection_cannot_switch_row_array(self):
  self.reject(lambda m,s:(m['collections']['source'].update(rowsField='headwords'),s['collections']['source'].update(rowsField='headwords')))
 def test_source_guard_cannot_be_rehashed(self):self.reject(lambda m,s:m['files'][p._U18_SOURCE_PATH].update(afterHash='0'*64))
 def test_exact_source_patch_rejects_each_mutated_dimension(self):
  source=next(x for x in self.manifest['patches'] if x['dataset']=='source')
  for key,value in [('id','LI-LV3U18-P189-wrong'),('path','scripts/sources/LV3Unit19.json'),('key','word'),('before',{}),('after',{'sourcePos':'v.'}),('fieldEvidence',{}),('reason','changed evidence')]:
   with self.subTest(key=key):q=copy.deepcopy(source);q[key]=value;self.assertFalse(p.verified_u18_source_patch(self.manifest,q))
 def test_source_missing_field_rejected_even_with_rescope(self):
  def change(m,s):
   x=next(x for x in m['patches'] if x['dataset']=='source');x['after'].pop('sourcePos');next(x for x in s['rows'] if x['dataset']=='source')['after']=copy.deepcopy(x['after'])
  self.reject(change)
 def test_source_extra_field_rejected_even_with_rescope(self):
  def change(m,s):
   x=next(x for x in m['patches'] if x['dataset']=='source');x['after']['sourcePage']=190;next(x for x in s['rows'] if x['dataset']=='source')['after']=copy.deepcopy(x['after'])
  self.reject(change)
 def test_source_cannot_be_granted_to_u19(self):self.reject(lambda m,s:(m.update(unit='LV3-U19'),s.update(unit='LV3-U19')))
 def test_identity_matrix_accepts_existing146_without_renaming(self):
  p.validate_curriculum_identity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',p.read_json(ROOT/'src/features/direct/curriculumLV3Unit18.json'))
 def test_identity_matrix_rejects_id_kind_page_order_or_count(self):
  d=p.read_json(ROOT/'src/features/direct/curriculumLV3Unit18.json')
  for field in ['learningItemId','kind','sourcePage']:
   x=copy.deepcopy(d);x['learningItems'][0][field]='unexpected'
   with self.assertRaises(ValueError):p.validate_curriculum_identity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',x)
  x=copy.deepcopy(d);x['learningItems'].reverse()
  with self.assertRaises(ValueError):p.validate_curriculum_identity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',x)
  for count in [145,147]:
   x=copy.deepcopy(d);x['learningItems']=x['learningItems'][:count] if count==145 else x['learningItems']+[copy.deepcopy(x['learningItems'][0])]
   with self.assertRaises(ValueError):p.validate_curriculum_identity('LV3-U18','src/features/direct/curriculumLV3Unit18.json',x)
 def test_exact_six_write_shape_without_notes_or_senses(self):
  m=copy.deepcopy(self.manifest);m['derivedAfter']={f:'0'*64 for f in p.DERIVED};self.assertEqual(fixture.fixture_expected_write_paths(m),set(m['files'])|p.DERIVED);self.assertEqual(len(fixture.fixture_expected_write_paths(m)),6)

 def admission(self):
  m=copy.deepcopy(self.manifest)
  previous={**m['unchangedInputs'],**m['derivedBefore'],**{path:g['beforeByteHash'] for path,g in m['files'].items()}}
  previous.pop(p._U18_SOURCE_PATH)
  anchor=p.read_json(ROOT/p.DOCS/'U01-checkpoint.json')['inputs']
  return [previous,anchor,{'unit':'LV3-U17','status':'committed'},m['parentManifestHash'],m]
 def test_admission_preserves144_and_adds_only145th_to_a_copy(self):
  args=self.admission();old=copy.deepcopy(args);out=p.admit_u18_source_before(*args)
  self.assertEqual(args,old);self.assertEqual(len(args[0]),144);self.assertEqual(len(out),145)
  self.assertEqual(set(out)-set(args[0]),{p._U18_SOURCE_PATH})
  self.assertEqual(out[p._U18_SOURCE_PATH],p._U18_SOURCE_GUARD['beforeByteHash'])
 def test_admission_rejects_parent_unit_status_hash_and_input_domain(self):
  changes=[lambda a:a[2].update(unit='LV3-U16'),lambda a:a[2].update(status='prepared'),
   lambda a:a.__setitem__(2,None),lambda a:a.__setitem__(3,'0'*64),
   lambda a:a[4].update(parentManifestHash='0'*64),lambda a:a[0].pop(next(iter(a[0]))),
   lambda a:a[0].update({'unregistered.json':'0'*64}),lambda a:a[0].update({p._U18_SOURCE_PATH:'0'*64}),
   lambda a:a[1].pop(next(iter(a[1])))]
  for index,change in enumerate(changes):
   with self.subTest(index=index):
    args=self.admission();change(args)
    with self.assertRaises(ValueError):p.admit_u18_source_before(*args)
 def test_admission_rejects_owner_file_rows_evidence_and_whole_guard(self):
  changes=[lambda m:m.update(unit='LV3-U19'),lambda m:m['collections']['source'].update(path='scripts/sources/LV3Unit19.json'),
   lambda m:m['collections']['source'].update(rowsField='headwords'),lambda m:m['collections']['source'].update(key='word'),
   lambda m:m['files'][p._U18_SOURCE_PATH].update(beforeByteHash='0'*64),lambda m:m['files'][p._U18_SOURCE_PATH].update(afterHash='0'*64),
   lambda m:next(x for x in m['patches'] if x['dataset']=='source')['fieldEvidence'].clear(),
   lambda m:next(x for x in m['patches'] if x['dataset']=='source').update(evidence=['https://example.com/unreviewed']),
   lambda m:next(x for x in m['patches'] if x['dataset']=='source').update(id='LI-LV3U18-P189-other'),
   lambda m:m['patches'].append(copy.deepcopy(next(x for x in m['patches'] if x['dataset']=='source'))),
   lambda m:m.update(patches=[x for x in m['patches'] if x['dataset']!='source'])]
  for index,change in enumerate(changes):
   with self.subTest(index=index):
    args=self.admission();change(args[4])
    with self.assertRaises(ValueError):p.admit_u18_source_before(*args)
 def test_source_whole_file_rejects_raw_root_photos_and_other_row_in_both_states(self):
  before=self.documents_before_u18()
  after=copy.deepcopy(before)
  for patch in self.manifest['patches']:
   col=self.manifest['collections'][patch['dataset']];rows=p.v1.rows(after[col['path']],col['rowsField'])
   next(r for r in rows if r.get(patch['key'])==patch['id']).update(copy.deepcopy(patch['after']))
  with tempfile.TemporaryDirectory(prefix='lv3-u18-source-guards-') as temporary:
   root=Path(temporary);source=root/p._U18_SOURCE_PATH
   for side,documents in [('before',before),('after',after)]:
    for path,document in documents.items():
     self.assertEqual(p.sha(document),self.manifest['files'][path][side+'Hash'])
     target=root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.serialize(document))
    self.assertEqual(p.known_state(root,self.manifest),side)
    original=source.read_bytes();root_drift=json.loads(original);root_drift['unrecordedSourceRoot']=True
    photos=json.loads(original);photos['photos'][0]['unrecordedPhotoField']=True
    other=json.loads(original);next(r for r in other['related'] if r['learningItemId']!='LI-LV3U18-P189-boast')['unrecordedOtherRow']=True
    for kind,content in [('raw',original+b' '),('root',p.serialize(root_drift)),('photos',p.serialize(photos)),('other_row',p.serialize(other))]:
     with self.subTest(side=side,kind=kind):
      source.write_bytes(content)
      with self.assertRaisesRegex(ValueError,'Unknown or mixed'):p.known_state(root,self.manifest)
      self.assertEqual(source.read_bytes(),content)
      source.write_bytes(original)

if __name__=='__main__':unittest.main()
