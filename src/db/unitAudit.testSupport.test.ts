import lv2u28 from '../../docs/unit-audit-20261105/LV2-U28-patches.json';
import lv2u28Forms from '../../docs/unit-audit-20261105/LV2-U28-verified-forms-patches.json';
import lv2u28FormSources from '../../docs/unit-audit-20261105/VERIFIED-LV2-U28-VERB-FORMS-SOURCES.json';
import lv2u28Notes from '../../docs/unit-audit-20261105/LV2-U28-notes-patches.json';
import lv2u27 from '../../docs/unit-audit-20261105/LV2-U27-patches.json';
import lv2u27Forms from '../../docs/unit-audit-20261105/LV2-U27-verified-forms-patches.json';
import lv2u27FormSources from '../../docs/unit-audit-20261105/VERIFIED-LV2-U27-VERB-FORMS-SOURCES.json';
import lv2u27Notes from '../../docs/unit-audit-20261105/LV2-U27-notes-patches.json';
import u25 from '../../docs/unit-audit-20261105/LV1-U25-patches.json';
import u25Forms from '../../docs/unit-audit-20261105/LV1-U25-verified-forms-patches.json';
import u25FormSources from '../../docs/unit-audit-20261105/VERIFIED-U25-VERB-FORMS-SOURCES.json';
import u24Notes from '../../docs/unit-audit-20261105/LV1-U24-usage-note-followup.json';
import u24Forms from '../../docs/unit-audit-20261105/LV1-U24-verified-forms-patches.json';
import u24FormSources from '../../docs/unit-audit-20261105/VERIFIED-U24-VERB-FORMS-SOURCES.json';
import u23 from '../../docs/unit-audit-20261105/LV1-U23-patches.json';
import u23Forms from '../../docs/unit-audit-20261105/LV1-U23-verified-forms-patches.json';
import u23FormSources from '../../docs/unit-audit-20261105/VERIFIED-U23-VERB-FORMS-SOURCES.json';
import u23Translations from '../../docs/unit-audit-20261105/LV1-U23-translation-precision.json';
import u22Forms from '../../docs/unit-audit-20261105/LV1-U22-verified-forms-patches.json';
import u22FormSources from '../../docs/unit-audit-20261105/VERIFIED-U22-VERB-FORMS-SOURCES.json';
import u22Translations from '../../docs/unit-audit-20261105/LV1-U22-translation-precision.json';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import baseline from '../../scripts/fixtures/recovered-unit-integration-baseline.json';
import u1 from '../../docs/unit-audit-20261105/LV1-U01-patches.json';
import starterBaseline from '../../scripts/fixtures/lv4-u2-notes-confirmation-baseline.json';
import {beforeUnitAudit,restoreRecordedAuditPatch} from './unitAudit.testSupport';
import forms from '../../docs/unit-audit-20261105/LV1-U01-U02-verb-forms-followup.json';
import translations from '../../docs/unit-audit-20261105/LV1-verified-translations-followup.json';
import followups from '../../docs/unit-audit-20261105/LV1-U03-U04-verified-forms-patches.json';
import followupSources from '../../docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json';
import originalSources from '../../docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json';
import u14Translation from '../../docs/unit-audit-20261105/LV1-U14-translation-followup.json';
import u16Forms from '../../docs/unit-audit-20261105/LV1-U16-verified-forms-patches.json';
import u16FormSources from '../../docs/unit-audit-20261105/VERIFIED-U16-VERB-FORMS-SOURCES.json';
import wordingFollowup from '../../docs/unit-audit-20261105/LV1-U11-U12-U15-wording-followup.json';
import dieNote from '../../docs/unit-audit-20261105/LV1-U08-die-note-followup.json';
import u17Forms from '../../docs/unit-audit-20261105/LV1-U17-verified-forms-patches.json';
import u17FormSources from '../../docs/unit-audit-20261105/VERIFIED-U17-VERB-FORMS-SOURCES.json';

