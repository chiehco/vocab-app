import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import u1 from '../../docs/unit-audit-20261105/LV1-U01-patches.json';
import u2 from '../../docs/unit-audit-20261105/LV1-U02-patches.json';
import u3 from '../../docs/unit-audit-20261105/LV1-U03-patches.json';
import pig from '../../docs/unit-audit-20261105/LV1-U01-definition-supplement.json';
import u3Remaining from '../../docs/unit-audit-20261105/LV1-U03-remaining-patches.json';
import u4 from '../../docs/unit-audit-20261105/LV1-U04-patches.json';
import u5 from '../../docs/unit-audit-20261105/LV1-U05-patches.json';
import u6 from '../../docs/unit-audit-20261105/LV1-U06-patches.json';
import u6Syntax from '../../docs/unit-audit-20261105/LV1-U06-syntax-followup.json';
import examSources from '../../docs/unit-audit-20261105/LV1-U05-U06-exam-source-followup.json';
import u7 from '../../docs/unit-audit-20261105/LV1-U07-patches.json';
import u7Hints from '../../docs/unit-audit-20261105/LV1-U07-hints-followup.json';
import lexicalSources from '../../docs/unit-audit-20261105/LV1-U02-U03-lexical-source-followup.json';
import catDefinition from '../../docs/unit-audit-20261105/LV1-U03-cat-definition-followup.json';
import u7VerifiedExams from '../../docs/unit-audit-20261105/LV1-U07-verified-exam-source-followup.json';
import u8 from '../../docs/unit-audit-20261105/LV1-U08-patches.json';
import demandVisible from '../../docs/unit-audit-20261105/LV1-U07-demand-visible-form-followup.json';
import u9 from '../../docs/unit-audit-20261105/LV1-U09-patches.json';
import u8Hints from '../../docs/unit-audit-20261105/LV1-U08-hints-followup.json';
import translations from '../../docs/unit-audit-20261105/LV1-verified-translations-followup.json';
import forms from '../../docs/unit-audit-20261105/LV1-U01-U02-verb-forms-followup.json';
import u10 from '../../docs/unit-audit-20261105/LV1-U10-patches.json';
import u11 from '../../docs/unit-audit-20261105/LV1-U11-patches.json';
import u11Usage from '../../docs/unit-audit-20261105/LV1-U11-usage-followup.json';
import verifiedForms from '../../docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json';
import verifiedTranslations from '../../docs/unit-audit-20261105/VERIFIED-TRANSLATION-SOURCES.json';
import verifiedFollowupTranslations from '../../docs/unit-audit-20261105/VERIFIED-FOLLOWUP-TRANSLATION-SOURCES.json';
import followupTranslations from '../../docs/unit-audit-20261105/LV1-U11-U12-verified-translations-patches.json';
import followupForms from '../../docs/unit-audit-20261105/LV1-U03-U04-verified-forms-patches.json';
import followupFormsU05U06 from '../../docs/unit-audit-20261105/LV1-U05-U06-verified-forms-patches.json';
import followupFormsU07 from '../../docs/unit-audit-20261105/LV1-U07-verified-forms-patches.json';
import followupFormsU08U09 from '../../docs/unit-audit-20261105/LV1-U08-U09-verified-forms-patches.json';
import followupFormsU10 from '../../docs/unit-audit-20261105/LV1-U10-verified-forms-patches.json';
import followupFormsU11 from '../../docs/unit-audit-20261105/LV1-U11-verified-forms-patches.json';
import followupFormsU12 from '../../docs/unit-audit-20261105/LV1-U12-verified-forms-patches.json';
import verifiedFollowupForms from '../../docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json';

type Row = Record<string, unknown>;
type Patch = {dataset:string; key:string; id:string; before:Row; after:Row; reason:string; evidence:string};
const patches:Patch[]=[...u1.patches,...u2.patches,...pig.patches,...u3.patches,...u3Remaining.patches,...u4.patches,...u5.patches,...u6.patches,...u6Syntax.patches,...examSources.patches,...u7.patches,...u7Hints.patches,...lexicalSources.patches,...catDefinition.patches,...u7VerifiedExams.patches,...u8.patches,...demandVisible.patches,...u9.patches,...u8Hints.patches,...translations.patches,...forms.patches,...u10.patches,...u11.patches,...u11Usage.patches,...followupForms.patches,...followupFormsU05U06.patches,...followupFormsU07.patches];

patches.push(...followupTranslations.patches,...followupFormsU08U09.patches,...followupFormsU10.patches,...followupFormsU11.patches,...followupFormsU12.patches);

