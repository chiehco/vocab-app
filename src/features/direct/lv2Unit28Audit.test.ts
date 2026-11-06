import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV2Unit28.json';
import source from '../../../scripts/sources/LV2Unit28.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U28-curriculum-patches.json';
import {lv2Unit28BeforeAudit as restore} from './lv2Unit28Audit.testSupport';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('restores only84 exact U28 display corrections to its fixed historical curriculum',()=>{
 expect(corrections.patches).toHaveLength(84);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
 for(const id of ['V044','V057','V074'])expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U28-'+id)?.sensePos).toBe('');
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U28-V006')?.chapterMeaningsZh).toContain('字典補充');
 for(const id of ['V043','V044','V045','V049','V051','V057','V074'])expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U28-'+id)?.officialWordId).toBeNull();
});
it('rejects unverified after values and retains identity, mapping, order, question and mode guards',()=>{
 const changed=corrections.patches[0];
 for(const field of Object.keys(changed.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===changed.id)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===changed.id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 const unlisted=structuredClone(current);unlisted.learningItems[0].sensePos='invented';expect(hash(restore(unlisted))).not.toBe(corrections.beforeHash);
 const mapping=structuredClone(current);mapping.learningItems[0].officialWordId='invented';expect(hash(restore(mapping))).not.toBe(corrections.beforeHash);
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const question=structuredClone(current);(question.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(question))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const extra=structuredClone(current);extra.learningItems.push(extra.learningItems[0]);expect(()=>restore(extra)).toThrow();
});
