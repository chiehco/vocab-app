import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV2Unit29.json';
import source from '../../../scripts/sources/LV2Unit29.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U29-curriculum-patches.json';
import {lv2Unit29BeforeAudit as restore} from './lv2Unit29Audit.testSupport';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('restores only70 exact U29 display rows including the pixel-verified S transcription',()=>{
 expect(corrections.patches).toHaveLength(70);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
 for(const word of ["industries","realities","bases"])expect(current.learningItems.find(i=>i.displayWord===word)?.sensePos).toBe('');
 for(const word of ['origin','truth'])expect(current.learningItems.find(i=>i.displayWord===word)?.chapterMeaningsZh).toContain('字典補充');
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U29-G023')?.pattern).toBe('It is likely that... = S + be likely to V');
 expect(restore(current).learningItems.find(i=>i.learningItemId==='LI-LV2U29-G023')?.pattern).toBe('It is likely that... = Sb + be likely to V');
});
it('rejects unrecorded fields identities ordering questions and delivery modes against the old hash',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const changed=corrections.patches[0];
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===changed.id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 const unlistedId=structuredClone(current);unlistedId.learningItems[0].learningItemId='invented';expect(hash(restore(unlistedId))).not.toBe(corrections.beforeHash);
 const unlisted=structuredClone(current);unlisted.learningItems[0].sensePos='invented';expect(hash(restore(unlisted))).not.toBe(corrections.beforeHash);
 const mapping=structuredClone(current);mapping.learningItems[0].officialWordId='invented';expect(hash(restore(mapping))).not.toBe(corrections.beforeHash);
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const question=structuredClone(current);(question.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(question))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const extra=structuredClone(current);extra.learningItems.push(extra.learningItems[0]);expect(()=>restore(extra)).toThrow();
});
it('keeps all14 printed supplements unmapped and rejects invented source mappings',()=>{
 for(const word of ["industries","indirect","incomplete","realities","bases","divorced","separated","naturalist","unnatural","man-made","tear-gas","unlikely","detailed","unequal"]){const row=current.learningItems.find(i=>i.displayWord===word)!;expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.meaningSource).toBe('unmapped_supplement');
  for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.displayWord===word)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
  for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.displayWord===word)! as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 }
});
