import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV1Unit16.json';
import source from '../../../scripts/sources/LV1Unit16.json';
import corrections from '../../../docs/unit-audit-20261105/LV1-U16-curriculum-patches.json';
type Row=Record<string,unknown>;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function restore(value:typeof current){
 const copy=structuredClone(value);
 expect(copy.learningItems).toHaveLength(136);
 expect(new Set(copy.learningItems.map(i=>i.learningItemId)).size).toBe(136);
 for(const p of corrections.patches){
  const row=copy.learningItems.find(i=>i.learningItemId===p.id) as Row|undefined;
  expect(row).toBeDefined();expect(row!.sourcePage).toBe(p.sourcePage);
  for(const[k,v]of Object.entries(p.after)){expect(row![k]).toEqual(v);expect(Object.hasOwn(p.before,k)).toBe(true);}
  Object.assign(row!,p.before);
 }
 return copy;
}
it('restores only 21 exact source-backed display changes to the fixed original whole-unit hash',()=>{
 expect(corrections.patches).toHaveLength(21);
 expect(hash(source)).toBe(corrections.sourceHash);
 expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');
 expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('exposes unrecorded wording, identities, rows and practice changes to the original hash',()=>{
 const text=structuredClone(current);text.learningItems[0].chapterMeaningsZh='Unrecorded meaning';expect(hash(restore(text))).not.toBe(corrections.beforeHash);
 const extra=structuredClone(current);extra.learningItems.push(extra.learningItems[0]);expect(()=>restore(extra)).toThrow();
 const identity=structuredClone(current);identity.learningItems[38].learningItemId='invented';expect(()=>restore(identity)).toThrow();
 const practice=structuredClone(current);practice.template.deliveryMode='changed';expect(hash(restore(practice))).not.toBe(corrections.beforeHash);
 const after=structuredClone(current);after.learningItems.find(i=>i.learningItemId==='LI-LV1U16-V039')!.chapterMeaningsZh='Unverified';expect(()=>restore(after)).toThrow();
});
