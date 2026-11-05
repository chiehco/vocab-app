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
 for(const p of integratedU05U06.patches){const row=structuredClone(words.find(w=>w.wordId===p.id)!);const original={...row};delete original.verbForms;restoreRecordedAuditPatch('words',row,p);expect(row).toEqual(original);expect(row).not.toHaveProperty('verbForms');
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
