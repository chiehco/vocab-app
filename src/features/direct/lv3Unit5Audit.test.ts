import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {it} from 'vitest';
import {findUnit} from './model';
import {auditHash,isAuditUnitStep,loadLV3Chain,lv3AfterUnitPublishedText} from './lv3Audit.testSupport';

const unit='LV3-U05';
const step=loadLV3Chain().filter(isAuditUnitStep).find(x=>x.entry.unit===unit)!;
const manifest=step.manifest;

it('authenticates all 56 actual U05 after rows and all six published files',()=>{
 assert.equal(step.entry.status,'committed');
 assert.equal(auditHash(manifest),'f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77');
 assert.equal(auditHash(step.scope),'a7311a6598b6531f4aaa500bd97ffd7efdfed134445ec6f2da5b7919d4b97d08');
 assert.equal(manifest.patches.length,56);
 assert.equal(manifest.patches.reduce((n,p)=>n+Object.keys(p.after).length,0),146);

 const paths=[...Object.keys(manifest.files!),...Object.keys(manifest.derivedAfter!)];
 const expected={...Object.fromEntries(Object.entries(manifest.files!).map(([path,g])=>[path,g.afterByteHash])),...manifest.derivedAfter};
 assert.equal(Object.keys(expected).length,6);
 assert.equal(new Set(paths).size,paths.length);
 const assigned=paths.flatMap(path=>manifest.patches.filter(p=>p.path===path));
 assert.deepEqual(assigned.map(p=>p.dataset+':'+p.id).sort(),manifest.patches.map(p=>p.dataset+':'+p.id).sort());
 for(const patch of manifest.patches){assert.ok(Object.hasOwn(manifest.files!,patch.path));assert.ok(Object.hasOwn(manifest.collections!,patch.dataset));}
});

it.each([...Object.keys(manifest.files!),...Object.keys(manifest.derivedAfter!)])('authenticates complete U05 published file: %s',(path)=>{
 const published=new Map([[path,lv3AfterUnitPublishedText(unit,path,readFileSync(path,'utf8').replace(/\r\n/g,'\n'))]]);
 const documents=new Map(Object.hasOwn(manifest.files!,path)?[[path,JSON.parse(published.get(path)!)]]:[]);
 if(Object.hasOwn(manifest.files!,path)){
  const guard=manifest.files![path];
  assert.equal(auditHash(documents.get(path)),guard.afterHash,path);
 }
 for(const patch of manifest.patches.filter(p=>p.path===path)){
  const collection=manifest.collections![patch.dataset],document=documents.get(patch.path);
  const rows=(collection.rowsField?document[collection.rowsField]:document) as Record<string,unknown>[];
  const matches=rows.filter(row=>row[patch.key]===patch.id);
  assert.equal(matches.length,1,patch.id);
  assert.deepEqual(matches[0],{...patch.before,...patch.after},patch.id);
 }
 const expected={...Object.fromEntries(Object.entries(manifest.files!).map(([path,g])=>[path,g.afterByteHash])),...manifest.derivedAfter};
 const digest=expected[path];
  const text=published.get(path)!;
  assert.equal(createHash('sha256').update(text).digest('hex'),digest,path);
});

it('checks all 20 reviewed unmapped supplements in actual U05 runtime instead of an empty old-source filter',()=>{
 const patches=manifest.patches.filter(p=>p.dataset==='curriculum'&&p.after.meaningSource==='textbook_source_review');
 assert.equal(patches.length,20);
 const runtime=findUnit(5,'LV3')!;
 assert.ok(runtime);
 for(const patch of patches){
  const matches=runtime.items.filter(item=>item.learningItemId===patch.id);
  assert.equal(matches.length,1,patch.id);
  const item=matches[0];
  for(const field of ['sensePos','targetMeaningZh','chapterMeaningsZh','meaningSource'] as const)
   assert.equal(item[field],patch.after[field],`${patch.id}: ${field}`);
  assert.equal(item.officialWordId,null);
  assert.equal(item.officialSenseId,null);
  assert.equal(item.practiceMode,'read_only');
 }
});
