import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit47.json';
import {lv2Unit47BeforeAudit} from './lv2Unit47Audit.testSupport';
import {lv2Unit48BeforeFormalAudit} from './lv2Unit48Audit.testSupport';
import corrections from '../../../docs/unit-audit-20261105/LV2-U47-curriculum-patches.json';
import main from '../../../docs/unit-audit-20261105/LV2-U47-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U47-notes-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U47-verified-forms-patches.json';
import formSources from '../../../docs/unit-audit-20261105/VERIFIED-LV2-U47-VERB-FORMS-SOURCES.json';
import inverse from '../../../docs/unit-audit-20261105/validation/LV2-U47-exact-inverse.json';
import research from '../../../docs/unit-audit-20261105/LV2-U47-source-research.json';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
it('guards every exact current source correction before restoring the original whole unit',()=>{
 expect(current.learningItems).toHaveLength(139);expect(corrections.patches).toHaveLength(98);expect(hash(current)).toBe(corrections.afterHash);
 expect(hash(lv2Unit47BeforeAudit(current))).toBe(corrections.beforeHash);expect(hash(JSON.parse(readFileSync(corrections.sourcePath,'utf8')))).toBe(corrections.sourceHash);
 for(const p of corrections.patches){const bad=structuredClone(current);const row=bad.learningItems.find(i=>i.learningItemId===p.id)! as Row;row[Object.keys(p.after)[0]]='unrecorded';expect(()=>lv2Unit47BeforeAudit(bad)).toThrow();}
 for(const mutate of [(c:typeof current)=>{c.learningItems.reverse();},(c:typeof current)=>{c.learningItems[0].displayWord='unrecorded';},(c:typeof current)=>{c.questions.push({questionId:'unrecorded'} as never);}]){const bad=structuredClone(current);mutate(bad);expect(hash(lv2Unit47BeforeAudit(bad))).not.toBe(corrections.beforeHash);}
});
it('retains ten null identities read-only boundaries and exact printed scoped meanings',()=>{
 const v=current.learningItems.filter(i=>i.kind==='vocabulary');expect(v).toHaveLength(98);expect(v.filter(i=>!i.officialWordId)).toHaveLength(10);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.questions).toEqual([]);expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!Object.hasOwn(i,'illustration')&&!Object.hasOwn(i,'originalExample')&&!i.officialSenseId)).toBe(true);
 const historical=lv2Unit47BeforeAudit(current).learningItems;
 for(const i of v.filter(i=>!i.officialWordId)){expect(i.meaningSource).toBe('unmapped_supplement');expect(i.officialWordId).toBeNull();expect(i.officialSenseId).toBeNull();expect(i.lexemeRef).toBe(historical.find(old=>old.learningItemId===i.learningItemId)!.lexemeRef);expect(i.targetMeaningZh).not.toContain('義項待核對');}
 const updated=corrections.patches.filter(p=>'meaningSource'in p.after);expect(updated.length).toBeGreaterThan(0);for(const p of updated){const row=v.find(i=>i.learningItemId===p.id)!;expect(row.officialWordId).toBeTruthy();expect(row.sourceRole).toBe('printed_related_word');expect(row.meaningSource).toBe('textbook_transcription');}
 expect(v.find(i=>i.learningItemId==='LI-LV2U47-V068')?.targetMeaningZh).toBe('complex 的複數（綜合大樓、建築群）');expect(v.find(i=>i.learningItemId==='LI-LV2U47-V090')?.officialWordId).toBe('W001081');
});
it('reverses only the recorded formal fields and preserves every other row in all four datasets',()=>{
 const ps=[...main.patches,...notes.patches,...forms.patches] as unknown as {dataset:string,key:string,id:string,before:Row,after:Row}[];expect(ps).toHaveLength(58);
 for(const [name,proof]of Object.entries(inverse.datasets)){const data=lv2Unit48BeforeFormalAudit(name,JSON.parse(readFileSync('public/data/v1/'+name+'.json','utf8'))) as Row[];expect(hash(data)).toBe(proof.afterHash);
  for(const p of [...ps].reverse().filter(p=>p.dataset===name)){const r=data.find(r=>r[p.key]===p.id)!;for(const[k,v]of Object.entries(p.after)){expect(r[k]).toEqual(v);if(JSON.stringify(p.before[k])===JSON.stringify({$absent:true}))delete r[k];else r[k]=structuredClone(p.before[k]);}}
  expect(hash(data)).toBe(proof.beforeHash);
 }
 expect(inverse.headwordIdentityPosAndStatusAll6090Unchanged).toBe(true);expect(inverse.practiceEnglishClozeAnswerAll7871Unchanged).toBe(true);
});
it('keeps four actual-target POS changes separate from defensible pop and little analyses',()=>{
 const pos=main.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after);expect(pos.map(p=>[p.id,p.after.sensePos])).toEqual([['EXf385c2c8','v.'],['EX3f500b2b','n.'],['EX444ac8f2','v.'],['EXc844d699','n.']]);
 for(const id of ['EX510c8dd3','EX860c8720','EXca52587a'])expect(main.patches.some(p=>p.id===id)).toBe(false);
 expect(main.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after)).toHaveLength(6);
 for(const p of main.patches.filter(p=>p.dataset==='examples'))expect(Object.keys(p.after).every(k=>['sensePos','meaningHint','status','sentenceZh'].includes(k))).toBe(true);
});
it('requires eleven lexical verb forms and preserves the formal non-verb panel boundary',()=>{
 const words=lv2Unit48BeforeFormalAudit('words',JSON.parse(readFileSync('public/data/v1/words.json','utf8'))) as Row[];expect(forms.patches).toHaveLength(11);
 for(const fact of formSources.facts){const row=words.find(w=>w.wordId===fact.wordId)!;expect(row.verbForms).toEqual(fact.verbForms);expect((row.posAll as string[])).toContain('v.');const copy={...row};delete copy.verbForms;expect(hash(copy)).toBe(fact.nonFormRowSha256);expect(fact.evidence[0].retrieval).toBe('direct_dictionary_word_forms');}
 for(const word of ['pop','soil','till'])expect(words.find(w=>w.word===word)).not.toHaveProperty('verbForms');
});
it('records full official question and answer checks without turning authored practices into quotations',()=>{
 expect(research.officialItems.map(i=>[i.year,i.item,i.officialAnswer,i.answerForm])).toEqual([[114,24,'F','survived'],[106,1,'B','properly'],[108,38,'J','obvious']]);
 for(const item of research.officialItems){expect(item.questionFullContextRead).toBe(true);expect(item.optionsRead).toBe(true);expect(item.questionUrl).toContain('www.ceec.edu.tw/files/');expect(item.answerUrl).toContain('www.ceec.edu.tw/files/');expect(item.practiceScope).toContain('不是');}
 expect(main.patches.find(p=>p.id==='W001683-1')?.after).toMatchObject({meaningZh:'（properly）正常地、恰當地'});
});
