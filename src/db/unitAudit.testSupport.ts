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
import u12 from '../../docs/unit-audit-20261105/LV1-U12-patches.json';
import u12Usage from '../../docs/unit-audit-20261105/LV1-U12-usage-followup.json';
import u13 from '../../docs/unit-audit-20261105/LV1-U13-patches.json';
import u13Definition from '../../docs/unit-audit-20261105/LV1-U13-definition-followup.json';
import followupForms from '../../docs/unit-audit-20261105/LV1-U03-U04-verified-forms-patches.json';
import verifiedFollowupForms from '../../docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json';
import u14 from '../../docs/unit-audit-20261105/LV1-U14-patches.json';
import u14Translation from '../../docs/unit-audit-20261105/LV1-U14-translation-followup.json';
import u15 from '../../docs/unit-audit-20261105/LV1-U15-patches.json';
import u15Usage from '../../docs/unit-audit-20261105/LV1-U15-usage-followup.json';
import u16 from '../../docs/unit-audit-20261105/LV1-U16-patches.json';
import u16Forms from '../../docs/unit-audit-20261105/LV1-U16-verified-forms-patches.json';
import verifiedU16Forms from '../../docs/unit-audit-20261105/VERIFIED-U16-VERB-FORMS-SOURCES.json';
import wordingFollowup from '../../docs/unit-audit-20261105/LV1-U11-U12-U15-wording-followup.json';
import dieNote from '../../docs/unit-audit-20261105/LV1-U08-die-note-followup.json';
import verifiedNotes from '../../docs/unit-audit-20261105/VERIFIED-NOTE-SOURCES.json';
import u17 from '../../docs/unit-audit-20261105/LV1-U17-patches.json';
import u17Definition from '../../docs/unit-audit-20261105/LV1-U17-definition-followup.json';
import u17Forms from '../../docs/unit-audit-20261105/LV1-U17-verified-forms-patches.json';
import verifiedU17Forms from '../../docs/unit-audit-20261105/VERIFIED-U17-VERB-FORMS-SOURCES.json';
import verifiedForms from '../../docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json';
import verifiedTranslations from '../../docs/unit-audit-20261105/VERIFIED-TRANSLATION-SOURCES.json';

import u18 from '../../docs/unit-audit-20261105/LV1-U18-patches.json';
import u18Forms from '../../docs/unit-audit-20261105/LV1-U18-verified-forms-patches.json';
import u18Translations from '../../docs/unit-audit-20261105/LV1-U18-translation-precision.json';
import verifiedU18Forms from '../../docs/unit-audit-20261105/VERIFIED-U18-VERB-FORMS-SOURCES.json';
import verifiedU18Translations from '../../docs/unit-audit-20261105/VERIFIED-U18-TRANSLATION-SOURCES.json';

import u19 from '../../docs/unit-audit-20261105/LV1-U19-patches.json';
import u19Forms from '../../docs/unit-audit-20261105/LV1-U19-verified-forms-patches.json';
import verifiedU19Forms from '../../docs/unit-audit-20261105/VERIFIED-U19-VERB-FORMS-SOURCES.json';

import u20 from '../../docs/unit-audit-20261105/LV1-U20-patches.json';
import u20Forms from '../../docs/unit-audit-20261105/LV1-U20-verified-forms-patches.json';
import verifiedU20Forms from '../../docs/unit-audit-20261105/VERIFIED-U20-VERB-FORMS-SOURCES.json';

import u21 from '../../docs/unit-audit-20261105/LV1-U21-patches.json';
import u21Forms from '../../docs/unit-audit-20261105/LV1-U21-verified-forms-patches.json';
import verifiedU21Forms from '../../docs/unit-audit-20261105/VERIFIED-U21-VERB-FORMS-SOURCES.json';

import integratedU05U06 from '../../docs/unit-audit-20261105/LV1-U05-U06-integrated-forms-patches.json';
import verifiedIntegratedU05U06 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U05-U06-VERB-FORMS-SOURCES.json';

import integratedU07 from '../../docs/unit-audit-20261105/LV1-U07-integrated-forms-patches.json';
import verifiedIntegratedU07 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U07-VERB-FORMS-SOURCES.json';

