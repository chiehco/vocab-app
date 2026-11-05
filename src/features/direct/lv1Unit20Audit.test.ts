import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV1Unit20.json';
import source from '../../../scripts/sources/LV1Unit20.json';
import corrections from '../../../docs/unit-audit-20261105/LV1-U20-curriculum-patches.json';
import {unit20BeforeAudit as restore} from './lv1Unit20Audit.testSupport';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('restores only the 39 exact source-backed U20 edits to the fixed whole-unit hash',()=>{
 expect(corrections.patches).toHaveLength(39);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('retains unrecorded identity, order, question, mode and wording protection',()=>{
 const row=structuredClone(current);row.learningItems[0].chapterMeaningsZh='unrecorded';expect(hash(restore(row))).not.toBe(corrections.beforeHash);
 const id=structuredClone(current);id.learningItems[40].learningItemId='invented';expect(()=>restore(id)).toThrow();
 const mapping=structuredClone(current);mapping.learningItems[0].officialWordId='invented';expect(hash(restore(mapping))).not.toBe(corrections.beforeHash);
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const question=structuredClone(current);(question.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(question))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const practice=structuredClone(current);practice.learningItems[0].practiceMode='changed';expect(hash(restore(practice))).not.toBe(corrections.beforeHash);
 const extra=structuredClone(current);extra.learningItems.push(extra.learningItems[0]);expect(()=>restore(extra)).toThrow();
 const wrong=structuredClone(current);wrong.learningItems[40].chapterMeaningsZh='not verified';expect(()=>restore(wrong)).toThrow();
});
