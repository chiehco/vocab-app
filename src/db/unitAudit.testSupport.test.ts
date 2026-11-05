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
