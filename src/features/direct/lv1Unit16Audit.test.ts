import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV1Unit16.json';
import source from '../../../scripts/sources/LV1Unit16.json';
import corrections from '../../../docs/unit-audit-20261105/LV1-U16-curriculum-patches.json';
import {unit16BeforeAudit as restore} from './lv1Unit16Audit.testSupport';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
 const mappedIdentity=structuredClone(current);mappedIdentity.learningItems[0].officialWordId='invented';expect(hash(restore(mappedIdentity))).not.toBe(corrections.beforeHash);
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const questions=structuredClone(current);(questions.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(questions))).not.toBe(corrections.beforeHash);
 const practice=structuredClone(current);practice.template.deliveryMode='changed';expect(hash(restore(practice))).not.toBe(corrections.beforeHash);
 const after=structuredClone(current);after.learningItems.find(i=>i.learningItemId==='LI-LV1U16-V039')!.chapterMeaningsZh='Unverified';expect(()=>restore(after)).toThrow();
});
