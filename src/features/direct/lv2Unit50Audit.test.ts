import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit50.json';
import {lv2Unit50BeforeAudit,lv2Unit50BeforeFormalAudit} from './lv2Unit50Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
import {restoreRecordedAuditPatch} from '../../db/unitAudit.testSupport';
import corrections from '../../../docs/unit-audit-20261105/LV2-U50-curriculum-patches.json';
import main from '../../../docs/unit-audit-20261105/LV2-U50-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U50-notes-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U50-verified-forms-patches.json';
import formSources from '../../../docs/unit-audit-20261105/VERIFIED-LV2-U50-VERB-FORMS-SOURCES.json';
import inverse from '../../../docs/unit-audit-20261105/validation/LV2-U50-exact-inverse.json';
import research from '../../../docs/unit-audit-20261105/LV2-U50-source-research.json';
import imageReview from '../../../docs/unit-audit-20261105/validation/LV2-U50-image-review.json';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const data=(n:string)=>JSON.parse(readFileSync('public/data/v1/'+n+'.json','utf8')) as Row[];
it('guards120 exact printed corrections and all160 original items without replacing a historical fixture',()=>{
 expect(current.learningItems).toHaveLength(160);expect(corrections.patches).toHaveLength(120);expect(hash(current)).toBe(corrections.afterHash);expect(hash(lv2Unit50BeforeAudit(current))).toBe(corrections.beforeHash);expect(hash(JSON.parse(readFileSync(corrections.sourcePath,'utf8')))).toBe(corrections.sourceHash);
 for(const p of corrections.patches){const bad=structuredClone(current),row=bad.learningItems.find(i=>i.learningItemId===p.id)! as Row;for(const k of Object.keys(p.after)){const old=row[k];row[k]='unrecorded';expect(()=>lv2Unit50BeforeAudit(bad)).toThrow();row[k]=old;}}
 for(const mutate of [(c:typeof current)=>{c.learningItems.reverse();},(c:typeof current)=>{c.learningItems[0].displayWord='unrecorded';},(c:typeof current)=>{c.learningItems[0].learningItemId='unrecorded';},(c:typeof current)=>{c.questions.push({questionId:'unrecorded'} as never);},(c:typeof current)=>{c.template.deliveryMode='illustrated' as never;}]){const bad=structuredClone(current);mutate(bad);expect(()=>expect(hash(lv2Unit50BeforeAudit(bad))).toBe(corrections.beforeHash)).toThrow();}
});
it('retains11 null identities and raw source boundaries while explaining60 constructions',()=>{
 const v=current.learningItems.filter(i=>i.kind==='vocabulary'),old=lv2Unit50BeforeAudit(current).learningItems;expect(v).toHaveLength(100);expect(v.filter(i=>!i.officialWordId)).toHaveLength(11);expect(v.filter(i=>i.sourceRole==='printed_related_word')).toHaveLength(60);expect(current.learningItems.filter(i=>i.kind==='grammar')).toHaveLength(60);expect(current.template.deliveryMode).toBe('text_only');expect(current.questions).toEqual([]);
 expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!Object.hasOwn(i,'illustration')&&!Object.hasOwn(i,'originalExample')&&!i.officialSenseId)).toBe(true);
 for(const i of v.filter(i=>!i.officialWordId)){expect(i.meaningSource).toBe('unmapped_supplement');expect(i.officialWordId).toBeNull();expect(i.officialSenseId).toBeNull();expect(i.lexemeRef).toBe(old.find(r=>r.learningItemId===i.learningItemId)!.lexemeRef);expect(i.targetMeaningZh).not.toContain('義項待核對');}
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U50-V091')?.targetMeaningZh).toContain('教材印字');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U50-V096')?.sensePos).toBe('adj.');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U50-G019')?.explanationZh).toContain('burst–burst–burst');
});
it('reverses only64 precise formal operations and rejects recorded-field or identity drift',()=>{
 const all=[...main.patches,...notes.patches,...forms.patches];expect(all).toHaveLength(64);const rows=Object.fromEntries(['words','senses','examples','notes'].map(n=>[n,data(n)]));for(const[n,proof]of Object.entries(inverse.datasets)){expect(hash(rows[n])).toBe(proof.afterHash);expect(hash(lv2Unit50BeforeFormalAudit(n,rows[n]))).toBe(proof.beforeHash);}
 for(const p of all){const row=rows[p.dataset].find(r=>r[p.key]===p.id)!;for(const k of Object.keys(p.after))expect(()=>restoreRecordedAuditPatch(p.dataset,{...row,[k]:'unrecorded'},p)).toThrow();}
 for(const n of Object.keys(rows)){const p=all.find(p=>p.dataset===n)!,row=rows[n].find(r=>r[p.key]===p.id)!;row[p.key]='unrecorded';expect(()=>lv2Unit50BeforeFormalAudit(n,rows[n])).toThrow();}
 const extra=data('words');extra[0].meaningZh='unrecorded';expect(hash(lv2Unit50BeforeFormalAudit('words',extra))).not.toBe(inverse.datasets.words.beforeHash);expect(inverse.headwordIdentityPosAndStatusAll6090Unchanged).toBe(true);expect(inverse.practiceEnglishClozeAnswerAll7871Unchanged).toBe(true);
});
it('limits five lexical verb cloze changes and five practice reviews without changing hints or any sentence',()=>{
 expect(main.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after).map(p=>[p.id,p.after.sensePos])).toEqual([['EX5987c528','v.'],['EX364d779e','v.'],['EXbdf1389c','v.'],['EX28ca1d0b','v.'],['EX71283ae0','v.']]);
 const examples=main.patches.filter(p=>p.dataset==='examples');expect(examples).toHaveLength(10);for(const p of examples)expect(Object.keys(p.after).every(k=>['sensePos','status'].includes(k))).toBe(true);expect(examples.filter(p=>'status'in p.after)).toHaveLength(5);expect(research.unresolved.find(r=>r.word==='sudden')).toBeDefined();expect(examples.find(p=>p.id==='EXd61e53d7')).toBeUndefined();
});
it('requires13 individually sourced truly absent lexical forms and preserves bearer presentation limits',()=>{
 const words=data('words');expect(forms.patches).toHaveLength(13);for(const f of formSources.facts){const row=words.find(w=>w.wordId===f.wordId)!;expect(row.verbForms).toEqual(f.verbForms);expect(row.posAll).toContain('v.');const copy={...row};delete copy.verbForms;expect(hash(copy)).toBe(f.nonFormRowSha256);expect(f.evidence[0].retrieval).toBe('direct_dictionary_word_forms');}
 expect(words.find(w=>w.wordId==='W000071')).not.toHaveProperty('verbForms');expect(formSources.facts.find(f=>f.word==='burst')?.verbForms).toMatchObject({base:'burst',past:'burst',pastParticiple:'burst'});for(const word of ['aloud','forth','loud','extra'])expect(formSources.facts.find(f=>f.word===word)).toBeUndefined();
});
it('keeps113 wind-phone and110 modest-amount exam evidence distinct from authored practices',()=>{
 expect(research.officialItems.map(i=>[i.year,i.item,i.officialAnswer,i.answerForm])).toEqual([[113,23,'J','brought forth'],[110,31,'J','modest']]);for(const i of research.officialItems){expect(i.questionFullContextRead&&i.optionsRead&&i.answerTableRead).toBe(true);expect(i.questionUrl).toContain('www.ceec.edu.tw/files/');expect(i.answerUrl).toContain('www.ceec.edu.tw/files/');expect(i.practiceScope).toContain('另寫');}
 expect(main.patches.filter(p=>p.dataset==='senses')).toHaveLength(5);for(const p of main.patches.filter(p=>p.dataset==='senses'))expect(Object.keys(p.after).every(k=>['status','note'].includes(k))).toBe(true);
});
it('guards six exact notes, paired usage Chinese and every unchanged image asset',()=>{
 expect(notes.patches).toHaveLength(6);for(const p of notes.patches)expect(Object.keys(p.after)).toEqual(['content']);const words=data('words');for(const p of main.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>Boolean(i.chinese))).toBe(true);}
 expect(imageReview.images).toHaveLength(21);for(const im of imageReview.images){expect(createHash('sha256').update(readFileSync('public/'+im.path)).digest('hex')).toBe(im.sha256);expect(im.pixelsActuallyViewed).toBe(true);}expect(imageReview.captionFollowups.map(r=>r.id)).toEqual(['LV1-U08-33']);
});
it('preserves real inherited rare senses while making selected meanings and scope visible',()=>{
 const words=data('words'),w=(id:string)=>words.find(w=>w.wordId===id)!;expect(w('W001409').meaningZh).toContain('彌撒');expect(w('W002846').meaningZh).toContain('浸漬');expect(w('W001512').meaningEn).toContain('resident');expect(w('W005116').meaningZh).toContain('容忍');expect(w('W004250').meaningEn).toContain('Creek Confederacy');expect(w('W002594').meaningEn).toContain('Separate noun');expect(w('W001191').word).toBe('congratulation(s)');expect(w('W001191').meaningEn).toContain('act of congratulating');expect(w('W004524').pos).toBe('n.');expect(w('W001854').meaningZh).toContain('串流');
});