import u18Forms from '../../docs/unit-audit-20261105/LV1-U18-verified-forms-patches.json';
import u18FormSources from '../../docs/unit-audit-20261105/VERIFIED-U18-VERB-FORMS-SOURCES.json';
import u18Translations from '../../docs/unit-audit-20261105/LV1-U18-translation-precision.json';

import u19Forms from '../../docs/unit-audit-20261105/LV1-U19-verified-forms-patches.json';
import u19FormSources from '../../docs/unit-audit-20261105/VERIFIED-U19-VERB-FORMS-SOURCES.json';
import u20Forms from '../../docs/unit-audit-20261105/LV1-U20-verified-forms-patches.json';
import u20FormSources from '../../docs/unit-audit-20261105/VERIFIED-U20-VERB-FORMS-SOURCES.json';
import u21Forms from '../../docs/unit-audit-20261105/LV1-U21-verified-forms-patches.json';
import u21FormSources from '../../docs/unit-audit-20261105/VERIFIED-U21-VERB-FORMS-SOURCES.json';
import integratedU05U06 from '../../docs/unit-audit-20261105/LV1-U05-U06-integrated-forms-patches.json';
import integratedU05U06Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U05-U06-VERB-FORMS-SOURCES.json';
import integratedU07 from '../../docs/unit-audit-20261105/LV1-U07-integrated-forms-patches.json';
import integratedU07Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U07-VERB-FORMS-SOURCES.json';
import integratedU08U09 from '../../docs/unit-audit-20261105/LV1-U08-U09-integrated-forms-patches.json';
import integratedU08U09Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U08-U09-VERB-FORMS-SOURCES.json';
import integratedU10 from '../../docs/unit-audit-20261105/LV1-U10-integrated-forms-patches.json';
import integratedU10Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U10-VERB-FORMS-SOURCES.json';
import integratedU11 from '../../docs/unit-audit-20261105/LV1-U11-integrated-forms-patches.json';
import integratedU11Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U11-VERB-FORMS-SOURCES.json';
import integratedU12 from '../../docs/unit-audit-20261105/LV1-U12-integrated-forms-patches.json';
import integratedU12Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U12-VERB-FORMS-SOURCES.json';
import integratedU13 from '../../docs/unit-audit-20261105/LV1-U13-integrated-forms-patches.json';
import integratedU14 from '../../docs/unit-audit-20261105/LV1-U14-integrated-forms-patches.json';
import integratedU15 from '../../docs/unit-audit-20261105/LV1-U15-integrated-forms-patches.json';
import integratedU13Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U13-VERB-FORMS-SOURCES.json';
import integratedU14Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U14-VERB-FORMS-SOURCES.json';
import integratedU15Sources from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U15-VERB-FORMS-SOURCES.json';
type Row=Record<string,unknown>;
const examples:Row[]=JSON.parse(readFileSync('public/data/v1/examples.json','utf8'));
function stable(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable((value as Row)[k])]));
 return value;
}
const hash=(rows:Row[])=>createHash('sha256').update(JSON.stringify(stable(beforeUnitAudit('examples',rows)))).digest('hex');
const historical=baseline.fullPublicFiles.find(f=>f.name==='examples.json')!.payloadHash;

it('retains the historical hash and exposes unlisted column and row mutations to it',()=>{
 expect(hash(examples)).toBe(historical);
 const unlistedColumn=structuredClone(examples);
 unlistedColumn[0].sentenceEn='An unrecorded sentence change.';
 expect(hash(unlistedColumn)).not.toBe(historical);
 expect(hash([...examples,{exampleId:'EXunrecorded',sentenceEn:'An unrecorded row.'}])).not.toBe(historical);
 expect(hash(examples.slice(1))).not.toBe(historical);
});

it('rejects an unexpected after value and duplicate audited identity',()=>{
 const audit=u1.patches.find(p=>p.dataset==='examples')!;
 const rows=structuredClone(examples);
 const row=rows.find(r=>r[audit.key]===audit.id)!;
 row[Object.keys(audit.after)[0]]='unrecorded value';
 expect(()=>beforeUnitAudit('examples',rows)).toThrow();
 const original=examples.find(r=>r[audit.key]===audit.id)!;
 expect(()=>beforeUnitAudit('examples',[...examples,original])).toThrow('duplicate');
});

