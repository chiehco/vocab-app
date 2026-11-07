import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {it} from 'vitest';
import {auditHash,validateAuditScope,type AuditManifest,type AuditScope,type AuditPatch} from './lv3Audit.testSupport';
const cases=JSON.parse(readFileSync('scripts/fixtures/lv3_wage_forms_cases.json','utf8')) as {name:string;patch:AuditPatch;valid:boolean}[];
for(const c of cases)it('bounded wage forms: '+c.name,()=>{
 const p=structuredClone(c.patch),path=p.path;p.before.wordId=p.id;
 const collections={words:{path,key:'wordId',rowsField:null}};
 const scope:AuditScope={schemaVersion:1,unit:'LV3-U05',baseline:'99883751926bd6cb4feff70daff56c07afc130cb',collections,
  rows:[{dataset:'words',id:p.id,beforeHash:auditHash(p.before),after:p.after}]};
 const manifest:AuditManifest={schemaVersion:2,unit:scope.unit,baseline:scope.baseline,collections,
  files:{[path]:{beforeHash:'0'.repeat(64),afterHash:'0'.repeat(64),beforeByteHash:'0'.repeat(64),afterByteHash:'0'.repeat(64)}},
  patches:[p],scopeHash:auditHash(scope),parentManifestHash:'0'.repeat(64),readiness:'pending_independent_before_capture',scope:'U05-scope.json',
  unchangedInputs:{},derivedBefore:{},beforeMeta:{},beforePackMeta:{},derivedAfter:null,afterMeta:null};
 if(c.valid)validateAuditScope(manifest,scope);else assert.throws(()=>validateAuditScope(manifest,scope));
});
