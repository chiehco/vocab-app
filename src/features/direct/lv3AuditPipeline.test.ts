import assert from 'node:assert/strict';
import {it} from 'vitest';
import {auditHash,projectAuditStep,validateAuditScope,loadLV3Chain,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';

function fixture(){
 const path='src/features/direct/curriculumUnit2.json' as const;
 const before={[path]:{template:{unchanged:true},learningItems:[{learningItemId:'LI-1',explanationZh:'old'}],grammarQuestions:[{questionId:'Q-1',targetMeaningZh:'old'}]}};
 const after=structuredClone(before);after[path].learningItems[0].explanationZh='new';after[path].grammarQuestions[0].targetMeaningZh='new';
 const collections={curriculum:{path,rowsField:'learningItems',key:'learningItemId'},grammarQuestions:{path,rowsField:'grammarQuestions',key:'questionId'}};
 const patches:AuditPatch[]=[
  {dataset:'curriculum',path,key:'learningItemId',id:'LI-1',before:before[path].learningItems[0],after:{explanationZh:'new'},reason:'test',evidence:[],fieldEvidence:{explanationZh:[{sources:['test'],reason:'test',proposal:'test'}]}},
  {dataset:'grammarQuestions',path,key:'questionId',id:'Q-1',before:before[path].grammarQuestions[0],after:{targetMeaningZh:'new'},reason:'test',evidence:[],fieldEvidence:{targetMeaningZh:[{sources:['test'],reason:'test',proposal:'test'}]}}
 ];
 const scope:AuditScope={schemaVersion:1,unit:'LV3-U02',baseline:'99883751926bd6cb4feff70daff56c07afc130cb',collections,rows:patches.map(p=>({dataset:p.dataset,id:p.id,beforeHash:auditHash(p.before),after:p.after}))};
 const manifest:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,collections,files:{[path]:{beforeHash:auditHash(before[path]),afterHash:auditHash(after[path]),beforeByteHash:'0'.repeat(64),afterByteHash:'1'.repeat(64)}},patches,scopeHash:auditHash(scope),parentManifestHash:'2'.repeat(64),readiness:'pending_independent_before_capture',scope:'U02-scope.json',unchangedInputs:{},derivedBefore:{},beforeMeta:{},beforePackMeta:{},derivedAfter:null,afterMeta:null};
 return {path,before,after,scope,manifest};
}
it('patches two collections in one physical file and reverses without changing source objects',()=>{
 const {path,before,after,scope,manifest}=fixture(),snapshot=structuredClone(before);
 const result=projectAuditStep(manifest,before,false,scope);
 assert.deepEqual(result,after);assert.equal(Object.keys(result).length,1);assert.deepEqual(before,snapshot);
 assert.deepEqual(projectAuditStep(manifest,result,true,scope),before);
 assert.deepEqual((result[path] as typeof after[typeof path]).template,{unchanged:true});
});
it('rejects unknown template drift and incomplete physical file inputs',()=>{
 const {before,scope,manifest,path}=fixture();before[path].template.unchanged=false;
 assert.throws(()=>projectAuditStep(manifest,before,false,scope),/whole-file drift/);
 assert.throws(()=>projectAuditStep(manifest,{},false,scope),/incomplete document set/);
});
it('rejects scope escalation and duplicate patches',()=>{
 const {manifest,scope}=fixture();manifest.patches[0].after.status='approved';
 assert.throws(()=>validateAuditScope(manifest,scope));
 const good=fixture();good.manifest.patches.push(structuredClone(good.manifest.patches[0]));
 assert.throws(()=>validateAuditScope(good.manifest,good.scope));
});
it('preserves the pinned U01 chain anchor and registered U02 step',()=>{
 const chain=loadLV3Chain();assert.equal(chain[0].entry.unit,'LV3-U01');
 assert.equal(chain[0].entry.manifestHash,'317ab4353c8a462071ab98efb9604f7f26d67f427ffe6c7d24b5a71a768b5309');
 const u2=chain.find(x=>x.entry.unit==='LV3-U02');assert.ok(u2);
 // This test follows readiness without hardcoding the future application state.
 assert.equal(u2.manifest.patches.length,37);assert.ok(u2.scope);
});

it('rejects arbitrary or original-English fields even when both manifest and scope request them',()=>{
 for(const field of ['originalEnglish','sentenceEn','pattern','arbitrary']){
  const {manifest,scope}=fixture();manifest.patches[0].after[field]='unapproved';
  scope.rows[0].after=structuredClone(manifest.patches[0].after);manifest.scopeHash=auditHash(scope);
  assert.throws(()=>validateAuditScope(manifest,scope),/disallowed after field/);
 }
});
it('rejects changed collection contracts even when rehashed in scope',()=>{
 for(const field of ['key','rowsField','path'] as const){
  const {manifest,scope}=fixture();manifest.collections!.curriculum[field]=field==='path'?'public/data/v1/words.json':'wrong';
  scope.collections=structuredClone(manifest.collections!);manifest.scopeHash=auditHash(scope);
  assert.throws(()=>validateAuditScope(manifest,scope));
 }
});
it('requires exact scoped POS transitions and supported form-source evidence',()=>{
 const step=loadLV3Chain().find(x=>x.entry.unit==='LV3-U02')!;
 const m=structuredClone(step.manifest),scope=structuredClone(step.scope!);
 const pos=m.patches.find(p=>p.id==='W002947')!;pos.after.pos='n.';
 assert.throws(()=>validateAuditScope(m,scope),/exact scope values/);
 const forms=structuredClone(step.manifest),formScope=structuredClone(step.scope!);
 const item=forms.patches.find(p=>p.after.verbForms)!;
 (item.after.verbForms as Record<string,unknown>).sourceRef='https://unverified.invalid/forms';
 formScope.rows.find(r=>r.dataset===item.dataset&&r.id===item.id)!.after=structuredClone(item.after);forms.scopeHash=auditHash(formScope);
 assert.throws(()=>validateAuditScope(forms,formScope),/forms source/);
});
