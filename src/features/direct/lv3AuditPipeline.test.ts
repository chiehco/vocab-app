import assert from 'node:assert/strict';
import {it} from 'vitest';
import {auditHash,projectAuditStep,validateAuditScope,loadLV3Chain,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';

function fixture(){
 const path='src/features/direct/curriculumUnit2.json' as const;
 const before={[path]:{template:{unchanged:true},learningItems:[{learningItemId:'LI-1',explanationZh:'old'}],grammarQuestions:[{questionId:'Q-1',targetMeaningZh:'old'}]}};
 const after=structuredClone(before);after[path].learningItems[0].explanationZh='new';after[path].grammarQuestions[0].targetMeaningZh='new';
 const collections={curriculum:{path,rowsField:'learningItems',key:'learningItemId'},grammarQuestions:{path,rowsField:'grammarQuestions',key:'questionId'}};
 const patches:AuditPatch[]=[
  {dataset:'curriculum',path,key:'learningItemId',id:'LI-1',before:before[path].learningItems[0],after:{explanationZh:'new'},reason:'test',fieldEvidence:{explanationZh:[{sources:['test']}]}},
  {dataset:'grammarQuestions',path,key:'questionId',id:'Q-1',before:before[path].grammarQuestions[0],after:{targetMeaningZh:'new'},reason:'test',fieldEvidence:{targetMeaningZh:[{sources:['test']}]}}
 ];
 const scope:AuditScope={unit:'LV3-U02',baseline:'99883751926bd6cb4feff70daff56c07afc130cb',collections,rows:patches.map(p=>({dataset:p.dataset,id:p.id,beforeHash:auditHash(p.before),after:p.after}))};
 const manifest:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,collections,files:{[path]:{beforeHash:auditHash(before[path]),afterHash:auditHash(after[path])}},patches,scopeHash:auditHash(scope)};
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
it('preserves the pinned U01 chain anchor and keeps U02 prepared',()=>{
 const chain=loadLV3Chain();assert.equal(chain[0].entry.unit,'LV3-U01');
 assert.equal(chain[0].entry.manifestHash,'317ab4353c8a462071ab98efb9604f7f26d67f427ffe6c7d24b5a71a768b5309');
 const u2=chain.find(x=>x.entry.unit==='LV3-U02');assert.ok(u2);
 // This test follows readiness without hardcoding the future application state.
 assert.equal(u2.manifest.patches.length,37);assert.ok(u2.scope);
});