import integratedU08U09 from '../../docs/unit-audit-20261105/LV1-U08-U09-integrated-forms-patches.json';
import verifiedIntegratedU08U09 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U08-U09-VERB-FORMS-SOURCES.json';

import integratedU10 from '../../docs/unit-audit-20261105/LV1-U10-integrated-forms-patches.json';
import verifiedIntegratedU10 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U10-VERB-FORMS-SOURCES.json';

import integratedU11 from '../../docs/unit-audit-20261105/LV1-U11-integrated-forms-patches.json';
import verifiedIntegratedU11 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U11-VERB-FORMS-SOURCES.json';

import integratedU12 from '../../docs/unit-audit-20261105/LV1-U12-integrated-forms-patches.json';
import verifiedIntegratedU12 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U12-VERB-FORMS-SOURCES.json';

import integratedU13 from '../../docs/unit-audit-20261105/LV1-U13-integrated-forms-patches.json';
import integratedU14 from '../../docs/unit-audit-20261105/LV1-U14-integrated-forms-patches.json';
import integratedU15 from '../../docs/unit-audit-20261105/LV1-U15-integrated-forms-patches.json';
import verifiedIntegratedU13 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U13-VERB-FORMS-SOURCES.json';
import verifiedIntegratedU14 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U14-VERB-FORMS-SOURCES.json';
import verifiedIntegratedU15 from '../../docs/unit-audit-20261105/VERIFIED-INTEGRATED-U15-VERB-FORMS-SOURCES.json';

import u22 from '../../docs/unit-audit-20261105/LV1-U22-patches.json';
import u22Translation from '../../docs/unit-audit-20261105/LV1-U22-translation-precision.json';
import u22Forms from '../../docs/unit-audit-20261105/LV1-U22-verified-forms-patches.json';
import verifiedU22Forms from '../../docs/unit-audit-20261105/VERIFIED-U22-VERB-FORMS-SOURCES.json';
import verifiedU22Translations from '../../docs/unit-audit-20261105/VERIFIED-U22-TRANSLATION-SOURCES.json';

import u23 from '../../docs/unit-audit-20261105/LV1-U23-patches.json';
import u23Translation from '../../docs/unit-audit-20261105/LV1-U23-translation-precision.json';
import u23Forms from '../../docs/unit-audit-20261105/LV1-U23-verified-forms-patches.json';
import verifiedU23Forms from '../../docs/unit-audit-20261105/VERIFIED-U23-VERB-FORMS-SOURCES.json';
import verifiedU23Translations from '../../docs/unit-audit-20261105/VERIFIED-U23-TRANSLATION-SOURCES.json';

import u24 from '../../docs/unit-audit-20261105/LV1-U24-patches.json';
import u24Forms from '../../docs/unit-audit-20261105/LV1-U24-verified-forms-patches.json';
import verifiedU24Forms from '../../docs/unit-audit-20261105/VERIFIED-U24-VERB-FORMS-SOURCES.json';

import u24Followup from '../../docs/unit-audit-20261105/LV1-U24-usage-note-followup.json';
import verifiedU24Notes from '../../docs/unit-audit-20261105/VERIFIED-U24-NOTE-SOURCES.json';

import u24Carrot from '../../docs/unit-audit-20261105/LV1-U24-carrot-definition.json';

import u25 from '../../docs/unit-audit-20261105/LV1-U25-patches.json';
import u25Forms from '../../docs/unit-audit-20261105/LV1-U25-verified-forms-patches.json';
import verifiedU25Forms from '../../docs/unit-audit-20261105/VERIFIED-U25-VERB-FORMS-SOURCES.json';

import lv2u27 from '../../docs/unit-audit-20261105/LV2-U27-patches.json';
import lv2u27Forms from '../../docs/unit-audit-20261105/LV2-U27-verified-forms-patches.json';
import verifiedLV2U27Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U27-VERB-FORMS-SOURCES.json';
import lv2u27Notes from '../../docs/unit-audit-20261105/LV2-U27-notes-patches.json';
import verifiedLV2U27Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U27-NOTE-SOURCES.json';

import lv2u28 from '../../docs/unit-audit-20261105/LV2-U28-patches.json';
import lv2u28Forms from '../../docs/unit-audit-20261105/LV2-U28-verified-forms-patches.json';
import verifiedLV2U28Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U28-VERB-FORMS-SOURCES.json';
import lv2u28Notes from '../../docs/unit-audit-20261105/LV2-U28-notes-patches.json';
import verifiedLV2U28Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U28-NOTE-SOURCES.json';

