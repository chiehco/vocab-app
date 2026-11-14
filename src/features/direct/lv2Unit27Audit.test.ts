import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV2Unit27.json';
import source from '../../../scripts/sources/LV2Unit27.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U27-curriculum-patches.json';
import {lv2Unit27BeforeAudit as restore} from './lv2Unit27Audit.testSupport';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('restores only91 exact LV2 U27 displayed corrections to the fixed whole-unit hash',()=>{
 expect(corrections.patches).toHaveLength(91);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U27-G002')?.explanationZh).toMatch(/^字典補充/);expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U27-G049')?.explanationZh).toMatch(/^字典補充/);
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U27-V065')?.sensePos).toBe('');
});
it('retains unknown wording, identity, mapping, order, questions and delivery protections',()=>{
 const row=structuredClone(current);row.learningItems[0].chapterMeaningsZh='unrecorded';expect(hash(restore(row))).not.toBe(corrections.beforeHash);
 const id=structuredClone(current);id.learningItems[41].learningItemId='invented';expect(()=>restore(id)).toThrow();
 const mapping=structuredClone(current);mapping.learningItems[0].officialWordId='invented';expect(hash(restore(mapping))).not.toBe(corrections.beforeHash);
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const question=structuredClone(current);(question.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(question))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const extra=structuredClone(current);extra.learningItems.push(extra.learningItems[0]);expect(()=>restore(extra)).toThrow();
 const wrong=structuredClone(current);wrong.learningItems[41].chapterMeaningsZh='not verified';expect(()=>restore(wrong)).toThrow();
 const badPos=structuredClone(current);badPos.learningItems[41].sensePos='unverified';expect(()=>restore(badPos)).toThrow();
});
