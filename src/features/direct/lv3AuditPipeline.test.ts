import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import {beforeLV4Published,beforeLV4PublishedText} from './lv4Published.testSupport';
import {isAuditUnitStep,auditHash,lv3AfterUnitFile,lv3AfterUnitPublishedText,reverseFileAuditSteps,projectAuditStep,validateAuditScope,loadLV3Chain,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';

function fixture(){
 const path='src/features/direct/curriculumUnit2.json' as const;
 const before={[path]:{template:{unchanged:true},learningItems:[{learningItemId:'LI-1',kind:'grammar',explanationZh:'old'}],grammarQuestions:[{questionId:'Q-1',targetMeaningZh:'old'}]}};
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
 const chain=loadLV3Chain().filter(isAuditUnitStep);assert.equal(chain[0].entry.unit,'LV3-U01');
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
 const step=loadLV3Chain().filter(isAuditUnitStep).find(x=>x.entry.unit==='LV3-U02')!;
 const m=structuredClone(step.manifest),scope=structuredClone(step.scope!);
 const pos=m.patches.find(p=>p.id==='W002947')!;pos.after.pos='n.';
 assert.throws(()=>validateAuditScope(m,scope),/exact scope values/);
 const forms=structuredClone(step.manifest),formScope=structuredClone(step.scope!);
 const item=forms.patches.find(p=>p.after.verbForms)!;
 (item.after.verbForms as Record<string,unknown>).sourceRef='https://unverified.invalid/forms';
 formScope.rows.find(r=>r.dataset===item.dataset&&r.id===item.id)!.after=structuredClone(item.after);forms.scopeHash=auditHash(formScope);
 assert.throws(()=>validateAuditScope(forms,formScope),/forms source/);
});

