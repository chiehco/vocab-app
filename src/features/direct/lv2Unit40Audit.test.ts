import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit40.json';
import source from '../../../scripts/sources/LV2Unit40.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U40-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U40-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U40-verified-forms-patches.json';
import {lv2Unit40BeforeAudit as restore} from './lv2Unit40Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Record<string,unknown>[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Record<string,unknown>[];
it('restores exactly108 U40 display rows and the old complete hash while retaining original source',()=>{
 expect(corrections.patches).toHaveLength(108);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
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
it('keeps25 supplements genuinely unmapped and validates each precise displayed value',()=>{
 const a=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(a).toHaveLength(25);
 for(const row of a){expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');
  for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='unverified';expect(()=>restore(bad)).toThrow();}
  for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Record<string,unknown>)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 }
});
it('preserves source boundaries for cabbage network heroine and in-print qualifications',()=>{
 const item=(s:string)=>current.learningItems.find(i=>i.learningItemId==='LI-LV2U40-'+s)!;
 expect(item('G014').explanationZh).toContain('農業部');expect(item('V055').targetMeaningZh).toContain('字典校訂');expect(item('V055').officialWordId).toBeNull();
 expect(item('V027').targetMeaningZh).toContain('不以必然小於 Internet');expect(item('V085').printedLabel).toBe('反');expect(item('V085').targetMeaningZh).toContain('性別對應');
 expect(item('V034').officialWordId).toBe('W001429');expect(item('V085').officialWordId).toBe('W001429');
 expect(item('G043').pattern).toBe('be in print = be published');expect(item('G043').explanationZh).toContain('曾經出版不必然');
 expect(item('G021').pattern).toBe('be in a good / high mood');expect(item('G021').explanationZh).toContain('原英文轉錄保留');
});
it('keeps three null-hint cloze POS fixes precise and preserves the two existing hint exceptions',()=>{
 for(const[id,pos]of Object.entries({EX421fb579:'v.',EX1b43c2a6:'n.',EX273c2f1f:'v.'})){const p=formal.patches.find(p=>p.id===id)!;expect(p.after).toEqual({sensePos:pos});expect(examples.find(e=>e.exampleId===id)?.meaningHint).toBeNull();}
 expect(formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after)).toHaveLength(6);
 expect(formal.patches.some(p=>['EX7dfa0583','EXb10276d7'].includes(p.id))).toBe(false);
 expect(examples.find(e=>e.exampleId==='EX7dfa0583')?.meaningHint).toBe('出現；問世（本句為另寫練習句）');
});
it('keeps eleven exact forms and rejects treating the adv substring in rough as a verb',()=>{
 expect(forms.patches).toHaveLength(11);expect(forms.patches.some(p=>p.id==='W002748')).toBe(false);
 const rough=words.find(w=>w.wordId==='W002748')!;expect(rough.posAll).toEqual(['adj.','adv.','n.']);expect(rough).not.toHaveProperty('verbForms');
 for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});expect(words.find(w=>w.wordId===p.id)?.verbForms).toEqual(p.after.verbForms);}
});
it('pairs every changed construction and preserves the exact appear group order',()=>{
 for(const p of formal.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}
 const appear=words.find(w=>w.wordId==='W000041')!;const groups=buildUsagePatternItems(appear.usagePattern as string,appear.usagePatternZh as string);expect(groups).toHaveLength(3);expect(groups[0].chinese).toContain('to 後接原形');expect(groups[1].chinese).toContain('完整子句');expect(groups[2].chinese).toContain('形容詞');
});
