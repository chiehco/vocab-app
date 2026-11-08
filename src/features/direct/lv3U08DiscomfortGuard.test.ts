import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {it} from 'vitest';
import {auditHash,validateAuditScope,verifiedU08DiscomfortForms,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';
const cases=JSON.parse(readFileSync('scripts/fixtures/lv3_u08_discomfort_cases.json','utf8')) as {name:string;unit:string;patch:AuditPatch;valid:boolean;guardValid:boolean;tsError?:string}[];
for(const c of cases)it('bounded U08 Oxford forms: '+c.name,()=>{
 const p=structuredClone(c.patch),path=p.path;
 const collections={[p.dataset]:{path,key:p.key,rowsField:null}};
 // Every mutation gets fresh row/scope seals; stale hashes cannot pass a negative.
 const scope:AuditScope={schemaVersion:1,unit:c.unit,baseline:'99883751926bd6cb4feff70daff56c07afc130cb',collections,
  rows:[{dataset:p.dataset,id:p.id,beforeHash:auditHash(p.before),after:p.after}]};
 const manifest:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,collections,
  files:{[path]:{beforeHash:'0'.repeat(64),afterHash:'0'.repeat(64),beforeByteHash:'0'.repeat(64),afterByteHash:'0'.repeat(64)}},
  patches:[p],scopeHash:auditHash(scope),parentManifestHash:'0'.repeat(64),readiness:'pending_independent_before_capture',scope:c.unit.slice(4)+'-scope.json',
  unchangedInputs:{},derivedBefore:{},beforeMeta:{},beforePackMeta:{},derivedAfter:null,afterMeta:null};
 assert.equal(verifiedU08DiscomfortForms(manifest,p,p.after.verbForms as Record<string,unknown>),c.guardValid);
 if(c.valid)validateAuditScope(manifest,scope);
 else assert.throws(()=>validateAuditScope(manifest,scope),(error:unknown)=>error instanceof Error&&error.message.includes(c.tsError!));
});