it('guards the latest committed checkpoint and exact historical U02 while rejecting unknown targets',()=>{
 const chain=loadLV3Chain().filter(isAuditUnitStep),committed=chain.filter(x=>x.entry.status==='committed');
 const latest=committed[committed.length-1],u2=committed.find(x=>x.entry.unit==='LV3-U02');
 assert.ok(latest);assert.ok(u2);
 const path='public/data/v1/notes.json',value=JSON.parse(readFileSync(path,'utf8'));
 assert.deepEqual(lv3AfterUnitFile(latest.entry.unit,path,value),beforeLV4Published(path,value));
 assert.equal(auditHash(lv3AfterUnitFile('LV3-U02',path,value)),u2.manifest.files![path].afterHash);
 const bad=structuredClone(value);bad[0].unlisted=true;
 assert.throws(()=>lv3AfterUnitFile(latest.entry.unit,path,bad),/drift/);
 assert.throws(()=>lv3AfterUnitFile('LV3-U02',path,bad),/drift/);
 assert.throws(()=>lv3AfterUnitFile('LV3-U99',path,value),/uncommitted checkpoint/);
 for(const step of chain.filter(x=>x.entry.status==='prepared'))
  assert.throws(()=>lv3AfterUnitFile(step.entry.unit,path,value),/uncommitted checkpoint/);
 const meta='public/data/v1/meta.json',text=readFileSync(meta,'utf8').replace(/\r\n/g,'\n');
 assert.equal(lv3AfterUnitPublishedText(latest.entry.unit,meta,text),beforeLV4PublishedText(meta,text));
 const historical=lv3AfterUnitPublishedText('LV3-U02',meta,text);
 assert.equal(createHash('sha256').update(historical).digest('hex'),u2.manifest.derivedAfter![meta]);
 assert.throws(()=>lv3AfterUnitPublishedText(latest.entry.unit,meta,text+' '),/raw drift|migration unchanged input drift|LV4 U01 complete file drift/);
 assert.throws(()=>lv3AfterUnitPublishedText('LV3-U02',meta,text+' '),/(raw|derived).*drift|migration unchanged input drift|LV4 U01 complete file drift/);
});
it('reverses successive same-file changes only in the recorded order',()=>{
 const path='public/data/v1/notes.json';
 const first=fixture(),second=fixture();
 const before=[{noteId:'N1',content:'old'}],middle=[{noteId:'N1',content:'middle'}],latest=[{noteId:'N1',content:'latest'}];
 for(const [step,unit,old,next]of [[first,'LV3-U02',before,middle],[second,'LV3-U04',middle,latest]] as const){
  step.manifest.unit=unit;step.scope.unit=unit;
  const patch={...step.manifest.patches[0],dataset:'notes',path,key:'noteId',id:'N1',before:old[0],after:{content:next[0].content}};
  step.manifest.patches=[patch];step.manifest.collections={notes:{path,key:'noteId',rowsField:null}};
  step.scope.collections=structuredClone(step.manifest.collections);
  step.scope.rows=[{dataset:'notes',id:'N1',beforeHash:auditHash(old[0]),after:patch.after}];
  step.manifest.scopeHash=auditHash(step.scope);
  step.manifest.files={[path]:{beforeHash:auditHash(old),afterHash:auditHash(next),beforeByteHash:'0'.repeat(64),afterByteHash:'1'.repeat(64)}};
 }
 const steps=[{manifest:first.manifest,scope:first.scope},{manifest:second.manifest,scope:second.scope}];
 assert.deepEqual(reverseFileAuditSteps([steps[1]],path,latest),middle);
 assert.deepEqual(reverseFileAuditSteps(steps,path,latest),before);
 assert.throws(()=>reverseFileAuditSteps([...steps].reverse(),path,latest),/drift/);
 const bad=[{...latest[0],unknown:true}];assert.throws(()=>reverseFileAuditSteps(steps,path,bad),/drift/);
});
it('rejects rehashed new-unit cross-unit curriculum paths',()=>{
 const {manifest,scope}=fixture();manifest.unit='LV3-U04';scope.unit='LV3-U04';manifest.scopeHash=auditHash(scope);
 assert.throws(()=>validateAuditScope(manifest,scope),/unit curriculum path mismatch/);
});
it('rejects rehashed new-unit template and item namespace drift during application',()=>{
 const path='src/features/direct/curriculumLV3Unit4.json';
 const original=JSON.parse(readFileSync(path,'utf8'));
 for(const mode of ['template','namespace']){
  const {manifest,scope}=fixture(),value=structuredClone(original);
  manifest.unit='LV3-U04';scope.unit=manifest.unit;
  if(mode==='template')value.template.unit=5;
  else value.learningItems[0].learningItemId='LI-LV3U05-V001';
  const before=value.learningItems[0],after={targetMeaningZh:'reviewed synthetic meaning'};
  const patch={...manifest.patches[0],dataset:'curriculum',path,key:'learningItemId',id:before.learningItemId,before,after,
   fieldEvidence:{targetMeaningZh:[{proposal:'test',reason:'test',sources:['test']}]}};
  manifest.patches=[patch];manifest.collections={curriculum:{path,key:'learningItemId',rowsField:'learningItems'}};
  scope.collections=structuredClone(manifest.collections);scope.rows=[{dataset:'curriculum',id:patch.id,beforeHash:auditHash(before),after}];
  manifest.scopeHash=auditHash(scope);manifest.files={[path]:{beforeHash:auditHash(value),afterHash:'0'.repeat(64),beforeByteHash:'0'.repeat(64),afterByteHash:'1'.repeat(64)}};
  assert.throws(()=>projectAuditStep(manifest,{[path]:value},false,scope));
 }
});
it('limits vocabulary meaningSource values and prevents grammar/vocabulary field crossover',()=>{
 for(const [kind,field,value,valid]of [
  ['vocabulary','meaningSource','textbook_source_review',true],
  ['vocabulary','meaningSource','textbook_and_dictionary_review',true],
  ['vocabulary','meaningSource','textbook_transcription',false],
  ['vocabulary','explanationZh','wrong kind',false],
  ['grammar','sensePos','v.',false],
  ['vocabulary','review','approved',false],
 ] as const){
  const {manifest,scope}=fixture(),patch=manifest.patches[0];patch.before.kind=kind;
  patch.after={[field]:value};patch.fieldEvidence={[field]:[{sources:['test'],reason:'test',proposal:'test'}]};
  scope.rows[0].beforeHash=auditHash(patch.before);scope.rows[0].after=structuredClone(patch.after);manifest.scopeHash=auditHash(scope);
  if(valid)validateAuditScope(manifest,scope);else assert.throws(()=>validateAuditScope(manifest,scope));
 }
});
