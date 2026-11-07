import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit48.json';
import {lv2Unit48BeforeAudit,lv2Unit48BeforeFormalAudit} from './lv2Unit48Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
import {restoreRecordedAuditPatch} from '../../db/unitAudit.testSupport';
import corrections from '../../../docs/unit-audit-20261105/LV2-U48-curriculum-patches.json';
import main from '../../../docs/unit-audit-20261105/LV2-U48-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U48-notes-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U48-verified-forms-patches.json';
import formSources from '../../../docs/unit-audit-20261105/VERIFIED-LV2-U48-VERB-FORMS-SOURCES.json';
import inverse from '../../../docs/unit-audit-20261105/validation/LV2-U48-exact-inverse.json';
import research from '../../../docs/unit-audit-20261105/LV2-U48-source-research.json';
import imageReview from '../../../docs/unit-audit-20261105/validation/LV2-U48-image-review.json';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const data=(name:string)=>JSON.parse(readFileSync('public/data/v1/'+name+'.json','utf8')) as Row[];
it('checks exact 112 printed corrections before restoring the complete historical unit',()=>{
 expect(current.learningItems).toHaveLength(152);expect(corrections.patches).toHaveLength(112);expect(hash(current)).toBe(corrections.afterHash);
 expect(hash(lv2Unit48BeforeAudit(current))).toBe(corrections.beforeHash);expect(hash(JSON.parse(readFileSync(corrections.sourcePath,'utf8')))).toBe(corrections.sourceHash);
 for(const p of corrections.patches){const bad=structuredClone(current);const row=bad.learningItems.find(i=>i.learningItemId===p.id)! as Row;for(const key of Object.keys(p.after)){const value=row[key];row[key]='unrecorded';expect(()=>lv2Unit48BeforeAudit(bad)).toThrow();row[key]=value;}}
 for(const mutate of [(c:typeof current)=>{c.learningItems.reverse();},(c:typeof current)=>{c.learningItems[0].displayWord='unrecorded';},(c:typeof current)=>{c.learningItems[0].learningItemId='unrecorded';},(c:typeof current)=>{c.questions.push({questionId:'unrecorded'} as never);},(c:typeof current)=>{c.template.deliveryMode='illustrated' as never;}]){const bad=structuredClone(current);mutate(bad);expect(()=>expect(hash(lv2Unit48BeforeAudit(bad))).toBe(corrections.beforeHash)).toThrow();}
});
it('keeps twelve null identities and all text-only boundaries while restoring printed related meanings',()=>{
 const v=current.learningItems.filter(i=>i.kind==='vocabulary'),historical=lv2Unit48BeforeAudit(current).learningItems;
 expect(v).toHaveLength(86);expect(v.filter(i=>!i.officialWordId)).toHaveLength(12);expect(current.template.deliveryMode).toBe('text_only');expect(current.questions).toEqual([]);
 expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!Object.hasOwn(i,'illustration')&&!Object.hasOwn(i,'originalExample')&&!i.officialSenseId)).toBe(true);
 for(const i of v.filter(i=>!i.officialWordId)){expect(i.meaningSource).toBe('unmapped_supplement');expect(i.officialWordId).toBeNull();expect(i.officialSenseId).toBeNull();expect(i.lexemeRef).toBe(historical.find(old=>old.learningItemId===i.learningItemId)!.lexemeRef);expect(i.targetMeaningZh).not.toContain('義項待核對');}
 expect(v.filter(i=>i.sourceRole==='printed_related_word')).toHaveLength(46);expect(v.find(i=>i.learningItemId==='LI-LV2U48-V073')?.officialWordId).toBeNull();
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U48-G026')?.explanationZh).toContain('the heavens');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U48-G054')?.pattern).toContain("one's hand");
});
it('restores only seventy exact formal operations and rejects recorded-field and identity drift',()=>{
 expect([...main.patches,...notes.patches,...forms.patches]).toHaveLength(70);
 for(const[name,proof]of Object.entries(inverse.datasets)){const rows=data(name);expect(hash(rows)).toBe(proof.afterHash);expect(hash(lv2Unit48BeforeFormalAudit(name,rows))).toBe(proof.beforeHash);}
 const currentRows=Object.fromEntries(['words','senses','examples','notes'].map(name=>[name,data(name)]));
 // Check every recorded after field directly, without reparsing and cloning
 // the whole payload for every malformed row. The positive whole-pack hashes
 // above and unrecorded-field hash below still cover all rows and fields.
 for(const p of main.patches){const row=currentRows[p.dataset].find(r=>r[p.key]===p.id)!;for(const key of Object.keys(p.after))expect(()=>restoreRecordedAuditPatch(p.dataset,{...row,[key]:'unrecorded'},p)).toThrow();}
 for(const name of Object.keys(currentRows)){const p=[...main.patches,...notes.patches,...forms.patches].find(p=>p.dataset===name)!;const row=currentRows[name].find(r=>r[p.key]===p.id)!;row[p.key]='unrecorded';expect(()=>lv2Unit48BeforeFormalAudit(name,currentRows[name])).toThrow();}
 const extra=data('words');extra[0].meaningZh='unrecorded';expect(hash(lv2Unit48BeforeFormalAudit('words',extra))).not.toBe(inverse.datasets.words.beforeHash);
 expect(inverse.headwordIdentityPosAndStatusAll6090Unchanged).toBe(true);expect(inverse.practiceEnglishClozeAnswerAll7871Unchanged).toBe(true);
});
it('limits six POS corrections to actual cloze targets and preserves all empty hints',()=>{
 expect(main.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after).map(p=>[p.id,p.after.sensePos])).toEqual([['EX76f5b9d3','n.'],['EX30907e1b','n.'],['EXf5b3f6ba','v.'],['EXcf6f8163','n.'],['EX423238d9','v.'],['EX6ba3105a','v.']]);
 expect(main.patches.some(p=>'meaningHint'in p.after)).toBe(false);for(const p of main.patches.filter(p=>p.dataset==='examples'))expect(Object.keys(p.after).every(k=>['sensePos','status','sentenceZh'].includes(k))).toBe(true);
});
it('requires twenty sourced lexical forms with exact non-form rows and true missing-key reversal',()=>{
 const words=data('words');expect(forms.patches).toHaveLength(20);
 for(const fact of formSources.facts){const row=words.find(w=>w.wordId===fact.wordId)!;expect(row.verbForms).toEqual(fact.verbForms);expect(row.posAll).toContain('v.');const copy={...row};delete copy.verbForms;expect(hash(copy)).toBe(fact.nonFormRowSha256);expect(fact.evidence[0].retrieval).toBe('direct_dictionary_word_forms');}
 for(const word of ['court','minister','bicycle/bike','downstairs','upstairs'])expect(words.find(w=>w.word===word)).not.toHaveProperty('verbForms');
 expect(formSources.facts.find(f=>f.word==='saw')?.verbForms).toMatchObject({past:'sawed',pastParticiple:'sawn / sawed'});expect(formSources.facts.find(f=>f.word==='lay')?.verbForms.past).toBe('laid');
});
it('preserves original official account evidence and distinguishes the authored practice',()=>{
 expect(research.officialItems.map(i=>[i.year,i.item,i.officialAnswer,i.answerForm])).toEqual([[107,36,'A','account']]);
 const item=research.officialItems[0];expect(item.questionFullContextRead&&item.optionsRead&&item.answerTableRead).toBe(true);expect(item.questionUrl).toContain('www.ceec.edu.tw/files/');expect(item.answerUrl).toContain('www.ceec.edu.tw/files/');expect(item.practiceScope).toContain('不是');
});
it('keeps changed English and Chinese usage groups aligned and all seventeen image assets unchanged',()=>{
 const words=data('words');for(const p of main.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>Boolean(i.chinese))).toBe(true);}
 expect(imageReview.images).toHaveLength(17);for(const im of imageReview.images){expect(createHash('sha256').update(readFileSync('public/'+im.path)).digest('hex')).toBe(im.sha256);expect(im.pixelsActuallyViewed).toBe(true);}
});
