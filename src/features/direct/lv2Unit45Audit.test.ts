import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import current from './curriculumLV2Unit45.json';
import source from '../../../scripts/sources/LV2Unit45.json';
import corrections from '../../../docs/unit-audit-20261105/LV2-U45-curriculum-patches.json';
import formal from '../../../docs/unit-audit-20261105/LV2-U45-patches.json';
import forms from '../../../docs/unit-audit-20261105/LV2-U45-verified-forms-patches.json';
import notes from '../../../docs/unit-audit-20261105/LV2-U45-notes-patches.json';
import wickedUsage from '../../../docs/unit-audit-20261105/LV2-U45-wicked-usage-followup.json';
import images from '../../../docs/unit-audit-20261105/validation/LV2-U45-image-review.json';
import {lv2Unit45BeforeAudit as restore} from './lv2Unit45Audit.testSupport';
import {buildUsagePatternItems} from '../vocabulary/usagePattern';
import {restoreRecordedAuditPatch} from '../../db/unitAudit.testSupport';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8')) as Row[];
const examples=JSON.parse(readFileSync('public/data/v1/examples.json','utf8')) as Row[];
it('restores exactly114 U45 displayed rows to the original whole hash and preserves raw source',()=>{
 expect(corrections.patches).toHaveLength(114);expect(hash(source)).toBe(corrections.sourceHash);expect(hash(current)).toBe(corrections.afterHash);expect(hash(restore(current))).toBe(corrections.beforeHash);
 expect(current.template.deliveryMode).toBe('text_only');expect(current.learningItems.every(i=>i.practiceMode==='read_only'&&!('illustration'in i)&&!('originalExample'in i)&&!i.officialSenseId)).toBe(true);
});
it('rejects every altered display after and preserves identities source order questions and modes',()=>{
 for(const p of corrections.patches)for(const field of Object.keys(p.after)){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===p.id)! as Row)[field]='unverified';expect(()=>restore(bad)).toThrow();}
 const id=structuredClone(current);id.learningItems.find(i=>i.learningItemId===corrections.patches[0].id)!.learningItemId='invented';expect(()=>restore(id)).toThrow();
 for(const field of ['officialWordId','officialSenseId','meaningSource','unlistedField']){const bad=structuredClone(current);(bad.learningItems[0] as Row)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}
 const order=structuredClone(current);order.learningItems.reverse();expect(hash(restore(order))).not.toBe(corrections.beforeHash);
 const q=structuredClone(current);(q.questions as unknown[]).push({questionId:'invented'});expect(hash(restore(q))).not.toBe(corrections.beforeHash);
 const mode=structuredClone(current);mode.template.deliveryMode='changed';expect(hash(restore(mode))).not.toBe(corrections.beforeHash);
 const duplicate=structuredClone(current);duplicate.learningItems.push(duplicate.learningItems[0]);expect(()=>restore(duplicate)).toThrow();
});
it('keeps twenty-one supplements unmapped and guards their exact printed visible meanings',()=>{
 const a=current.learningItems.filter(i=>i.meaningSource==='unmapped_supplement');expect(a).toHaveLength(21);
 for(const row of a){expect(row.officialWordId).toBeNull();expect(row.officialSenseId).toBeNull();expect(row.targetMeaningZh).not.toBe('教材補充詞；義項待核對。');for(const field of ['targetMeaningZh','chapterMeaningsZh']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Row)[field]='unverified';expect(()=>restore(bad)).toThrow();}for(const field of ['officialWordId','officialSenseId','meaningSource']){const bad=structuredClone(current);(bad.learningItems.find(i=>i.learningItemId===row.learningItemId)! as Row)[field]='invented';expect(hash(restore(bad))).not.toBe(corrections.beforeHash);}}
});
it('tags five actual cloze targets and refines only three pre-existing nonempty hints',()=>{
 const pos:Record<string,string>={EXb8000a13:'v.',EX245f0260:'adj.',EXae9f3be5:'n.',EXb3d5bac5:'n.',EX7298b4ef:'adj.'};
 for(const[id,sensePos]of Object.entries(pos))expect(examples.find(e=>e.exampleId===id)?.sensePos).toBe(sensePos);
 expect(formal.patches.filter(p=>p.dataset==='examples'&&'sensePos'in p.after)).toHaveLength(5);
 const hints=formal.patches.filter(p=>p.dataset==='examples'&&'meaningHint'in p.after);expect(hints).toHaveLength(3);for(const p of hints)expect(p.before.meaningHint).toBeTruthy();
 for(const p of formal.patches.filter(p=>p.dataset==='examples')){const e=examples.find(e=>e.exampleId===p.id)!;for(const k of ['sentenceEn','blankSentence','answer'])expect(e[k]).toEqual((p.before as Row)[k]);}
 expect(formal.patches.filter(p=>p.dataset==='examples'&&'status'in p.after)).toHaveLength(6);
});
it('limits Chinese precision to sand burial depth and the actual 2030 objective without invented facts',()=>{
 const p=formal.patches.filter(p=>p.dataset==='examples'&&'sentenceZh'in p.after);expect(p).toHaveLength(2);
 expect(p.find(p=>p.id==='EXf834964d')?.after).toEqual({sentenceZh:'考古學家發現了深埋在沙漠沙層下的古代陶器。'});
 expect(p.find(p=>p.id==='EX530970a6')?.after).toEqual({sentenceZh:'我們的主要目標是最遲於2030年減少碳排放。'});
 expect(examples.find(e=>e.exampleId==='EX530970a6')?.sentenceEn).toBe('Our main objective is to reduce carbon emissions by 2030.');
});
it('adds eighteen exact absent lexical forms while distinguishing found from the separate lemma find',()=>{
 expect(forms.patches).toHaveLength(18);for(const p of forms.patches){expect(p.before).toEqual({verbForms:{$absent:true}});const w=words.find(w=>w.wordId===p.id)!;expect(w.posAll as string[]).toContain('v.');expect(w.verbForms).toEqual(p.after.verbForms);}
 const found=words.find(w=>w.word==='found')!;expect(found.meaningZh).toContain('動詞原形 found');expect(found.meaningZh).toContain('find 的過去式和過去分詞');expect(found.verbForms).toMatchObject({base:'found',past:'founded',pastParticiple:'founded'});
 const find=words.find(w=>w.word==='find')!;expect(find.verbForms).toMatchObject({base:'find',past:'found',pastParticiple:'found'});
 expect(forms.patches.find(p=>p.after.verbForms.base==='tunnel')?.after.verbForms).toMatchObject({past:'tunneled',pastParticiple:'tunneled',sourceRef:'https://www.collinsdictionary.com/us/dictionary/english/tunnel'});
 for(const name of ['pound','partner','devil','mouse','find','class','lead'])expect(forms.patches.some(p=>p.after.verbForms.base===name)).toBe(false);
});
it('retains supported rare senses and actual paired constructions while making scope visible',()=>{
 for(const p of formal.patches.filter(p=>p.dataset==='words'&&('usagePattern'in p.after||'usagePatternZh'in p.after))){const w=words.find(w=>w.wordId===p.id)!;const items=buildUsagePatternItems(w.usagePattern as string,w.usagePatternZh as string);expect(items.length).toBeGreaterThan(0);expect(items.every(i=>i.chinese)).toBe(true);}
 for(const[word,term]of [['tradition','法律'],['rat','髮墊'],['classic','大藝術家'],['objective','賓格'],['breadth','另詞 breach'],['china','另詞 Chinese']])expect(words.find(w=>w.word===word)?.meaningZh).toContain(term);
 expect(words.find(w=>w.word==='leader')?.meaningEn).toContain('editorial');expect(words.find(w=>w.word==='pottery')?.meaningEn).toContain('factory');
 expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U45-G027')?.explanationZh).toContain('正常時態');expect(current.learningItems.find(i=>i.learningItemId==='LI-LV2U45-G024')?.explanationZh).toContain('founded');expect(notes.patches.every(p=>Object.keys(p.after).join()==='content')).toBe(true);
});
it('keeps four complete official items separate from authored practices and preserves all forty independent images',()=>{
 const expected:Record<string,string>={'W001046-1':'D argue','W001651-1':'C pose','W001465-1':'E insisted','W001727-1':'A requirements'};
 expect(formal.patches.filter(p=>p.dataset==='senses')).toHaveLength(11);for(const[id,text]of Object.entries(expected)){const p=formal.patches.find(p=>p.id===id)!;expect(p.after.examEvidence).toContain(text);expect(p.after.note).toContain('來源界線');}
 expect(images.images).toHaveLength(40);expect(images.confirmedRepairPending).toHaveLength(0);for(const image of images.images)expect(createHash('sha256').update(readFileSync('public/'+image.path)).digest('hex')).toBe(image.sha256);
 expect(images.images.find(i=>i.word==='found')?.limitation).toContain('find-inflection');
});
it('restores the initial wicked Chinese state only after validating both current pairs and immutable English',()=>{
 const p=wickedUsage.patches[0],row=structuredClone(words.find(w=>w.wordId===p.id)!);
 expect(buildUsagePatternItems(row.usagePattern as string,row.usagePatternZh as string)).toEqual([{english:'be wicked',chinese:'是邪惡的'},{english:'wicked + N',chinese:'邪惡的……（修飾名詞）'}]);
 expect(()=>restoreRecordedAuditPatch('words',{...row,usagePattern:'unverified'},p)).toThrow();expect(()=>restoreRecordedAuditPatch('words',{...row,usagePatternZh:'unverified'},p)).toThrow();
 const before=structuredClone(row);restoreRecordedAuditPatch('words',row,p);expect(row).toEqual({...before,usagePatternZh:p.before.usagePatternZh});
});
