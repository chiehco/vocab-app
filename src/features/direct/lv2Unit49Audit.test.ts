import {lv2Unit50BeforeFormalAudit} from './lv2Unit50Audit.testSupport';
import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit49.json';
import {lv2Unit49BeforeAudit,lv2Unit49BeforeFormalAudit} from './lv2Unit49Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
import {restoreRecordedAuditPatch} from '../../db/unitAudit.testSupport';
import corrections from '../../../docs/unit-audit-20261105/LV2-U49-curriculum-patches.json';
import main from '../../../docs/unit-audit-20261105/LV2-U49-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U49-notes-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U49-verified-forms-patches.json';
import formSources from '../../../docs/unit-audit-20261105/VERIFIED-LV2-U49-VERB-FORMS-SOURCES.json';
import inverse from '../../../docs/unit-audit-20261105/validation/LV2-U49-exact-inverse.json';
import research from '../../../docs/unit-audit-20261105/LV2-U49-source-research.json';
import imageReview from '../../../docs/unit-audit-20261105/validation/LV2-U49-image-review.json';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const data=(n:string)=>lv2Unit50BeforeFormalAudit(n,JSON.parse(readFileSync('public/data/v1/'+n+'.json','utf8'))) as Row[];
it('checks115 exact printed corrections and all historical155 items without resetting a fixture',()=>{
 expect(current.learningItems).toHaveLength(155);expect(corrections.patches).toHaveLength(115);expect(hash(current)).toBe(corrections.afterHash);expect(hash(lv2Unit49BeforeAudit(current))).toBe(corrections.beforeHash);expect(hash(JSON.parse(readFileSync(corrections.sourcePath,'utf8')))).toBe(corrections.sourceHash);
 for(const p of corrections.patches){const bad=structuredClone(current),row=bad.learningItems.find(i=>i.learningItemId===p.id)! as Row;for(const k of Object.keys(p.after)){const old=row[k];row[k]='unrecorded';expect(()=>lv2Unit49BeforeAudit(bad)).toThrow();row[k]=old;}}
 for(const mutate of [(c:typeof current)=>{c.learningItems.reverse();},(c:typeof current)=>{c.learningItems[0].displayWord='unrecorded';},(c:typeof current)=>{c.learningItems[0].learningItemId='unrecorded';},(c:typeof current)=>{c.questions.push({questionId:'unrecorded'} as never);},(c:typeof current)=>{c.template.deliveryMode='illustrated' as never;}]){const bad=structuredClone(current);mutate(bad);expect(()=>expect(hash(lv2Unit49BeforeAudit(bad))).toBe(corrections.beforeHash)).toThrow();}
});
it('keeps ten null identities and textbook/dictionary boundaries while explaining all62 constructions',()=>{
 const v=current.learningItems.filter(i=>i.kind==='vocabulary'),old=lv2Unit49BeforeAudit(current).learningItems;expect(v).toHaveLength(93);expect(v.filter(i=>!i.officialWordId)).toHaveLength(10);expect(v.filter(i=>i.sourceRole==='printed_related_word')).toHaveLength(53);expect(current.learningItems.filter(i=>i.kind==='grammar')).toHaveLength(62);expect(current.template.deliveryMode).toBe('text_only');expect(current.questions).toEqual([]);
 expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!Object.hasOwn(i,'illustration')&&!Object.hasOwn(i,'originalExample')&&!i.officialSenseId)).toBe(true);
 for(const i of v.filter(i=>!i.officialWordId)){expect(i.meaningSource).toBe('unmapped_supplement');expect(i.officialWordId).toBeNull();expect(i.officialSenseId).toBeNull();expect(i.lexemeRef).toBe(old.find(r=>r.learningItemId===i.learningItemId)!.lexemeRef);expect(i.targetMeaningZh).not.toContain('義項待核對');}
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U49-G010')?.explanationZh).toContain('慣用法');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U49-G008')?.explanationZh).toContain('強烈');
});
it('restores only82 exact formal operations and rejects each recorded-field or identity drift',()=>{
 const all=[...main.patches,...notes.patches,...forms.patches];expect(all).toHaveLength(82);
 const rows=Object.fromEntries(['words','senses','examples','notes'].map(n=>[n,data(n)]));for(const[n,proof]of Object.entries(inverse.datasets)){expect(hash(rows[n])).toBe(proof.afterHash);expect(hash(lv2Unit49BeforeFormalAudit(n,rows[n],'u49_checkpoint'))).toBe(proof.beforeHash);}
 for(const p of all){const row=rows[p.dataset].find(r=>r[p.key]===p.id)!;for(const k of Object.keys(p.after))expect(()=>restoreRecordedAuditPatch(p.dataset,{...row,[k]:'unrecorded'},p)).toThrow();}
 for(const n of Object.keys(rows)){const p=all.find(p=>p.dataset===n)!,row=rows[n].find(r=>r[p.key]===p.id)!;row[p.key]='unrecorded';expect(()=>lv2Unit49BeforeFormalAudit(n,rows[n],'u49_checkpoint')).toThrow();}
 const extra=data('words');extra[0].meaningZh='unrecorded';expect(hash(lv2Unit49BeforeFormalAudit('words',extra,'u49_checkpoint'))).not.toBe(inverse.datasets.words.beforeHash);
 expect(inverse.headwordIdentityPosAndStatusAll6090Unchanged).toBe(true);expect(inverse.practiceEnglishClozeAnswerAll7871Unchanged).toBe(true);
});
it('limits eight actual cloze POS and five existing hint refinements without filling empty hints',()=>{
 expect(main.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after).map(p=>[p.id,p.after.sensePos])).toEqual([['EX8759c5e8','adj.'],['EX0560cc04','v.'],['EXf8811287','v.'],['EX2c8a3186','adj.'],['EX4e66b156','n.'],['EX75d64919','n.'],['EX943d872c','v.'],['EXb758201e','n.']]);
 const hints=main.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(5);for(const p of hints)expect(p.before.meaningHint).toBeTruthy();for(const p of main.patches.filter(p=>p.dataset==='examples'))expect(Object.keys(p.after).every(k=>['sensePos','meaningHint','status','sentenceZh'].includes(k))).toBe(true);
 expect(main.patches.find(p=>p.id==='EX8468c530'&&'sentenceZh'in p.after)?.after.sentenceZh).toBe('高迪認為自己獲勝與否的機會各半。');
});
it('requires15 individually sourced missing form keys, including two explicit conjugation tables',()=>{
 const words=data('words');expect(forms.patches).toHaveLength(15);for(const f of formSources.facts){const row=words.find(w=>w.wordId===f.wordId)!;expect(row.verbForms).toEqual(f.verbForms);expect(row.posAll).toContain('v.');const copy={...row};delete copy.verbForms;expect(hash(copy)).toBe(f.nonFormRowSha256);expect(f.evidence[0].retrieval).toBe(['function','cage'].includes(f.word)?'direct_official_conjugation_table':'direct_dictionary_word_forms');}
 for(const word of ['coast','shore','needle','fellow'])expect(words.find(w=>w.word===word)).not.toHaveProperty('verbForms');expect(formSources.facts.find(f=>f.word==='harbor')?.verbForms.past).toBe('harbored');
});
it('keeps106 function verb and symbol noun evidence separate from115 function noun',()=>{
 expect(research.officialItems.map(i=>[i.year,i.item,i.officialAnswer,i.answerForm])).toEqual([[106,37,'D','functioned'],[106,33,'I','symbols'],[115,22,'G','function']]);for(const i of research.officialItems){expect(i.questionFullContextRead&&i.optionsRead&&i.answerTableRead).toBe(true);expect(i.questionUrl).toContain('www.ceec.edu.tw/files/');expect(i.answerUrl).toContain('www.ceec.edu.tw/files/');expect(i.practiceScope).toContain('不是');}
 const p=main.patches.find(p=>p.id==='W001388-1')!;expect(p.after.examEvidence).toBe('學測106 文意選填Q37');expect(p.after.note).toContain('名詞');expect(p.before.examEvidence).toContain('115');
});
it('guards three exact metric note numbers, paired usage Chinese and all30 unchanged images',()=>{
 expect(notes.patches.filter(p=>'title'in p.after).map(p=>[p.id,p.after.title,p.after.content])).toEqual([['NX56368adb','2 kilograms = 2 kilos = 2 kg','2 公斤。'],['NXc9ca2c13','10 meters = 10 m','10 公尺。'],['NX2c88b1fd','10 centimeters = 10 cm','10 公分。']]);
 const words=data('words');for(const p of main.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>Boolean(i.chinese))).toBe(true);}
 expect(imageReview.images).toHaveLength(30);for(const im of imageReview.images){expect(createHash('sha256').update(readFileSync('public/'+im.path)).digest('hex')).toBe(im.sha256);expect(im.pixelsActuallyViewed).toBe(true);}
});