export function restoreRecordedAuditPatch(name:string,row:Row,patch:Patch):void{
 assert.ok(patch.reason&&patch.evidence,'each audit correction needs recorded evidence');
 for(const [key,after]of Object.entries(patch.after))assert.deepEqual(row[key],after,`${name}:${patch.id}:${key}`);
 for(const [key,before]of Object.entries(patch.before))if(!Object.hasOwn(patch.after,key))assert.deepEqual(row[key],before,'immutable source guard changed');
 if(Object.hasOwn(patch.after,'verbForms')){
  assert.equal(name,'words');
  const fact=[...verifiedForms.facts,...verifiedFollowupForms.facts].find(f=>f.wordId===patch.id);assert.ok(fact,'only source-verified verbs may acquire forms');
  assert.deepEqual(patch.after,{verbForms:fact.verbForms});assert.deepEqual(patch.before,{verbForms:{$absent:true}});
 }
 if(Object.hasOwn(patch.after,'sentenceZh')){
  assert.equal(name,'examples');const fact=[...verifiedTranslations.facts,...verifiedFollowupTranslations.facts].find(f=>f.exampleId===patch.id);assert.ok(fact,'only exact verified translations may change');
  assert.deepEqual(patch.before,{sentenceEn:fact.sentenceEn,sentenceZh:fact.before});assert.deepEqual(patch.after,{sentenceZh:fact.after});
  if(verifiedFollowupTranslations.facts.some(f=>f.exampleId===patch.id))assert.equal(patch.evidence,fact.evidence,'only exact verified translation sources may change');
 }
 for(const key of Object.keys(patch.after)){
  assert.ok(Object.hasOwn(patch.before,key),'old value must be explicit');
  if(key==='verbForms'&&JSON.stringify(patch.before[key])===JSON.stringify({$absent:true}))delete row[key];
  else row[key]=patch.before[key];
 }
}

// Keep the historical payload hashes intact. Check each explicitly recorded new
// field before reversing only that field for the old-release comparison.
export function beforeUnitAudit<T>(dataset:string, value:T):T {
  const name=dataset.replace(/\.json$/,'');
  const copy=structuredClone(value);
  if(name==='sa-pack'){
    const pack=copy as Row;
    const meta=pack.meta as Row;
    const fullMeta=JSON.parse(readFileSync(new URL('../../public/data/v1/meta.json',import.meta.url),'utf8'));
    beforeUnitAudit('meta',fullMeta); // Validate the full source's saved hashes first.
    const datasets=Object.fromEntries(['words','senses','examples','relations','morphemes','notes','examPriorities','media'].map(k=>[k,pack[k]]));
    const sha=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
    assert.equal(meta.wordsHash,'sa:'+sha(pack.words),'starter wordsHash must describe its saved rows');
    assert.equal(meta.contentHash,'sa:'+sha({sourceHash:fullMeta.contentHash,datasets}),'starter contentHash must describe its saved rows and full source');
    for(const [key,rows]of Object.entries(datasets))pack[key]=beforeUnitAudit(key,rows);
    // Exact pre-audit starter metadata from base commit 29cfc684; outer historical
    // fixtures, counts, identities and all other fields remain unchanged.
    Object.assign(meta,{generatedAt:'2026-10-26T06:21:08Z',wordsHash:'sa:b4368e734b16cb960a2a5cebf391cb0882a239c3db59ce4339d34af2ec876f4f',contentHash:'sa:a1be9813d37281f0719656c3234557b8288c12d7f7b1f5ad378786314bb5dddd'});
    return copy;
  }
  if(name==='meta'){
    const row=copy as Row;
    const data=(file:string)=>readFileSync(new URL(`../../public/data/v1/${file}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    const digest=createHash('sha256');
    for(const file of ['words','senses','examples','relations','morphemes','notes','exam_priority','hooks','media'])digest.update(data(file+'.json'));
    assert.equal(row.contentHash,digest.digest('hex'),'audit contentHash must describe the saved full payload');
    assert.equal(row.wordsHash,createHash('sha256').update(data('words.json')).digest('hex'),'audit wordsHash must describe saved words');
    Object.assign(row,{generatedAt:'2026-10-26T06:21:08Z',wordsHash:'0b4f19bc11039dd0c70b630461418e124225f870ac576748993df1481bb3ecad',contentHash:'26fdedbbc0e5e8e8f61976120ec57093ef3399856cdeba79542358d083c64008'});
    return copy;
  }
  if(!Array.isArray(copy))return copy;
  const indexes=new Map<string,Map<unknown,Row[]>>();
  for(const patch of patches.filter(p=>p.dataset===name).reverse()){
    assert.ok(patch.reason&&patch.evidence,'each audit correction needs recorded evidence');
    assert.ok(!Object.hasOwn(patch.after,patch.key),'audit identities are immutable');
    let index=indexes.get(patch.key);
    if(!index){
      index=new Map<unknown,Row[]>();
      for(const row of copy as Row[]){const id=row[patch.key];const matches=index.get(id);if(matches)matches.push(row);else index.set(id,[row]);}
      indexes.set(patch.key,index);
    }
    const rows=index.get(patch.id)??[];
    assert.ok(rows.length<=1,'audit cannot conceal duplicate identities');
    if(!rows.length)continue; // A starter subset can omit full-dictionary rows.
    const row=rows[0] as Row;
    restoreRecordedAuditPatch(name,row,patch);
  }
  return copy;
}
