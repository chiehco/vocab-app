import assert from 'node:assert/strict';
import {it} from 'vitest';
import fixture from '../../../scripts/fixtures/lv3_u12_identity_cases.json';
import {validateCurriculumIdentity} from './lv3Audit.testSupport';
for(const c of fixture.cases)it(c.name,()=>{
 const doc=structuredClone(fixture.document);
 for(const m of c.mutations){let owner:unknown=doc;for(const k of m.path.slice(0,-1))owner=(owner as Record<string,unknown>)[String(k)];(owner as Record<string,unknown>)[String(m.path.at(-1))]=structuredClone(m.value);}
 const before=structuredClone(doc);
 if(c.valid)validateCurriculumIdentity('LV3-U12','src/features/direct/curriculumLV3Unit12.json',doc);
 else assert.throws(()=>validateCurriculumIdentity('LV3-U12','src/features/direct/curriculumLV3Unit12.json',doc));
 assert.deepEqual(doc,before);
});
it('rejects wrong path and retains original numeric namespaces for every other selected unit',()=>{
 assert.throws(()=>validateCurriculumIdentity('LV3-U12','src/features/direct/curriculumLV3Unit13.json',fixture.document));
 for(const n of [4,11,13,24]){
  const unit=`LV3-U${String(n).padStart(2,'0')}`,path=`src/features/direct/curriculumLV3Unit${n}.json`;
  const doc={template:{templateId:'TEXTBOOK-'+unit,level:'LV3',unit:n},learningItems:[{learningItemId:`LI-LV3U${String(n).padStart(2,'0')}-V001`,kind:'vocabulary'}]};
  validateCurriculumIdentity(unit,path,doc);doc.learningItems[0].learningItemId=`LI-LV3U${String(n).padStart(2,'0')}-P119-capture`;
  assert.throws(()=>validateCurriculumIdentity(unit,path,doc));
 }
});
