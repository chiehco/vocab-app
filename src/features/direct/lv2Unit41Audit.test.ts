import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit41.json';
import source from '../../../scripts/sources/LV2Unit41.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U41-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U41-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U41-verified-forms-patches.json';
import usageFollowup from '../../../docs/unit-audit-20261105/LV2-U41-usage-followup.json';
import {lv2Unit41BeforeAudit as restore} from './lv2Unit41Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Record<string,unknown>[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Record<string,unknown>[];
it('restores exactly110 U41 display rows and the old complete hash while retaining original source',()=>{
 expect(corrections.patches).toHaveLength(110);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('rejects unverified after values and protects all unlisted identities order questions and modes',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===corrections.patches[0].id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 for(const field of ['officialWordId','officialSenseId','meaningSource','unlistedField']){const bad=structuredClone(current);(bad.learningItems[0] as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const q=structuredClone(current);(q.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(q))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const duplicate=structuredClone(current);duplicate.learningItems.push(duplicate.learningItems[0]);expect(()=>restore(duplicate)).toThrow();
});
it('keeps15 supplements genuinely unmapped and validates each precise displayed value',()=>{
 const a=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(a).toHaveLength(15);
 for(const row of a){expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');
  for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
  for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 }
});
it('preserves exact printed labels and qualifies the offspring correction visibly',()=>{const item=(s:string)=>current.learningItems.find(i=>i.learningItemId==='LI-LV2U41-'+s)!;
 expect(item('V078').printedLabel).toBe('*');expect(item('V078').sensePos).toBe('n.');expect(item('V078').targetMeaningZh).toContain('原稿標 a.');
 expect(item('V046').officialWordId).toBe(item('V011').officialWordId);expect(item('V046').targetMeaningZh).toContain('性別對應');
 expect(current.learningItems.filter(i=>i.displayWord==='unusual')).toHaveLength(2);
});
it('limits the seven actual cloze POS changes and the six existing show hints',()=>{
 for(const[id,pos]of Object.entries({EX6850bbc2:'n.',EX3bd5581c:'n.',EX86bc17ce:'n.',EXc590208f:'n.',EX9b7198a6:'n.',EX2e5c1b32:'v.',EX4b2df332:'v.'})){const p=formal.patches.find(p=>p.id===id)!;expect(p.after).toEqual({sensePos:pos});expect(examples.find(e=>e.exampleId===id)?.meaningHint).toBeNull();}
 const hints=formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(6);for(const p of hints){expect(p.before.meaningHint).toBeTruthy();expect(Object.keys(p.after)).toEqual(['meaningHint']);}
});
it('keeps eleven precise lexical verb forms without expanding rough minor or host',()=>{
 expect(forms.patches).toHaveLength(11);for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});const w=words.find(w=>w.wordId===p.id)!;expect((w.posAll as string[])).toContain('v.');expect(w.verbForms).toEqual(p.after.verbForms);}
 for(const word of ['rough','minor','host']){const w=words.find(w=>w.word===word||(w.wordVariants as string[]).includes(word))!;expect(w).toBeDefined();expect((w.posAll as string[])).not.toContain('v.');expect(forms.patches.some(p=>p.id===w.wordId)).toBe(false);}
});
it('keeps the official exhibit sense distinct from its unchanged draft practice',()=>{
 const p=formal.patches.find(p=>p.id==='W003377-1')!;expect(p.before.status).toBe('draft');expect(p.after.status).toBe('reviewed');expect(p.after.examEvidence).toContain('答案 B');expect(p.after.note).toContain('非原題逐字引文');
 const e=examples.find(e=>e.exampleId==='EXa14f7fdb')!;expect(e.status).toBe('draft');expect(e.sentenceEn).toBe('Some cats exhibit unusual behavior before an earthquake.');
 expect(formal.patches.some(p=>p.id===e.exampleId)).toBe(false);
});
it('pairs all changed constructions and preserves every unchanged practice sentence',()=>{
 for(const p of [...formal.patches,...usageFollowup.patches].filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}
 for(const p of formal.patches.filter(p=>p.dataset==='examples')){const e=examples.find(e=>e.exampleId===p.id)!;for(const k of ['sentenceEn','sentenceZh','blankSentence','answer'])expect(e[k]).toEqual((p.before as Record<string,unknown>)[k]);}
});