import lv2u29 from '../../docs/unit-audit-20261105/LV2-U29-patches.json';
import lv2u29Forms from '../../docs/unit-audit-20261105/LV2-U29-verified-forms-patches.json';
import verifiedLV2U29Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U29-VERB-FORMS-SOURCES.json';
import lv2u29Notes from '../../docs/unit-audit-20261105/LV2-U29-notes-patches.json';
import verifiedLV2U29Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U29-NOTE-SOURCES.json';
import lv2u29Translations from '../../docs/unit-audit-20261105/LV2-U29-translations-patches.json';
import verifiedLV2U29Translations from '../../docs/unit-audit-20261105/VERIFIED-LV2-U29-TRANSLATION-SOURCES.json';
import lv2u30 from '../../docs/unit-audit-20261105/LV2-U30-patches.json';
import lv2u30Forms from '../../docs/unit-audit-20261105/LV2-U30-verified-forms-patches.json';
import verifiedLV2U30Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U30-VERB-FORMS-SOURCES.json';
import lv2u30Notes from '../../docs/unit-audit-20261105/LV2-U30-notes-patches.json';
import verifiedLV2U30Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U30-NOTE-SOURCES.json';
import lv2u30Translations from '../../docs/unit-audit-20261105/LV2-U30-translations-patches.json';
import verifiedLV2U30Translations from '../../docs/unit-audit-20261105/VERIFIED-LV2-U30-TRANSLATION-SOURCES.json';

import lv2u31 from '../../docs/unit-audit-20261105/LV2-U31-patches.json';
import lv2u31Forms from '../../docs/unit-audit-20261105/LV2-U31-verified-forms-patches.json';
import verifiedLV2U31Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U31-VERB-FORMS-SOURCES.json';
import lv2u31Notes from '../../docs/unit-audit-20261105/LV2-U31-notes-patches.json';
import verifiedLV2U31Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U31-NOTE-SOURCES.json';

import lv2u32 from '../../docs/unit-audit-20261105/LV2-U32-patches.json';
import lv2u32Forms from '../../docs/unit-audit-20261105/LV2-U32-verified-forms-patches.json';
import verifiedLV2U32Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U32-VERB-FORMS-SOURCES.json';
import lv2u32Notes from '../../docs/unit-audit-20261105/LV2-U32-notes-patches.json';
import verifiedLV2U32Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U32-NOTE-SOURCES.json';
import lv2u32Translations from '../../docs/unit-audit-20261105/LV2-U32-translations-patches.json';
import verifiedLV2U32Translations from '../../docs/unit-audit-20261105/VERIFIED-LV2-U32-TRANSLATION-SOURCES.json';
import lv2u33 from '../../docs/unit-audit-20261105/LV2-U33-patches.json';
import lv2u33Forms from '../../docs/unit-audit-20261105/LV2-U33-verified-forms-patches.json';
import verifiedLV2U33Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U33-VERB-FORMS-SOURCES.json';
import lv2u33Notes from '../../docs/unit-audit-20261105/LV2-U33-notes-patches.json';
import verifiedLV2U33Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U33-NOTE-SOURCES.json';
import lv2u33Translations from '../../docs/unit-audit-20261105/LV2-U33-translations-patches.json';
import verifiedLV2U33Translations from '../../docs/unit-audit-20261105/VERIFIED-LV2-U33-TRANSLATION-SOURCES.json';
import lv2u34 from '../../docs/unit-audit-20261105/LV2-U34-patches.json';
import lv2u34Forms from '../../docs/unit-audit-20261105/LV2-U34-verified-forms-patches.json';
import verifiedLV2U34Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U34-VERB-FORMS-SOURCES.json';
import lv2u34Notes from '../../docs/unit-audit-20261105/LV2-U34-notes-patches.json';
import verifiedLV2U34Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U34-NOTE-SOURCES.json';
import lv2u35 from '../../docs/unit-audit-20261105/LV2-U35-patches.json';
import lv2u35Forms from '../../docs/unit-audit-20261105/LV2-U35-verified-forms-patches.json';
import verifiedLV2U35Forms from '../../docs/unit-audit-20261105/VERIFIED-LV2-U35-VERB-FORMS-SOURCES.json';
import lv2u35Notes from '../../docs/unit-audit-20261105/LV2-U35-notes-patches.json';
import verifiedLV2U35Notes from '../../docs/unit-audit-20261105/VERIFIED-LV2-U35-NOTE-SOURCES.json';
import lv2u35Translations from '../../docs/unit-audit-20261105/LV2-U35-translations-patches.json';
import verifiedLV2U35Translations from '../../docs/unit-audit-20261105/VERIFIED-LV2-U35-TRANSLATION-SOURCES.json';
type Row = Record<string, unknown>;
type Patch = {dataset:string; key:string; id:string; before:Row; after:Row; reason:string; evidence:string};
const patches:Patch[]=[...u1.patches,...u2.patches,...pig.patches,...u3.patches,...u3Remaining.patches,...u4.patches,...u5.patches,...u6.patches,...u6Syntax.patches,...examSources.patches,...u7.patches,...u7Hints.patches,...lexicalSources.patches,...catDefinition.patches,...u7VerifiedExams.patches,...u8.patches,...demandVisible.patches,...u9.patches,...u8Hints.patches,...translations.patches,...forms.patches,...u10.patches,...u11.patches,...u11Usage.patches,...u12.patches,...u12Usage.patches,...u13.patches,...u13Definition.patches,...followupForms.patches,...u14.patches,...u14Translation.patches,...u15.patches,...u15Usage.patches,...u16.patches,...u16Forms.patches,...wordingFollowup.patches];

