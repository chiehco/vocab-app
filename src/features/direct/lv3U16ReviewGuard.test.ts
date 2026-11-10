import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {it} from 'vitest';
import {auditHash,validateAuditScope,projectAuditStep,verifiedU16ReviewPatch,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';
type Mutation={op:'set'|'remove';path:(string|number)[];value?:unknown};
type Case={name:string;unit:string;base:string;mutations:Mutation[];valid:boolean;guardValid:boolean;reverseObjectKeys?:boolean;manifestExtra?:boolean};
const fixture=JSON.parse(readFileSync(new URL('../../../scripts/fixtures/lv3_u16_review_cases.json',import.meta.url),'utf8')) as {bases:Record<string,AuditPatch>;curriculumOriginal:{learningItems:Record<string,unknown>[]};cases:Case[]};
const cases=fixture.cases;
function materialize(c:Case):AuditPatch {
 const q=structuredClone(fixture.bases[c.base]);
 for(const mutation of c.mutations){
  let owner=q as unknown as Record<string|number,unknown>;
  for(const key of mutation.path.slice(0,-1))owner=owner[key] as Record<string|number,unknown>;
  const key=mutation.path.at(-1)!;
  if(mutation.op==='remove'){
   if(Array.isArray(owner))owner.splice(Number(key),1);else delete owner[key];
  }else owner[key]=structuredClone(mutation.value);
 }
 function reverseKeys(value:unknown):unknown {
  if(Array.isArray(value))return value.map(reverseKeys);
  return value!==null&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverseKeys(v)])):value;
 }
 return c.reverseObjectKeys?reverseKeys(q) as AuditPatch:q;
}
for(const c of cases)it('bounded U16 review: '+c.name,()=>{
 const p=materialize(c),envelope={...fixture.bases[c.base],...p},path=envelope.path;
 const collections={[envelope.dataset]:{path,key:envelope.key,rowsField:envelope.dataset==='curriculum'?'learningItems':null}};
 // Mutations receive fresh scopes and hashes. Stale seals cannot cause a false negative.
 const scope:AuditScope={schemaVersion:1,unit:c.unit,baseline:'99883751926bd6cb4feff70daff56c07afc130cb',collections,
  rows:[{dataset:envelope.dataset,id:envelope.id,beforeHash:auditHash(envelope.before),after:envelope.after}]};
 const manifest:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,collections,
  files:{[path]:{beforeHash:'0'.repeat(64),afterHash:'0'.repeat(64),beforeByteHash:'0'.repeat(64),afterByteHash:'0'.repeat(64)}},
  patches:[p],scopeHash:auditHash(scope),parentManifestHash:'0'.repeat(64),readiness:'pending_independent_before_capture',scope:'U16-scope.json',
  unchangedInputs:{},derivedBefore:{},beforeMeta:{},beforePackMeta:{},derivedAfter:null,afterMeta:null};
 const guard=(m:AuditManifest,p:AuditPatch)=>verifiedU16ReviewPatch(m,p);
 if(c.manifestExtra)(manifest as unknown as Record<string,unknown>).extra=true;
 assert.equal(guard(manifest,p),c.guardValid);
 if(!c.valid){assert.throws(()=>validateAuditScope(manifest,scope));return;}
 validateAuditScope(manifest,scope);
 // Independent expected rows, never reconstructed from projection output.
 let before:unknown=[structuredClone(p.before)],after:unknown=[{...p.before,...p.after}];
 if(p.dataset==='curriculum'){
  before=structuredClone(fixture.curriculumOriginal);
  const index=(before as typeof fixture.curriculumOriginal).learningItems.findIndex(x=>x.learningItemId===p.id);
  (before as typeof fixture.curriculumOriginal).learningItems[index]=structuredClone(p.before);after=structuredClone(before);
  const row=(after as typeof fixture.curriculumOriginal).learningItems.find(x=>x.learningItemId===p.id)!;Object.assign(row,p.after);
 }else{
  const sentinel=p.dataset==='senses'?{senseId:'S-U16-untouched',wordId:'W-U16-untouched',status:'needs_check',note:'unchanged'}:p.dataset==='words'?{wordId:'W-U16-untouched',word:'untouched',meaningZh:'unchanged'}:{exampleId:'EX-untouched',sentenceEn:'Original.',answer:'Original',status:'reviewed'};
  (before as unknown[]).push(sentinel);(after as unknown[]).push(sentinel);
 }
 manifest.files![path].beforeHash=auditHash(before);manifest.files![path].afterHash=auditHash(after);
 assert.deepEqual(projectAuditStep(manifest,{[path]:before},false,scope),{[path]:after});
 assert.deepEqual(projectAuditStep(manifest,{[path]:after},true,scope),{[path]:before});
});
