import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit42.json';
import source from '../../../scripts/sources/LV2Unit42.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U42-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U42-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U42-verified-forms-patches.json';
import {lv2Unit42BeforeAudit as restore} from './lv2Unit42Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Record<string,unknown>[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Record<string,unknown>[];
it('restores exactly109 U42 display rows and the old complete hash while retaining original source',()=>{
 expect(corrections.patches).toHaveLength(109);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
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
it('limits twelve actual cloze POS changes and five existing leave hints',()=>{const pos:Record<string,string>={EXb396ba9b:'v.',EXfe579ad3:'v.',EX3f1c12d9:'v.',EXc293debb:'v.',EX3602d73e:'v.',EX7cb63ae3:'n.',EX4b5710a2:'v.',EX1db3c0b4:'adj.',EX85e6d95a:'v.',EXbedb835b:'v.',EX79967822:'n.',EX3999d06a:'v.'};for(const[id,value]of Object.entries(pos)){const p=formal.patches.find(p=>p.id===id)!;expect(p.after).toEqual({sensePos:value});expect(examples.find(e=>e.exampleId===id)?.meaningHint).toBeNull();}const hints=formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(5);for(const p of hints){expect(p.before.meaningHint).toBeTruthy();expect(Object.keys(p.after)).toEqual(['meaningHint']);}});
it('adds nineteen exact absent lexical form keys and no noun-only related verbs',()=>{expect(forms.patches).toHaveLength(19);for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});const w=words.find(w=>w.wordId===p.id)!;expect(w.posAll as string[]).toContain('v.');expect(w.verbForms).toEqual(p.after.verbForms);}for(const word of ['angle','medal','adjustment','entrance']){const w=words.find(w=>w.word===word)!;expect(w).toBeDefined();expect(forms.patches.some(p=>p.id===w.wordId)).toBe(false);}});
it('keeps three official exam senses separate from unchanged draft practices',()=>{for(const [senseId,exampleId,option]of [['W001234-1','EXe80f22ba','D'],['W001218-1','EXbbead84c','H'],['W002672-1','EX3ceed757','J']]){const p=formal.patches.find(p=>p.id===senseId)!;expect(p.before.status).toBe('draft');expect(p.after.status).toBe('reviewed');expect(p.after.examEvidence).toContain('答案 '+option);expect(p.after.note).toContain('非原題逐字引文');expect(examples.find(e=>e.exampleId===exampleId)?.status).toBe('draft');expect(formal.patches.some(p=>p.id===exampleId)).toBe(false);}});
it('pairs all changed constructions and changes only the exact inclusive deadline translation',()=>{for(const p of formal.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}for(const p of formal.patches.filter(p=>p.dataset==='examples')){const e=examples.find(e=>e.exampleId===p.id)!;const before=p.before as Record<string,unknown>;for(const k of ['sentenceEn','blankSentence','answer'])expect(e[k]).toEqual(before[k]);if(p.id!=='EXbf4b15ea')expect(e.sentenceZh).toEqual(before.sentenceZh);else expect(e.sentenceZh).toBe('這篇文章最遲須於 5 月 31 日遞交。');}});