it('allows omitted full-dictionary rows in starter subsets without claiming completeness',()=>{
 expect(beforeUnitAudit('examples',[])).toEqual([]);
 expect(hash([])).not.toBe(historical);
});

it('reverses only recorded starter corrections while retaining the old whole-pack fixture',()=>{
 const pack=JSON.parse(readFileSync('public/data/v1/sa-pack.json','utf8'));
 const restored=beforeUnitAudit('sa-pack.json',pack);
 const actual=createHash('sha256').update(JSON.stringify(stable(restored))).digest('hex');
 expect(actual).toBe(starterBaseline.publicFiles.find(f=>f.name==='sa-pack.json')!.payloadHash);
 const column=structuredClone(pack);column.examples[0].sentenceEn='Unrecorded starter sentence';
 expect(()=>beforeUnitAudit('sa-pack',column)).toThrow('contentHash');
 const row=structuredClone(pack);row.examples.push({exampleId:'EXunrecorded'});
 expect(()=>beforeUnitAudit('sa-pack',row)).toThrow('contentHash');
 const metadata=structuredClone(pack);metadata.meta.wordsHash='sa:wrong';
 expect(()=>beforeUnitAudit('sa-pack',metadata)).toThrow('wordsHash');
});

it('restores genuine missing optional keys and rejects unverified forms or identities',()=>{
 const p=forms.patches[0];const row:Row={wordId:p.id,word:'arm',pos:'n. v.',status:'draft',...p.after};
 restoreRecordedAuditPatch('words',row,p);expect(Object.hasOwn(row,'verbForms')).toBe(false);expect(row.status).toBe('draft');
 expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,id:'Wunknown'})).toThrow('source-verified');
 expect(()=>restoreRecordedAuditPatch('words',{verbForms:null},p)).toThrow();
 expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
});

it('checks unchanged English guards and reverses only exact verified Chinese corrections',()=>{
 const p=translations.patches[0];const row:Row={...p.before,...p.after,answer:'died'};
 restoreRecordedAuditPatch('examples',row,p);expect(row.sentenceZh).toBe(p.before.sentenceZh);expect(row.sentenceEn).toBe(p.before.sentenceEn);expect(row.answer).toBe('died');
 expect(()=>restoreRecordedAuditPatch('examples',{...p.after,sentenceEn:'Unrecorded English'},p)).toThrow('source guard');
 expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,id:'EXunknown'})).toThrow('verified translations');
});

it('reverses only exact followup fields to absent and retains the original 31 source facts',()=>{
 expect(originalSources.facts).toHaveLength(31);
 const originalIds=new Set(originalSources.facts.map(f=>f.wordId));
 expect(followupSources.facts.every(f=>!originalIds.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of followups.patches){
  const row=structuredClone(words.find(row=>row.wordId===p.id)!);
  const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);
  expect(Object.hasOwn(row,'verbForms')).toBe(false);
  expect(row).toEqual(preserved);
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const changed=structuredClone(p);
   (changed.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...changed.after},changed)).toThrow();
  }
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 expect(words.find(row=>row.wordId==='W000139')).not.toHaveProperty('verbForms');
});

it('restores only the verified daily-school Chinese translation with unchanged English and cloze',()=>{
 const p=u14Translation.patches[0];
 const current=structuredClone(examples.find(e=>e.exampleId===p.id)!);
 const immutable={sentenceEn:current.sentenceEn,blankSentence:current.blankSentence,answer:current.answer,sensePos:current.sensePos};
 restoreRecordedAuditPatch('examples',current,p);
 expect(current.sentenceZh).toBe(p.before.sentenceZh);
 for(const [key,value]of Object.entries(immutable))expect(current[key]).toEqual(value);
 expect(()=>restoreRecordedAuditPatch('examples',{...p.after,sentenceEn:'Unrecorded English drift'},p)).toThrow('source guard');
 expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,id:'EXoutside_scope'})).toThrow('verified translations');
});

