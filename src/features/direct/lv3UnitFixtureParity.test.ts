import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {it} from 'vitest';
import {unitFixtureOutputDirectory} from './lv3UnitFixtureRun.testSupport';
import {isAuditUnitStep,auditHash,loadLV3Chain,projectAuditStep,inversePublishedAuditStep,lv3AfterUnitFile,lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

// Explicit opt-in: requires the independent before capture and Python TEMP outputs.
// Default suites retain their original coverage and do not fabricate these artifacts.
it.runIf(Boolean(process.env.LV3_UNIT_FIXTURE_PARITY))('matches every row and normalized published byte in a real unit fixture',()=>{
 const unit=process.env.LV3_UNIT_FIXTURE_PARITY!;
 assert.match(unit,/^U\d{2}$/);
 const output=unitFixtureOutputDirectory(unit,process.env.LV3_UNIT_FIXTURE_RUN);
 const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
 const normalized=(p:string)=>readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const rawHash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const expected=read(output+'python-parity.json') as {manifestHash:string;patchCount:number;physicalFileCount:number;afterHashes:Record<string,string>;normalizedBeforeHashes:Record<string,string>};
 const chain=loadLV3Chain(),index=chain.findIndex(x=>x.entry.unit===`LV3-${unit}`);
 assert.ok(index>0); const step=chain[index];assert.ok(isAuditUnitStep(step));const {manifest,scope}=step;assert.ok(scope);
 const parent=chain[index-1].entry.unit??chain[index-1].entry.migrationId;assert.ok(parent);
 assert.equal(auditHash(manifest),expected.manifestHash);
 assert.equal(manifest.patches.length,expected.patchCount);
 const paths=Object.keys(manifest.files!);
 const before=Object.fromEntries(paths.map(p=>[p,lv3AfterUnitFile(parent,p,read(p))]));
 const pythonAfter=Object.fromEntries(paths.map(p=>[p,read(output+'applied-fixture/'+p)]));
 const after=projectAuditStep(manifest,before,false,scope);
 assert.deepEqual(after,pythonAfter,'all full after documents');
 const inverse=projectAuditStep(manifest,after,true,scope);
 assert.deepEqual(inverse,before,'all full inverse documents');
 const allPaths=[...paths,'public/data/v1/meta.json','public/data/v1/sa-pack.json'];
 assert.equal(allPaths.length,expected.physicalFileCount);
 for(const path of allPaths){
  const text=normalized(output+'applied-fixture/'+path);
  const restored=inversePublishedAuditStep(manifest,scope,path,text);
  assert.equal(restored,lv3AfterUnitPublishedText(parent,path,normalized(path)),path);
  assert.equal(rawHash(restored),expected.normalizedBeforeHashes[path],path);
  assert.equal(rawHash(text),expected.afterHashes[path],path);
  assert.throws(()=>inversePublishedAuditStep(manifest,scope,path,text+' '),/after drift/);
 }
 writeFileSync(output+'typescript-parity.json',JSON.stringify({status:'passed',manifestHash:expected.manifestHash,patchCount:expected.patchCount,exactRawInverseFiles:allPaths.length,pythonAfterEqualsTypeScriptAfter:true,allBeforeAfterInverseHashesMatch:true,unknownRawDriftRejected:true,worktreeApplication:false},null,2)+'\n');
});
