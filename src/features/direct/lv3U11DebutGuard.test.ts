import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {it} from 'vitest';
import {auditHash,validateAuditScope,projectAuditStep,verifiedU11DebutForms,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';
type Mutation={op:'set'|'remove';path:(string|number)[];value?:unknown};
type Case={name:string;unit:string;base:string;mutations:Mutation[];valid:boolean;guardValid:boolean;reverseObjectKeys?:boolean;manifestExtra?:boolean};
const fixture=JSON.parse(readFileSync('scripts/fixtures/lv3_u11_debut_cases.json','utf8')) as {bases:Record<string,AuditPatch>;cases:Case[]};
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
for(const c of cases)it('bounded U11 debut: '+c.name,()=>{
 const p=materialize(c),path=p.path;
 const collections={[p.dataset]:{path,key:p.key,rowsField:p.dataset==='curriculum'?'learningItems':null}};
 // Mutations receive fresh scopes and hashes. Stale seals cannot cause a false negative.
 const scope:AuditScope={schemaVersion:1,unit:c.unit,baseline:'99883751926bd6cb4feff70daff56c07afc130cb',collections,
  rows:[{dataset:p.dataset,id:p.id,beforeHash:auditHash(p.before),after:p.after}]};
 const manifest:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,collections,
  files:{[path]:{beforeHash:'0'.repeat(64),afterHash:'0'.repeat(64),beforeByteHash:'0'.repeat(64),afterByteHash:'0'.repeat(64)}},
  patches:[p],scopeHash:auditHash(scope),parentManifestHash:'0'.repeat(64),readiness:'pending_independent_before_capture',scope:'U11-scope.json',
  unchangedInputs:{},derivedBefore:{},beforeMeta:{},beforePackMeta:{},derivedAfter:null,afterMeta:null};
 const guard=(m:AuditManifest,p:AuditPatch)=>verifiedU11DebutForms(m,p);
 if(c.manifestExtra)(manifest as unknown as Record<string,unknown>).extra=true;
 assert.equal(guard(manifest,p),c.guardValid);
 if(!c.valid){assert.throws(()=>validateAuditScope(manifest,scope));return;}
 validateAuditScope(manifest,scope);
 // Independent expected rows, never reconstructed from projection output.
 let before:unknown=[structuredClone(p.before)],after:unknown=[{...p.before,...p.after}];
 if(p.dataset==='curriculum'){
  const sentinel={learningItemId:'LI-LV3U11-G999',kind:'grammar',pattern:'untouched'};
  const template={templateId:'TEXTBOOK-LV3-U11',level:'LV3',unit:11};
  before={template,learningItems:[p.before,sentinel]};after={template,learningItems:[{...p.before,...p.after},sentinel]};
 }else{
  const sentinel={wordId:'W-untouched',word:'untouched',meaningZh:'Original',status:'reviewed'};
  (before as unknown[]).push(sentinel);(after as unknown[]).push(sentinel);
 }
 manifest.files![path].beforeHash=auditHash(before);manifest.files![path].afterHash=auditHash(after);
 assert.deepEqual(projectAuditStep(manifest,{[path]:before},false,scope),{[path]:after});
 assert.deepEqual(projectAuditStep(manifest,{[path]:after},true,scope),{[path]:before});
});