it('restores only the 25 individually verified U16 optional fields and rejects broader forms',()=>{
 expect(u16FormSources.facts).toHaveLength(25);
 const earlier=new Set([...originalSources.facts,...followupSources.facts].map(f=>f.wordId));
 expect(u16FormSources.facts.every(f=>!earlier.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u16Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(preserved);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...wrong.after},wrong)).toThrow();
  }
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 expect(words.find(w=>w.wordId==='W000139')).not.toHaveProperty('verbForms');
});

it('limits the three wording translations and dryer typo without reverting the corrected purchase verb',()=>{
 for(const p of wordingFollowup.patches){
  const rows:Row[]=JSON.parse(readFileSync(`public/data/v1/${p.dataset}.json`,'utf8'));
  const row=structuredClone(rows.find(r=>r[p.key]===p.id)!);
  const preserved={...row};
  restoreRecordedAuditPatch(p.dataset,row,p);
  for(const k of Object.keys(p.after))preserved[k]=(p.before as Row)[k];
  expect(row).toEqual(preserved);
  if(p.id==='EX299bccf8')expect(row.sensePos).toBe('v.');
  if(p.dataset==='examples')expect(()=>restoreRecordedAuditPatch('examples',{...p.after,sentenceEn:'English drift'},p)).toThrow('source guard');
  if(p.id==='W001283')expect(row.status).toBe('draft');
 }
});

it('retains the historical whole-note baseline and reverses only one exact duplicate Chinese translation',()=>{
 const notes:Row[]=JSON.parse(readFileSync('public/data/v1/notes.json','utf8'));
 const restored=beforeUnitAudit('notes',notes);
 const actual=createHash('sha256').update(JSON.stringify(stable(restored))).digest('hex');
 expect(actual).toBe(baseline.fullPublicFiles.find(f=>f.name==='notes.json')!.payloadHash);
 const p=dieNote.patches[0],row=structuredClone(notes.find(n=>n.noteId===p.id)!);
 restoreRecordedAuditPatch('notes',row,p);expect(row.content).toBe(p.before.content);expect(row.status).toBe('approved');expect(row.title).toBe('die of / from...');
 expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,id:'NXoutside'})).toThrow('verified note');
 expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after,title:'Changed title'},p)).toThrow('source guard');
 const unlisted=structuredClone(notes);unlisted.find(n=>n.noteId!==p.id)!.content='Unlisted note drift';
 expect(createHash('sha256').update(JSON.stringify(stable(beforeUnitAudit('notes',unlisted)))).digest('hex')).not.toBe(actual);
});

it('restores only 18 exact U17 missing forms and rejects false absence or unverified forms',()=>{
 expect(u17FormSources.facts).toHaveLength(18);
 const earlier=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts].map(f=>f.wordId));
 expect(u17FormSources.facts.every(f=>!earlier.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u17Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(preserved);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...wrong.after},wrong)).toThrow();}
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 for(const id of ['W000717','W000639'])expect(words.find(w=>w.wordId===id)).not.toHaveProperty('verbForms');
});
it('restores only 20 exact U18 missing forms and rejects false absence or unverified forms',()=>{
 expect(u18FormSources.facts).toHaveLength(20);
 const earlier=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts].map(f=>f.wordId));
 expect(u18FormSources.facts.every(f=>!earlier.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u18Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(preserved);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...wrong.after},wrong)).toThrow();}
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 for(const id of ['W000717','W000639'])expect(words.find(w=>w.wordId===id)).not.toHaveProperty('verbForms');
});

