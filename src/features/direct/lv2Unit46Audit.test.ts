import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit46.json';
import source from '../../../scripts/sources/LV2Unit46.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U46-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U46-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U46-verified-forms-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U46-notes-patches.json';
// These assertions describe the exact text checkpoint before the later image repair.
import images from '../../../docs/unit-audit-20261105/validation/LV2-U46-image-review-before-praise.json';
import praise from '../../../docs/unit-audit-20261105/validation/LV2-U46-praise-before-repair.json';
import {lv2Unit46BeforeAudit as restore} from './lv2Unit46Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Row[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Row[];
it('reverses only120 U46 display rows and keeps the complete original curriculum/source hashes',()=>{
 expect(corrections.patches).toHaveLength(120);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('rejects altered after values and detects unrecorded identities fields order questions and modes',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Row)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===corrections.patches[0].id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 for(const field of ['officialWordId','officialSenseId','meaningSource','unlistedField']){const bad=structuredClone(current);(bad.learningItems[0] as Row)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const q=structuredClone(current);(q.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(q))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const duplicate=structuredClone(current);duplicate.learningItems.push(duplicate.learningItems[0]);expect(()=>restore(duplicate)).toThrow();
});
it('keeps17 supplements null and separately guards every printed meaning and POS',()=>{
 const a=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(a).toHaveLength(17);
 for(const r of a){expect(r.officialWordId).toBeNull();expect(r.officialSenseId).toBeNull();expect(r.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');for(const field of ['targetMeaningZh','chapterMeaningsZh','sensePos']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===r.learningItemId)! as Row)[field]='unverified';expect(()=>restore(bad)).toThrow();}for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===r.learningItemId)! as Row)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}}
});
it('corrects nine actual cloze POS fields and six existing hints without rewriting any practice',()=>{
 const pos:Record<string,string>={EX1b323e1b:'n.',EX2bf77804:'adj.',EX3e6359a6:'v.',EXa1102734:'n.',EX468f2c5f:'v.',EX01a690bf:'n.',EX14ac4687:'n.',EXa59c0042:'adj.',EX0fa265a6:'adv.'};
 for(const[id,sensePos]of Object.entries(pos))expect(examples.find(e=>e.exampleId===id)?.sensePos).toBe(sensePos);
 expect(formal.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after)).toHaveLength(9);
 const hints=formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(6);for(const p of hints)expect(p.before.meaningHint).toBeTruthy();
 for(const p of formal.patches.filter(p=>p.dataset==='examples')){const e=examples.find(e=>e.exampleId===p.id)!;for(const k of ['sentenceEn','blankSentence','answer'])expect(e[k]).toEqual((p.before as Row)[k]);}
 expect(formal.patches.filter(p=>p.dataset==='examples'&&'status'in p.after)).toHaveLength(5);
});
it('preserves the departure restriction and leaves all unrelated Chinese untouched',()=>{
 const p=formal.patches.filter(p=>p.dataset==='examples'&&'sentenceZh'in p.after);expect(p).toHaveLength(1);expect(p[0].id).toBe('EX42f1a935');expect(p[0].after).toEqual({sentenceZh:'這場暴風雪迫使航空公司取消所有從該機場起飛的班機。'});
 expect(examples.find(e=>e.exampleId==='EX42f1a935')?.sentenceEn).toBe('The heavy snowstorm forced the airline to cancel all flights leaving the airport.');
});
it('guards21 true absent lexical forms and separates bettered from comparative good/well',()=>{
 expect(forms.patches).toHaveLength(21);for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});const w=words.find(w=>w.wordId===p.id)!;expect(w.posAll as string[]).toContain('v.');expect(w.verbForms).toEqual(p.after.verbForms);}
 const better=words.find(w=>w.word==='better')!;expect(better.meaningZh).toContain('實義動詞 better');expect(better.meaningEn).toContain('not to the comparison');expect(better.verbForms).toMatchObject({base:'better',past:'bettered',pastParticiple:'bettered'});
 expect(forms.patches.find(p=>p.after.verbForms.base==='curtain')?.after.verbForms.sourceRef).toBe('https://www.collinsdictionary.com/conjugation/english/curtain');
 expect(forms.patches.find(p=>p.after.verbForms.base==='cancel')?.after.verbForms).toMatchObject({past:'canceled',pastParticiple:'canceled',sourceRef:'https://www.collinsdictionary.com/us/dictionary/english/cancel'});
 for(const name of ['mature','service','exact'])expect(forms.patches.some(p=>p.after.verbForms.base===name)).toBe(false);
});
it('keeps related lexical senses visibly separate and requires every edited construction to retain its Chinese pair',()=>{
 for(const p of formal.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}
 expect(words.find(w=>w.word==='settlement')?.meaningZh).toContain('另有名詞 settle');expect(words.find(w=>w.word==='settlement')?.meaningEn).toContain('bench');expect(words.find(w=>w.word==='improvement')?.meaningEn).toContain('Related verb improve');
 expect(words.find(w=>w.word==='exact')?.meaningZh).toContain('另有動詞用法');expect(words.find(w=>w.word==='service')?.meaningZh).toContain('另有動詞用法');expect(words.find(w=>w.word==='mass')?.meaningZh).toContain('質量');
 expect(notes.patches).toHaveLength(3);expect(notes.patches.every(p=>Object.keys(p.after).join()==='content')).toBe(true);
});
it('separates two full108 official sources from authored practices and preserves every independent old image',()=>{
 const expected:Record<string,string>={'W001684-1':'C proposed','W003761-1':'D predicted'};expect(formal.patches.filter(p=>p.dataset==='senses')).toHaveLength(8);
 for(const[id,text]of Object.entries(expected)){const p=formal.patches.find(p=>p.id===id)!;expect(p.after.examEvidence).toContain(text);expect(p.after.note).toContain('不冒稱原題引用');}
 expect(images.images).toHaveLength(36);for(const image of images.images)expect(createHash('sha256').update(readFileSync('public/'+image.path)).digest('hex')).toBe(image.sha256);
});
it('retains praise original asset and captions while refusing to equate a failed generation attempt with acceptance',()=>{
 expect(images.confirmedRepairPending).toEqual(['W001659-praise-single-visible-flower']);expect(praise.wordId).toBe('W001659');expect(praise.originalDimensions).toEqual([1024,1024]);expect(praise.captionEn).toContain('offers flowers');
 expect(praise.attempt.generationStarted).toBe(false);expect(praise.attempt.candidateCreated).toBe(false);expect(praise.appRepairAccepted).toBe(false);expect(praise.publicationReady).toBe(false);
 expect(createHash('sha256').update(readFileSync(praise.originalPath)).digest('hex')).toBe(praise.originalSha256);
});
