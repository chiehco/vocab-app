import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import current from './curriculumLV2Unit38.json';
import source from '../../../scripts/sources/LV2Unit38.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U38-curriculum-patches.json';
import {lv2Unit38BeforeAudit as restore} from './lv2Unit38Audit.testSupport';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('restores only110 exact U38 display rows without changing any printed English pattern',()=>{
 expect(corrections.patches).toHaveLength(110);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
 for(const word of ['feelings','a drawing board','dailies','diaries'])expect(current.learningItems.find(i=>i.displayWord===word)?.sensePos).toBe('');

});
it('rejects unrecorded fields identities ordering questions and delivery modes against the old hash',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const changed=corrections.patches[0];
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===changed.id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 const unlistedId=structuredClone(current);unlistedId.learningItems[0].learningItemId='invented';expect(hash(restore(unlistedId))).not.toBe(corrections.beforeHash);
 const unlisted=structuredClone(current);(unlisted.learningItems[0] as Record<string,unknown>).unlistedField='invented';expect(hash(restore(unlisted))).not.toBe(corrections.beforeHash);
 const mapping=structuredClone(current);mapping.learningItems[0].officialWordId='invented';expect(hash(restore(mapping))).not.toBe(corrections.beforeHash);
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const question=structuredClone(current);(question.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(question))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const extra=structuredClone(current);extra.learningItems.push(extra.learningItems[0]);expect(()=>restore(extra)).toThrow();
});
it('keeps all19 printed related supplements unmapped and rejects invented source mappings',()=>{
 for(const word of ["feelings","mudslide","sweeper","watercolor","a drawing board","pastel","novelty","unusual","locomotive","gem","ruby","pendant","powerless","calmness","dailies","diaries","toothpaste","toffee","solely"]){const row=current.learningItems.find(i=>i.displayWord===word)!;expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.meaningSource).toBe('unmapped_supplement');
  for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.displayWord===word)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
  for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.displayWord===word)! as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 }
});

it('keeps mapped printed meanings distinct from dictionary snapshots and the full-word default',()=>{
 for(const word of ['airline','paint','draw','power','only','along']){const row=current.learningItems.find(i=>i.displayWord===word&&i.sourceRole!=='main')!;expect(row.meaningSource).toBe('textbook_transcription');expect(row.officialWordId).toBeTruthy();const bad=structuredClone(current);bad.learningItems.find(i=>i.learningItemId===row.learningItemId)!.meaningSource='existing_dictionary';expect(()=>restore(bad)).toThrow();}
});
it('keeps printed rule wording while qualifying cc, score and write or keep usage',()=>{const item=(id:string)=>current.learningItems.find(i=>i.learningItemId===id)!;expect(item('LI-LV2U38-G029').pattern).toContain('20 個（左右）');expect(item('LI-LV2U38-G029').explanationZh).toContain('scores of');expect(item('LI-LV2U38-G053').pattern).toContain('write a diary（×）');expect(item('LI-LV2U38-G053').explanationZh).toContain('不能當作普遍禁令');expect(item('LI-LV2U38-G054').explanationZh).toContain('British Council');for(const word of ['motorcycle','scooter'])expect(current.learningItems.find(i=>i.displayWord===word)?.targetMeaningZh).toContain('字典');expect(item('LI-LV2U38-G032').explanationZh).toContain('另一讀音');});