it('reverses only the two optional U18 Chinese refinements with immutable English and cloze',()=>{
 for(const p of u18Translations.patches){const row=structuredClone(examples.find(e=>e.exampleId===p.id)!);const original={...row};restoreRecordedAuditPatch('examples',row,p);expect(row.sentenceZh).toBe(p.before.sentenceZh);expect({...row,sentenceZh:original.sentenceZh}).toEqual(original);expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after,sentenceEn:'drift'},p)).toThrow();expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,id:'EXoutside'})).toThrow();}
});
it('restores only 13 exact U19 missing forms and rejects false absence or unverified forms',()=>{
 expect(u19FormSources.facts).toHaveLength(13);
 const earlier=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts].map(f=>f.wordId));
 expect(u19FormSources.facts.every(f=>!earlier.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u19Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(preserved);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...wrong.after},wrong)).toThrow();}
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 for(const id of ['W000717','W000639'])expect(words.find(w=>w.wordId===id)).not.toHaveProperty('verbForms');
});

it('restores only 15 exact U20 missing forms and rejects false absence or unverified forms',()=>{
 expect(u20FormSources.facts).toHaveLength(15);
 const earlier=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts].map(f=>f.wordId));
 expect(u20FormSources.facts.every(f=>!earlier.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u20Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(preserved);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...wrong.after},wrong)).toThrow();}
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 for(const id of ['W000862','W000717','W000639'])expect(words.find(w=>w.wordId===id)).not.toHaveProperty('verbForms');
});

it('restores only 9 exact U21 missing forms and rejects false absence or unverified forms',()=>{
 expect(u21FormSources.facts).toHaveLength(9);
 const earlier=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts].map(f=>f.wordId));
 expect(u21FormSources.facts.every(f=>!earlier.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u21Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);const preserved={...row};delete preserved.verbForms;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(preserved);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...wrong.after},wrong)).toThrow();}
  expect(()=>restoreRecordedAuditPatch('words',{...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 for(const id of ['W000862','W000717','W000639'])expect(words.find(w=>w.wordId===id)).not.toHaveProperty('verbForms');
});

it('reverses only45 integrated U05-U06 fields and protects every other exact word field',()=>{
 expect(integratedU05U06Sources.facts).toHaveLength(45);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts].map(f=>f.wordId));
 expect(integratedU05U06Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU05U06.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  if(p.id==='W000628')restoreRecordedAuditPatch('words',row,lv2u28.patches.find(q=>q.dataset==='words'&&q.id===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
 const show=words.find(w=>w.wordId==='W000772')!;expect((show.verbForms as Row).sourceRef).toBe('https://www.collinsdictionary.com/dictionary/english/show; https://www.collinsdictionary.com/conjugation/english/show');
 const caseWord=words.find(w=>w.wordId==='W000147')!;expect((caseWord.verbForms as Row).sourceRef).toBe('https://www.collinsdictionary.com/dictionary/english/case; https://www.collinsdictionary.com/us/conjugation/english/case');
});

it('reverses only36 integrated U07 fields and protects every other exact word field',()=>{
 expect(integratedU07Sources.facts).toHaveLength(36);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts].map(f=>f.wordId));
 expect(integratedU07Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU07.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only49 integrated U08-U09 fields and protects every other exact word field',()=>{
 expect(integratedU08U09Sources.facts).toHaveLength(49);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts].map(f=>f.wordId));
 expect(integratedU08U09Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU08U09.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only26 integrated U10 fields and protects every other exact word field',()=>{
 expect(integratedU10Sources.facts).toHaveLength(26);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts,...integratedU08U09Sources.facts].map(f=>f.wordId));
 expect(integratedU10Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU10.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only25 integrated U11 fields and protects every other exact word field',()=>{
 expect(integratedU11Sources.facts).toHaveLength(25);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts,...integratedU08U09Sources.facts,...integratedU10Sources.facts].map(f=>f.wordId));
 expect(integratedU11Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU11.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);for(const later of u23.patches.filter(q=>q.dataset==='words'&&q.id===p.id))restoreRecordedAuditPatch('words',row,later);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only28 integrated U12 fields and protects every other exact word field',()=>{
 expect(integratedU12Sources.facts).toHaveLength(28);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts,...integratedU08U09Sources.facts,...integratedU10Sources.facts,...integratedU11Sources.facts].map(f=>f.wordId));
 expect(integratedU12Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU12.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only19 integrated U13 fields and protects every other exact word field',()=>{
 expect(integratedU13Sources.facts).toHaveLength(19);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts,...integratedU08U09Sources.facts,...integratedU10Sources.facts,...integratedU11Sources.facts,...integratedU12Sources.facts].map(f=>f.wordId));
 expect(integratedU13Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU13.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only18 integrated U14 fields and protects every other exact word field',()=>{
 expect(integratedU14Sources.facts).toHaveLength(18);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts,...integratedU08U09Sources.facts,...integratedU10Sources.facts,...integratedU11Sources.facts,...integratedU12Sources.facts,...integratedU13Sources.facts].map(f=>f.wordId));
 expect(integratedU14Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU14.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only22 integrated U15 fields and protects every other exact word field',()=>{
 expect(integratedU15Sources.facts).toHaveLength(22);
 const prior=new Set([...originalSources.facts,...followupSources.facts,...u16FormSources.facts,...u17FormSources.facts,...u18FormSources.facts,...u19FormSources.facts,...u20FormSources.facts,...u21FormSources.facts,...integratedU05U06Sources.facts,...integratedU07Sources.facts,...integratedU08U09Sources.facts,...integratedU10Sources.facts,...integratedU11Sources.facts,...integratedU12Sources.facts,...integratedU13Sources.facts,...integratedU14Sources.facts].map(f=>f.wordId));
 expect(integratedU15Sources.facts.every(f=>!prior.has(f.wordId))).toBe(true);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of integratedU15.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);if(p.id==='W000962')restoreRecordedAuditPatch('words',row,u25.patches.find(q=>q.dataset==='words'&&q.id===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';expect(()=>restoreRecordedAuditPatch('words',{...original,...wrong.after},wrong)).toThrow();}
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...original,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('reverses only17 exact U22 sourced form keys and rejects all other row drift',()=>{
 expect(u22FormSources.facts).toHaveLength(17);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u22Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  const fact=u22FormSources.facts.find(f=>f.wordId===p.id)!;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(fact.nonFormRow);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...wrong.after},wrong)).toThrow();
  }
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});
it('reverses only the U22 shirt Chinese string and protects headword English cloze and answer',()=>{
 const p=u22Translations.patches[0];const original={...p.before};const row={...original,...p.after};
 restoreRecordedAuditPatch('examples',row,p);expect(row).toEqual(original);
 for(const field of ['word','sentenceEn','blankSentence','answer']){
  expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after,[field]:'changed'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,before:{...p.before,[field]:'changed'}})).toThrow();
 }
 expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,id:'EXunknown'})).toThrow();
 expect(()=>restoreRecordedAuditPatch('examples',{...p.before,sentenceZh:'unverified'},{...p,after:{sentenceZh:'unverified'}})).toThrow();
});

