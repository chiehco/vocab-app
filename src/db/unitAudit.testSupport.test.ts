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
import followupsU05U06 from '../../docs/unit-audit-20261105/LV1-U05-U06-verified-forms-patches.json';
import followupsU07 from '../../docs/unit-audit-20261105/LV1-U07-verified-forms-patches.json';
import followupSources from '../../docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json';
import originalSources from '../../docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json';
import translationFollowups from '../../docs/unit-audit-20261105/LV1-U11-U12-verified-translations-patches.json';
import translationFollowupSources from '../../docs/unit-audit-20261105/VERIFIED-FOLLOWUP-TRANSLATION-SOURCES.json';

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
 expect(followups.patches).toHaveLength(16);
 expect(followupsU05U06.patches).toHaveLength(46);
 expect(followupsU07.patches).toHaveLength(37);
 expect(createHash('sha256').update(JSON.stringify(stable(followupSources.facts.filter(f=>f.batch==='U03-U04')))).digest('hex')).toBe('98c2d594a21911e85d8bb34eed8f479dd7df59c034d51006d752ad74559d0b87');
 expect(createHash('sha256').update(JSON.stringify(stable(followupSources.facts.filter(f=>['U03-U04','U05-U06'].includes(f.batch))))).digest('hex')).toBe('982208b048a385d2a00564f8bc77be91109c5a7e9aa9b328c6a7394b499f060b');
 for(const p of [...followups.patches,...followupsU05U06.patches,...followupsU07.patches]){
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
 expect(words.find(row=>row.wordId==='W000071')).not.toHaveProperty('verbForms');
 expect(words.find(row=>row.wordId==='W000574')).not.toHaveProperty('verbForms');
});

it('reverses only the two verified translations while preserving all prior sources and unrelated row fields',()=>{
 const sourceHash=(file:string)=>createHash('sha256').update(readFileSync('docs/unit-audit-20261105/'+file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
 expect(sourceHash('VERIFIED-TRANSLATION-SOURCES.json')).toBe('abd99633fec797fe0b9e894a5906014054a5cd93d14a82d67fcaec3b4e5a359e');
 expect(sourceHash('VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json')).toBe('241c3bb9212192299797bc290ed0a0a138e395bb7bd69708176df6421f85a250');
 expect(translationFollowups.patches).toHaveLength(2);
 expect(translationFollowupSources.facts.map(f=>f.exampleId).sort()).toEqual(['EX299bccf8','EX4c5b9769']);
 for(const p of translationFollowups.patches){
  const saved=examples.find(row=>row.exampleId===p.id)!;expect(saved.sentenceZh).toBe(p.after.sentenceZh);
  for(const sensePos of ['n.','v.']){
   const row={...structuredClone(saved),sensePos};const expected={...row,sentenceZh:p.before.sentenceZh};
   restoreRecordedAuditPatch('examples',row,p);expect(row).toEqual(expected);
  }
  expect(()=>restoreRecordedAuditPatch('examples',{...saved,sentenceEn:'Changed English'},p)).toThrow('source guard');
  expect(()=>restoreRecordedAuditPatch('examples',{...saved,sentenceZh:'A newer translation'},p)).toThrow();
  expect(()=>restoreRecordedAuditPatch('examples',{...saved},{...p,id:'EXunknown'})).toThrow('verified translations');
  expect(()=>restoreRecordedAuditPatch('examples',{...saved},{...p,evidence:'https://unverified.invalid'})).toThrow('sources');
  const wrongBefore={...p,before:{...p.before,sentenceZh:'Different source value'}};
  expect(()=>restoreRecordedAuditPatch('examples',{...saved},wrongBefore)).toThrow();
  const mixed={...p,before:{...p.before,status:'reviewed'},after:{...p.after,status:'reviewed'}};
  expect(()=>restoreRecordedAuditPatch('examples',{...saved},mixed)).toThrow();
 }
});
