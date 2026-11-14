import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV2Unit39.json';
import source from '../../../scripts/sources/LV2Unit39.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U39-curriculum-patches.json';
import {lv2Unit39BeforeAudit as restore} from './lv2Unit39Audit.testSupport';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('restores exactly116 U39 display rows while retaining the original source and full old hash',()=>{
 expect(corrections.patches).toHaveLength(116);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('rejects bad recorded after values and retains all unlisted fields order questions and identities',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===corrections.patches[0].id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 for(const field of ['officialWordId','officialSenseId','meaningSource','unlistedField']){const bad=structuredClone(current);(bad.learningItems[0] as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const question=structuredClone(current);(question.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(question))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const duplicate=structuredClone(current);duplicate.learningItems.push(duplicate.learningItems[0]);expect(()=>restore(duplicate)).toThrow();
});
it('keeps29 printed supplements unmapped even when their displayed print meaning is supplied',()=>{
 const supplements=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(supplements).toHaveLength(29);
 for(const row of supplements){expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');
  for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
  for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 }
 for(const word of ['relations','mph','foxes','wolves','strawberries','peaches','policemen','policewomen','bakeries','be in season'])expect(current.learningItems.find(i=>i.displayWord===word)?.sensePos).toBe('');
});
it('keeps printed mapped senses distinct from the full formal dictionary',()=>{
 for(const word of ['gesture','mimic','cunning','pepper','wooden','rush']){const row=current.learningItems.find(i=>i.displayWord===word)!;expect(row.meaningSource).toBe('textbook_transcription');expect(row.officialWordId).toBeTruthy();const bad=structuredClone(current);bad.learningItems.find(i=>i.learningItemId===row.learningItemId)!.meaningSource='existing_dictionary';expect(()=>restore(bad)).toThrow();}
});
it('keeps original English marks and qualifies speed forms hippo plurals and ink usage',()=>{
 const item=(suffix:string)=>current.learningItems.find(i=>i.learningItemId==='LI-LV2U39-'+suffix)!;
 expect(item('G015').pattern).toContain('sped / speeded');expect(item('G015').explanationZh).toContain('不是每種構式都無條件互換');
 expect(item('G022').pattern).toContain('hippos');expect(item('G022').explanationZh).toContain('簡稱 hippo');
 expect(item('G032').pattern).toContain('with ink（×）');expect(item('G032').explanationZh).toContain('不能當作普遍禁令');
 expect(item('G020').explanationZh).toContain('deers');expect(item('G021').explanationZh).toContain('reindeers');
});