it('reverses only23 exact U23 sourced form keys and rejects all other row drift',()=>{
 expect(u23FormSources.facts).toHaveLength(23);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u23Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  if(p.id==='W001711')restoreRecordedAuditPatch('words',row,lv2u28.patches.find(q=>q.dataset==='words'&&q.id===p.id)!);
  const fact=u23FormSources.facts.find(f=>f.wordId===p.id)!;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(fact.nonFormRow);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...wrong.after},wrong)).toThrow();
  }
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});

it('restores only three U23 Chinese strings and exposes every unsupported source or translation mutation',()=>{
 expect(u23Translations.patches).toHaveLength(3);
 for(const p of u23Translations.patches){const original={...p.before};const row={...original,...p.after};restoreRecordedAuditPatch('examples',row,p);expect(row).toEqual(original);
  for(const field of ['word','sentenceEn','blankSentence','answer']){expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after,[field]:'changed'},p)).toThrow();expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,before:{...p.before,[field]:'changed'}})).toThrow();}
  expect(()=>restoreRecordedAuditPatch('examples',{...p.before,sentenceZh:'unverified'},{...p,after:{sentenceZh:'unverified'}})).toThrow();
  expect(()=>restoreRecordedAuditPatch('examples',{...p.before,...p.after},{...p,id:'EXunknown'})).toThrow();
 }
});
it('reconstructs the old fine form fixture only after validating its exact later English correction',()=>{
 const p=u23.patches.find(q=>q.dataset==='words'&&q.id==='W000310')!;const old=integratedU11Sources.facts.find(f=>f.wordId===p.id)!;const current:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));const row=structuredClone(current.find(w=>w.wordId===p.id)!);
 restoreRecordedAuditPatch('words',row,p);const nonForm={...row};delete nonForm.verbForms;expect(createHash('sha256').update(JSON.stringify(nonForm)).digest('hex')).toBe(old.nonFormRowSha256);
 expect(()=>restoreRecordedAuditPatch('words',{...row,meaningEn:'unrecorded'},p)).toThrow();
});