patches.push(...dieNote.patches,...u17.patches,...u17Forms.patches,...u17Definition.patches,...u18.patches,...u18Forms.patches,...u18Translations.patches,...u19.patches,...u19Forms.patches,...u20.patches,...u20Forms.patches,...u21.patches,...u21Forms.patches,...integratedU05U06.patches,...integratedU07.patches,...integratedU08U09.patches,...integratedU10.patches,...integratedU11.patches,...integratedU12.patches,...integratedU13.patches,...integratedU14.patches,...integratedU15.patches,...u22.patches,...u22Translation.patches,...u22Forms.patches,...u23.patches,...u23Translation.patches,...u23Forms.patches,...u24.patches,...u24Forms.patches,...u24Followup.patches,...u24Carrot.patches,...u25.patches,...u25Forms.patches,...lv2u27.patches,...lv2u27Notes.patches,...lv2u27Forms.patches,...lv2u28.patches,...lv2u28Notes.patches,...lv2u28Forms.patches,...lv2u29.patches,...lv2u29Notes.patches,...lv2u29Translations.patches,...lv2u29Forms.patches,...lv2u30.patches,...lv2u30Notes.patches,...lv2u30Translations.patches,...lv2u30Forms.patches,...lv2u31.patches,...lv2u31Notes.patches,...lv2u31Forms.patches,...lv2u32.patches,...lv2u32Notes.patches,...lv2u32Forms.patches,...lv2u32Translations.patches,...lv2u33.patches,...lv2u33Notes.patches,...lv2u33Forms.patches,...lv2u33Translations.patches,...lv2u34.patches,...lv2u34Notes.patches,...lv2u34Forms.patches,...lv2u35.patches,...lv2u35Notes.patches,...lv2u35Forms.patches,...lv2u35Translations.patches);

