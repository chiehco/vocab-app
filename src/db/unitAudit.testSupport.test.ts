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
import followupsU08U09 from '../../docs/unit-audit-20261105/LV1-U08-U09-verified-forms-patches.json';
import followupsU10 from '../../docs/unit-audit-20261105/LV1-U10-verified-forms-patches.json';
import followupsU11 from '../../docs/unit-audit-20261105/LV1-U11-verified-forms-patches.json';
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
 expect(followupsU08U09.patches).toHaveLength(54);
 expect(followupsU10.patches).toHaveLength(27);
 expect(followupsU11.patches).toHaveLength(26);
 expect(createHash('sha256').update(JSON.stringify(stable(followupSources.facts.filter(f=>f.batch==='U03-U04')))).digest('hex')).toBe('98c2d594a21911e85d8bb34eed8f479dd7df59c034d51006d752ad74559d0b87');
 expect(createHash('sha256').update(JSON.stringify(stable(followupSources.facts.filter(f=>['U03-U04','U05-U06'].includes(f.batch))))).digest('hex')).toBe('982208b048a385d2a00564f8bc77be91109c5a7e9aa9b328c6a7394b499f060b');
 for(const p of [...followups.patches,...followupsU05U06.patches,...followupsU07.patches,...followupsU08U09.patches,...followupsU10.patches,...followupsU11.patches]){
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
 expect(words.find(row=>row.wordId==='W000195')).not.toHaveProperty('verbForms');
 expect(words.find(row=>row.wordId==='W000490')).not.toHaveProperty('verbForms');
 const form=(id:string)=>(words.find(row=>row.wordId===id)!.verbForms as Row);
 expect(form('W000635')).toMatchObject({base:'people',past:'peopled',pastParticiple:'peopled'});
 expect(form('W000364')).toMatchObject({base:'ground',past:'grounded',pastParticiple:'grounded'});
 expect(form('W000478')).toMatchObject({past:'learned / learnt',pastParticiple:'learned / learnt'});
 expect(form('W004820')).toMatchObject({past:'sowed',pastParticiple:'sown / sowed'});
 expect(form('W000326')).toMatchObject({past:'forgot',pastParticiple:'forgotten'});
 expect(followupSources.facts.find(f=>f.wordId==='W000326')).toMatchObject({sourceSupportedForms:{pastParticiple:['forgotten','forgot']},presentationPriority:{secondaryFormRequiresVisibleQualification:true}});
 expect(form('W003416')).toMatchObject({base:'forbid',past:'forbade',pastParticiple:'forbidden'});
 expect(form('W000826')).toMatchObject({base:'stay',past:'stayed',pastParticiple:'stayed'});
 expect(form('W000645')).toMatchObject({base:'piece',past:'pieced',pastParticiple:'pieced'});
 expect(form('W000700')).toMatchObject({base:'read',past:'read',pastParticiple:'read'});
 expect(form('W000698')).toMatchObject({base:'raise',past:'raised',pastParticiple:'raised'});
 expect(form('W000313')).toMatchObject({base:'fire',past:'fired',pastParticiple:'fired'});
 expect(form('W000819')).toMatchObject({base:'spring',past:'sprang',pastParticiple:'sprung'});
 expect(form('W000955')).toMatchObject({base:'wear',past:'wore',pastParticiple:'worn'});
 expect(form('W000785')).toMatchObject({base:'size',past:'sized',pastParticiple:'sized'});
 expect(form('W000110')).toMatchObject({base:'bottom',past:'bottomed',pastParticiple:'bottomed'});
 expect(form('W000670')).toMatchObject({base:'pot',past:'potted',pastParticiple:'potted'});
 expect(form('W000701')).toMatchObject({base:'ready',past:'readied',pastParticiple:'readied'});
 expect(followupSources.facts.find(f=>f.wordId==='W000819')).toMatchObject({sourceSupportedForms:{past:['sprang','sprung'],pastParticiple:['sprung']}});
});

it('reverses only the two verified translations while preserving all prior sources and unrelated row fields',()=>{
 const sourceHash=(file:string)=>createHash('sha256').update(readFileSync('docs/unit-audit-20261105/'+file,'utf8').replace(/\r\n/g,'\n')).digest('hex');
 expect(sourceHash('VERIFIED-TRANSLATION-SOURCES.json')).toBe('abd99633fec797fe0b9e894a5906014054a5cd93d14a82d67fcaec3b4e5a359e');
 const original99={...followupSources,facts:followupSources.facts.filter(f=>['U03-U04','U05-U06','U07'].includes(f.batch))};
 expect(original99.facts).toHaveLength(99);
 // Reconstruct the original 99-fact file; retain its fixed hash as new facts are appended.
 expect(createHash('sha256').update(JSON.stringify(original99,null,2)+'\n').digest('hex')).toBe('241c3bb9212192299797bc290ed0a0a138e395bb7bd69708176df6421f85a250');
 const original153={...followupSources,facts:followupSources.facts.filter(f=>['U03-U04','U05-U06','U07','U08-U09'].includes(f.batch))};
 expect(original153.facts).toHaveLength(153);
 expect(createHash('sha256').update(JSON.stringify(original153,null,2)+'\n').digest('hex')).toBe('81a95ac526c17241257c888406452a3b5d73932a0db596d719c4ba7dd256a6a0');
 const original180={...followupSources,facts:followupSources.facts.filter(f=>['U03-U04','U05-U06','U07','U08-U09','U10'].includes(f.batch))};
 expect(original180.facts).toHaveLength(180);
 expect(createHash('sha256').update(JSON.stringify(original180,null,2)+'\n').digest('hex')).toBe('a40ef2362bbeeb9f18b35755e6748a2813e10256355ef5e7302b94fdb1a174b2');
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