it('reverses only7 exact U24 sourced form keys and rejects all other row drift',()=>{
 expect(u24FormSources.facts).toHaveLength(7);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u24Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  const fact=u24FormSources.facts.find(f=>f.wordId===p.id)!;
  if(p.id==='W001102')restoreRecordedAuditPatch('words',row,lv2u27.patches.find(q=>q.dataset==='words'&&q.id===p.id)!);
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(fact.nonFormRow);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...wrong.after},wrong)).toThrow();
  }
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});


it('preserves exact U24 flat note identity status and source while reversing only its content',()=>{const p=u24Notes.patches.find(p=>p.dataset==='notes')!;const row={...p.before,...p.after};restoreRecordedAuditPatch('notes',row,p);expect(row).toEqual(p.before);for(const key of ['word','title','noteType','status','noteId']){expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after,[key]:'changed'},p)).toThrow();expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,before:{...p.before,[key]:'changed'}})).toThrow();}expect(()=>restoreRecordedAuditPatch('notes',{...p.before,content:'unverified'},{...p,after:{content:'unverified'}})).toThrow();expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,id:'NXunknown'})).toThrow();});

it('reverses only24 exact U25 sourced form keys and rejects all other row drift',()=>{
 expect(u25FormSources.facts).toHaveLength(24);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of u25Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  const fact=u25FormSources.facts.find(f=>f.wordId===p.id)!;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(fact.nonFormRow);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...wrong.after},wrong)).toThrow();
  }
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});


it('reconstructs the old wet form fixture only through its exact later usage correction',()=>{
 const p=u25.patches.find(q=>q.dataset==='words'&&q.id==='W000962')!;const old=integratedU15Sources.facts.find(f=>f.wordId===p.id)!;const current:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));const row=structuredClone(current.find(w=>w.wordId===p.id)!);
 const bad={...row,usagePatternZh:'unrecorded'};expect(()=>restoreRecordedAuditPatch('words',bad,p)).toThrow();
 restoreRecordedAuditPatch('words',row,p);const nonForm={...row};delete nonForm.verbForms;expect(createHash('sha256').update(JSON.stringify(nonForm)).digest('hex')).toBe(old.nonFormRowSha256);
 expect(()=>restoreRecordedAuditPatch('words',{...row,...p.after,meaningEn:'unrecorded'},integratedU15.patches.find(q=>q.id===p.id)!)).toThrow();
});
it('reverses only20 exact LV2 U27 sourced form keys and rejects all other row drift',()=>{
 expect(lv2u27FormSources.facts).toHaveLength(20);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of lv2u27Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  const fact=lv2u27FormSources.facts.find(f=>f.wordId===p.id)!;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(fact.nonFormRow);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...wrong.after},wrong)).toThrow();
  }
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});