export function restoreRecordedAuditPatch(name:string,row:Row,patch:Patch):void{
 assert.ok(patch.reason&&patch.evidence,'each audit correction needs recorded evidence');
 for(const [key,after]of Object.entries(patch.after))assert.deepEqual(row[key],after,`${name}:${patch.id}:${key}`);
 for(const [key,before]of Object.entries(patch.before))if(!Object.hasOwn(patch.after,key))assert.deepEqual(row[key],before,'immutable source guard changed');
 if(Object.hasOwn(patch.after,'verbForms')){
  assert.equal(name,'words');
  const fact=[...verifiedForms.facts,...verifiedFollowupForms.facts,...verifiedU16Forms.facts,...verifiedU17Forms.facts,...verifiedU18Forms.facts,...verifiedU19Forms.facts,...verifiedU20Forms.facts,...verifiedU21Forms.facts,...verifiedIntegratedU05U06.facts,...verifiedIntegratedU07.facts,...verifiedIntegratedU08U09.facts,...verifiedIntegratedU10.facts,...verifiedIntegratedU11.facts,...verifiedIntegratedU12.facts,...verifiedIntegratedU13.facts,...verifiedIntegratedU14.facts,...verifiedIntegratedU15.facts,...verifiedU22Forms.facts,...verifiedU23Forms.facts,...verifiedU24Forms.facts,...verifiedU25Forms.facts,...verifiedLV2U27Forms.facts,...verifiedLV2U28Forms.facts,...verifiedLV2U29Forms.facts,...verifiedLV2U30Forms.facts,...verifiedLV2U31Forms.facts,...verifiedLV2U32Forms.facts,...verifiedLV2U33Forms.facts,...verifiedLV2U34Forms.facts,...verifiedLV2U35Forms.facts].find(f=>f.wordId===patch.id);assert.ok(fact,'only source-verified verbs may acquire forms');
  assert.deepEqual(patch.after,{verbForms:fact.verbForms});assert.deepEqual(patch.before,{verbForms:{$absent:true}});
  const integratedFact=[...verifiedIntegratedU05U06.facts,...verifiedIntegratedU07.facts,...verifiedIntegratedU08U09.facts,...verifiedIntegratedU10.facts,...verifiedIntegratedU11.facts,...verifiedIntegratedU12.facts,...verifiedIntegratedU13.facts,...verifiedIntegratedU14.facts,...verifiedIntegratedU15.facts,...verifiedU22Forms.facts,...verifiedU23Forms.facts,...verifiedU24Forms.facts,...verifiedU25Forms.facts,...verifiedLV2U27Forms.facts,...verifiedLV2U28Forms.facts,...verifiedLV2U29Forms.facts,...verifiedLV2U30Forms.facts,...verifiedLV2U31Forms.facts,...verifiedLV2U32Forms.facts,...verifiedLV2U33Forms.facts,...verifiedLV2U34Forms.facts,...verifiedLV2U35Forms.facts].find(f=>f.wordId===patch.id);
  if(integratedFact){const nonForm={...row};delete nonForm.verbForms;assert.equal(createHash('sha256').update(JSON.stringify(nonForm)).digest('hex'),integratedFact.nonFormRowSha256,'integrated non-form row guard changed');}
 }
 if(Object.hasOwn(patch.after,'sentenceZh')){
  assert.equal(name,'examples');
  const u22Fact=[...verifiedU22Translations.facts,...verifiedU23Translations.facts,...verifiedLV2U29Translations.facts,...verifiedLV2U30Translations.facts,...verifiedLV2U32Translations.facts,...verifiedLV2U33Translations.facts,...verifiedLV2U35Translations.facts].find(f=>f.exampleId===patch.id);
  if(u22Fact){assert.deepEqual(patch.before,u22Fact.before);assert.deepEqual(patch.after,u22Fact.after);}
  else{const fact=[...verifiedTranslations.facts,...verifiedU18Translations.facts].find(f=>f.exampleId===patch.id);assert.ok(fact,'only exact verified translations may change');
   assert.deepEqual(patch.before,{sentenceEn:fact.sentenceEn,sentenceZh:fact.before});assert.deepEqual(patch.after,{sentenceZh:fact.after});}
 }
 if(name==='notes'||Object.hasOwn(patch.after,'content')){
  assert.equal(name,'notes');const fact=[...verifiedNotes.facts,...verifiedU24Notes.facts,...verifiedLV2U27Notes.facts,...verifiedLV2U28Notes.facts,...verifiedLV2U29Notes.facts,...verifiedLV2U30Notes.facts,...verifiedLV2U31Notes.facts,...verifiedLV2U32Notes.facts,...verifiedLV2U33Notes.facts,...verifiedLV2U34Notes.facts,...verifiedLV2U35Notes.facts].find(f=>f.noteId===patch.id);assert.ok(fact,'only exact verified note content may change');
  assert.deepEqual(patch.before,fact.before);assert.deepEqual(patch.after,fact.after);
  assert.deepEqual(Object.keys(patch.after),['NXa9825fa6','NX2b7e8109'].includes(patch.id)?['title']:(patch.id==='NXd8cde86b'||patch.id==='NXf728e282')?['title','content']:['content']);
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
