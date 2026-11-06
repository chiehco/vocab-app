import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit44.json';
import source from '../../../scripts/sources/LV2Unit44.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U44-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U44-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U44-verified-forms-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U44-notes-patches.json';
import imageReview from '../../../docs/unit-audit-20261105/validation/LV2-U44-building-image-followup.json';
import {lv2Unit44BeforeAudit as restore} from './lv2Unit44Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Row[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Row[];
it('restores exactly117 U44 displayed rows to the original whole hash and retains the source',()=>{
 expect(corrections.patches).toHaveLength(117);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('rejects every unverified display after value and protects identities order questions and modes',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Row)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===corrections.patches[0].id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 for(const field of ['officialWordId','officialSenseId','meaningSource','unlistedField']){const bad=structuredClone(current);(bad.learningItems[0] as Row)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const q=structuredClone(current);(q.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(q))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const duplicate=structuredClone(current);duplicate.learningItems.push(duplicate.learningItems[0]);expect(()=>restore(duplicate)).toThrow();
});
it('keeps fourteen supplements unmapped while validating their precise printed meanings',()=>{
 const a=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(a).toHaveLength(14);
 for(const row of a){expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Row)[field]='unverified';expect(()=>restore(bad)).toThrow();}for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Row)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}}
});
it('tags the cloze itself in noun verb adjective and contracted auxiliary contexts',()=>{
 const pos:Record<string,string>={EX3a0324b5:'n.',EX0e74ff11:'v.',EX18fefe24:'adj.',EXc17bb94d:'v.',EX900fd098:'v.',EX1e16620b:'v.',EX1804bdf9:'v.',EX1431a457:'v.',EX86879202:'v.',EX2f8b9882:'n.',EX74470cee:'n.',EXd84d8b74:'aux.',EXeccdbf2e:'n.',EXee12e497:'aux.'};
 for(const[id,sensePos]of Object.entries(pos))expect(examples.find(e=>e.exampleId===id)?.sensePos).toBe(sensePos);
 expect(examples.find(e=>e.exampleId==='EX18fefe24')?.word).toBe('comic(s)');expect(examples.find(e=>e.exampleId==='EXd84d8b74')?.answer).toBe("I'll");
 expect(formal.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after)).toHaveLength(14);
 const hints=formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(10);for(const p of hints)expect(p.before.meaningHint).toBeTruthy();
 for(const p of formal.patches.filter(p=>p.dataset==='examples')){const e=examples.find(e=>e.exampleId===p.id)!;for(const k of ['sentenceEn','blankSentence','answer'])expect(e[k]).toEqual((p.before as Row)[k]);}
 const inShort=formal.patches.find(p=>p.id==='EXe5f73d0e')!;expect(inShort.after).toEqual({meaningHint:'簡言之（in short）'});
});
it('limits three Chinese fixes to exact deadline scope and duplicated measure wording',()=>{
 const expected:Record<string,string>={EXfe7adb4e:'郵差最遲會在五點把包裹送到你家門口。',EXddf05900:'班上每一位學生都必須最遲在星期五下午繳交報告。',EXe95ee4e3:'這次暑期實習教會我關於團隊合作與溝通的寶貴一課。'};
 const p=formal.patches.filter(p=>p.dataset==='examples'&&'sentenceZh'in p.after);expect(p).toHaveLength(3);for(const row of p)expect(row.after).toEqual({sentenceZh:expected[row.id]});
});
it('adds only17 truly absent lexical verb forms with exact sources and no modal will forms',()=>{
 expect(forms.patches).toHaveLength(17);for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});const w=words.find(w=>w.wordId===p.id)!;expect(w.posAll as string[]).toContain('v.');expect(w.verbForms).toEqual(p.after.verbForms);}
 for(const id of ['W000975','W001148','W003716','W001340'])expect(forms.patches.some(p=>p.id===id)).toBe(false);
 expect(forms.patches.find(p=>p.id==='W001948')?.after.verbForms).toMatchObject({base:'upset',past:'upset',pastParticiple:'upset'});
 expect(forms.patches.find(p=>p.id==='W001131')?.after.verbForms.sourceRef).toBe('https://www.infopedia.pt/dicionarios/verbos-ingleses/cartoon');
});
it('preserves real rare senses while making headword scope and paired constructions visible',()=>{
 for(const p of formal.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}
 expect(words.find(w=>w.wordId==='W001948')?.meaningEn).toContain('tool');expect(words.find(w=>w.wordId==='W001340')?.meaningZh).toContain('古語');expect(words.find(w=>w.wordId==='W005008')?.meaningZh).toContain('名詞');
 expect(words.find(w=>w.wordId==='W001227')?.meaningZh).toContain('另詞 date');expect(words.find(w=>w.wordId==='W001227')?.meaningZh).not.toContain('DOS內部命令');
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U44-G012')?.explanationZh).toContain('不代表所有');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U44-G026')?.pattern).toBe("as be one's custom");expect(notes.patches.every(p=>Object.keys(p.after).join()==='content')).toBe(true);
});
it('keeps official pizza item evidence separate from the sofa practice and leaves repair pending',()=>{
 const deliver=formal.patches.find(p=>p.id==='W001236-1')!;expect(deliver.after.examEvidence).toContain('B delivered');expect(deliver.after.note).toContain('非原題逐字引文');expect(formal.patches.some(p=>p.id==='EX4035dd7f')).toBe(false);
 expect(imageReview.candidateExists).toBe(false);expect(imageReview.attempt.generationStarted).toBe(false);expect(imageReview.attempt.denied).toBe(false);expect(imageReview.oldAssetAndBindingsPreserved).toBe(true);
});