it('retains the old U24 board fingerprint through only its exact later coverage edit',()=>{
 const p=lv2u27.patches.find(q=>q.dataset==='words'&&q.id==='W001102')!;const form=u24Forms.patches.find(q=>q.id===p.id)!;
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));const row=structuredClone(words.find(w=>w.wordId===p.id)!);
 expect(()=>restoreRecordedAuditPatch('words',structuredClone(row),form)).toThrow();
 expect(()=>restoreRecordedAuditPatch('words',{...row,meaningZh:'unverified'},p)).toThrow();
 const unlisted={...row,usagePattern:'unrecorded'};restoreRecordedAuditPatch('words',unlisted,p);expect(()=>restoreRecordedAuditPatch('words',unlisted,form)).toThrow();
 restoreRecordedAuditPatch('words',row,p);restoreRecordedAuditPatch('words',row,form);expect(row).toEqual(u24FormSources.facts.find(f=>f.wordId===p.id)!.nonFormRow);
});
it('limits eight LV2 U27 notes to exact full-row guards and one specific title correction',()=>{
 expect(lv2u27Notes.patches).toHaveLength(8);
 for(const p of lv2u27Notes.patches){const row:Row={...p.before,...p.after};restoreRecordedAuditPatch('notes',row,p);expect(row).toEqual(p.before);
  for(const field of ['word','status','noteType','noteId']){expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after,[field]:'unrecorded'},p)).toThrow();expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,before:{...p.before,[field]:'unrecorded'}})).toThrow();}
  for(const field of ['title','content','status'])expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after,[field]:'unverified'},{...p,after:{...p.after,[field]:'unverified'}})).toThrow();
  expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,id:'NXunknown'})).toThrow();
 }
});

it('reverses only17 exact LV2 U28 sourced form keys and rejects all other row drift',()=>{
 expect(lv2u28FormSources.facts).toHaveLength(17);
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const p of lv2u28Forms.patches){
  const row=structuredClone(words.find(w=>w.wordId===p.id)!);
  const fact=lv2u28FormSources.facts.find(f=>f.wordId===p.id)!;
  restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(fact.nonFormRow);expect(row).not.toHaveProperty('verbForms');
  for(const key of ['base','past','pastParticiple','sourceRef','status']){
   const wrong=structuredClone(p);(wrong.after.verbForms as Row)[key]='unverified';
   expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...wrong.after},wrong)).toThrow();
  }
  for(const key of ['word','pos','status','meaningZh','meaningEn','usagePattern'])expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after,[key]:'unrecorded'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...fact.nonFormRow,...p.after},{...p,before:{verbForms:null}})).toThrow();
 }
});




it('limits three LV2 U28 notes to exact full-row guards and two specific title corrections',()=>{
 expect(lv2u28Notes.patches).toHaveLength(3);
 for(const p of lv2u28Notes.patches){const row:Row={...p.before,...p.after};restoreRecordedAuditPatch('notes',row,p);expect(row).toEqual(p.before);
  for(const field of ['word','status','noteType','noteId']){expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after,[field]:'unrecorded'},p)).toThrow();expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,before:{...p.before,[field]:'unrecorded'}})).toThrow();}
  for(const field of ['title','content','status'])expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after,[field]:'unverified'},{...p,after:{...p.after,[field]:'unverified'}})).toThrow();
  expect(()=>restoreRecordedAuditPatch('notes',{...p.before,...p.after},{...p,id:'NXunknown'})).toThrow();
 }
});

it('keeps record and part historical form fingerprints through only exact U28 corrections',()=>{
 const words:Row[]=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
 for(const [id,forms]of [['W001711',u23Forms.patches],['W000628',integratedU05U06.patches]] as const){
  const p=lv2u28.patches.find(q=>q.dataset==='words'&&q.id===id)!;const form=forms.find(q=>q.id===id)!;const row=structuredClone(words.find(w=>w.wordId===id)!);
  expect(()=>restoreRecordedAuditPatch('words',structuredClone(row),form)).toThrow();
  expect(()=>restoreRecordedAuditPatch('words',{...row,meaningZh:'unverified'},p)).toThrow();
  const drift={...row,unlistedField:'unverified'};restoreRecordedAuditPatch('words',drift,p);expect(()=>restoreRecordedAuditPatch('words',drift,form)).toThrow();
  restoreRecordedAuditPatch('words',row,p);restoreRecordedAuditPatch('words',row,form);expect(row).not.toHaveProperty('verbForms');
 }
});
