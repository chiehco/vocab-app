import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {it} from 'vitest';
import {isAuditUnitStep,auditHash,loadLV3Chain,projectAuditStep,inversePublishedAuditStep,lv3AfterUnit1File,lv3AfterUnit1PublishedText,lv3AfterUnitFile,lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

// Opt-in real parity requires the independent capture, sealed manifest and
// Python-applied TEMP fixture artifacts. Default full suites do not fabricate it.
it.runIf(process.env.LV3_PIPELINE_FIXTURE_PARITY==='1')('matches all 37 Python fixture changes and six exact raw inverses in TypeScript',()=>{
 const output='output/lv3-audit-20261107/fixture-validation/';
 const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
 const normalized=(p:string)=>readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const rawHash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const expected=read(output+'python-parity.json') as {manifestHash:string;patchCount:number;physicalFileCount:number;beforeHashes:Record<string,string>;afterHashes:Record<string,string>;inverseHashes:Record<string,string>;inverseByteHashes:Record<string,string>;derivedBefore:Record<string,string>;derivedAfter:Record<string,string>};
 const step=loadLV3Chain().filter(isAuditUnitStep).find(x=>x.entry.unit==='LV3-U02');assert.ok(step?.scope);
 const {manifest,scope}=step;assert.equal(auditHash(manifest),expected.manifestHash);assert.equal(manifest.patches.length,37);assert.equal(expected.patchCount,37);
 const paths=Object.keys(manifest.files!);assert.equal(paths.length,4);assert.equal(expected.physicalFileCount,4);
 const before=Object.fromEntries(paths.map(p=>[p,lv3AfterUnit1File(p,read(p))]));
 if(step.entry.status==='committed')for(const p of paths){
  const current=lv3AfterUnitFile('LV3-U02',p,read(p));assert.equal(auditHash(current),manifest.files![p].afterHash);
  const tampered=structuredClone(current);
  if(Array.isArray(tampered))tampered[0].unrecordedField=true;else tampered.unrecordedField=true;
  assert.throws(()=>lv3AfterUnitFile('LV3-U02',p,tampered),/drift/);
 }
 const pythonAfter=Object.fromEntries(paths.map(p=>[p,read(output+'applied-fixture/'+p)]));
 const after=projectAuditStep(manifest,before,false,scope);
 assert.deepEqual(after,pythonAfter,'full Python/TS after documents');
 const inverse=projectAuditStep(manifest,after,true,scope);
 assert.deepEqual(inverse,before,'full inverse documents');
 for(const path of paths){
  assert.equal(auditHash(before[path]),expected.beforeHashes[path],path);
  assert.equal(auditHash(after[path]),expected.afterHashes[path],path);
  assert.equal(auditHash(inverse[path]),expected.inverseHashes[path],path);
  assert.equal(rawHash(JSON.stringify(inverse[path],null,2)+'\n'),expected.inverseByteHashes[path],path);
 }
 const allPaths=[...paths,'public/data/v1/meta.json','public/data/v1/sa-pack.json'];
 for(const path of allPaths){
  const text=normalized(output+'applied-fixture/'+path);
  const restored=inversePublishedAuditStep(manifest,scope,path,text);
  assert.equal(restored,lv3AfterUnit1PublishedText(path,normalized(path)),'exact original normalized bytes: '+path);
  if(step.entry.status==='committed')assert.throws(()=>lv3AfterUnitPublishedText('LV3-U02',path,normalized(path)+' '),/drift/);
  if(expected.derivedBefore[path]){
   assert.equal(rawHash(restored),expected.derivedBefore[path],path);
   assert.equal(rawHash(text),expected.derivedAfter[path],path);
  }
  assert.throws(()=>inversePublishedAuditStep(manifest,scope,path,text+' '),/after drift/,'unknown raw drift: '+path);
 }
 const report={status:'passed',manifestHash:expected.manifestHash,patchCount:37,physicalFileCount:4,exactRawInverseFiles:6,pythonAfterEqualsTypeScriptAfter:true,allBeforeAfterInverseHashesMatch:true,unknownRawDriftRejected:true,worktreeApplication:false};
 writeFileSync(output+'typescript-parity.json',JSON.stringify(report,null,2)+'\n');
});
