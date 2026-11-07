import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {describe, it, vi} from 'vitest';
import {auditHash, auditContract, loadLV3Chain, lv3AfterUnitPublishedText} from './lv3Audit.testSupport';
import {BUILDER, PACK, MIGRATION_ID, migrationByteHash as digest, validateStarterMediaMigration,
 inverseStarterMediaMigrationRaw, inverseStarterMediaMigrationNormalized, type StarterMediaMigration} from './starterMediaMigration.testSupport';

type Maps = {raw:Record<string,string>; normalized:Record<string,string>};
type Capture = {time:string; base:string; files:Record<string,string>; rawFiles:Record<string,string>};
const mode=process.env.LV3_REAL_MEDIA_STATE;
const evidence='output/lv3-audit-20261107/starter-media-real-validation-20261108-qa-final';
const docs='docs/lv3-audit-20261107';
const normalized=(text:string)=>text.replace(/\r\n/g,'\n');
const read=(path:string)=>readFileSync(path,'utf8');
const maps=(texts:Record<string,string>):Maps=>({
 raw:Object.fromEntries(Object.entries(texts).map(([p,t])=>[p,digest(t)])),
 normalized:Object.fromEntries(Object.entries(texts).map(([p,t])=>[p,digest(normalized(t))])),
});

// Opt-in integration evidence. A missing capture must never become a silent pass.
describe.skipIf(mode===undefined)('real sealed starter media checkpoint',()=>{
 it('authenticates the real descriptor, four raw fixtures and all 144 captured inputs',()=>{
  assert.ok(mode==='candidate'||mode==='committed','explicit candidate or committed state required');
  const m:StarterMediaMigration=JSON.parse(read(`${docs}/${MIGRATION_ID}-manifest.json`));
  assert.equal(auditHash(m),'88ba19b48f296fc26b7abdac6468bc1dc26f474523ac78b309aabfed0456578b');
  assert.equal(m.parentManifestHash,'f7ad8f7a18f1b52eeb0be70ae233648de464032ed4819ad7f42cc9f6dc84de77');
  const captureText=read('output/playwright/starter-media/inputs-before-final.json');
  assert.equal(digest(captureText),'1c0cacb817f9a4b8bb268cd7ab3fd7b6555efe89edc49e80222f659348a38fc8');
  const capture:Capture=JSON.parse(captureText);
  assert.deepEqual(m.beforeInputs,capture.files);assert.deepEqual(m.beforeRawInputs,capture.rawFiles);
  const proof=validateStarterMediaMigration(m,read,capture.files);
  assert.ok(Array.isArray(proof.before.media)&&Array.isArray(proof.after.media));
  assert.equal(proof.before.media.length,746);assert.equal(proof.after.media.length,1128);
  assert.equal(m.delta.length,382);
  const statuses:Record<string,number>={};
  for(const {row} of m.delta){assert.equal(typeof row.status,'string');const status=String(row.status);statuses[status]=(statuses[status]??0)+1;}
  assert.deepEqual(statuses,{approved:316,draft:52,needs_redraw:14});
  const paths=Object.keys(m.beforeInputs).sort();assert.equal(paths.length,144);
  const chain=loadLV3Chain(),step=chain.find(s=>s.entry.migrationId===MIGRATION_ID);
  assert.ok(step);assert.equal(step.entry.status,mode==='candidate'?'prepared':'committed');
  const committed=chain.filter(s=>s.entry.status==='committed');
  const changedAfter=(target:string)=>{
   const index=committed.findIndex(s=>(s.entry.migrationId??s.entry.unit)===target);
   assert.ok(index>=0,'target must be committed');
   const changed=new Set<string>();
   for(const {manifest} of committed.slice(index+1)){
    if(manifest.schemaVersion===3){changed.add(BUILDER);changed.add(PACK);}
    else{
     assert.ok('patches' in manifest);
     for(const path of Object.keys(auditContract(manifest).files))changed.add(path);
     for(const path of Object.keys(manifest.derivedAfter??{}))changed.add(path);
    }
   }
   return changed;
  };
  const expectedAt=(target:string)=>{
   const anchor:{inputs:Record<string,string>}=JSON.parse(read(`${docs}/U01-checkpoint.json`));
   const expected={...anchor.inputs};
   for(const {entry,manifest} of committed){
    if('patches' in manifest){
     for(const [path,guard] of Object.entries(auditContract(manifest).files))if(guard.afterByteHash)expected[path]=guard.afterByteHash;
     Object.assign(expected,manifest.derivedAfter??{});
    }else Object.assign(expected,manifest.afterInputs);
    if((entry.migrationId??entry.unit)===target)return expected;
   }
   throw Error('missing original checkpoint guards');
  };
  const directCurrent=mode==='candidate'||committed[committed.length-1].entry.migrationId===MIGRATION_ID;
  const current=Object.fromEntries(paths.map(p=>[p,read(p)]));
  const currentMaps=maps(current);
  if(directCurrent)assert.deepEqual(currentMaps,mode==='candidate'?{raw:m.beforeRawInputs,normalized:m.beforeInputs}:{raw:m.afterRawInputs,normalized:m.afterInputs});
  const laterChanges=mode==='candidate'?new Set<string>():changedAfter(MIGRATION_ID);
  const migrationTexts=mode==='candidate'?current:Object.fromEntries(paths.map(p=>[p,laterChanges.has(p)?lv3AfterUnitPublishedText(MIGRATION_ID,p,normalized(current[p])):normalized(current[p])]));
  if(mode==='committed')assert.deepEqual(maps(migrationTexts).normalized,m.afterInputs);
  assert.equal(paths.filter(p=>m.beforeRawInputs[p]===m.afterRawInputs[p]).length,142);
  const checkpointTexts=directCurrent?current:migrationTexts;
  const before={...checkpointTexts,[BUILDER]:proof.texts.beforeBuilder,[PACK]:proof.texts.beforePack};
  const after={...checkpointTexts,[BUILDER]:proof.texts.afterBuilder,[PACK]:proof.texts.afterPack};
  const pythonBefore:Maps=JSON.parse(read(`${evidence}/observed-before.json`));
  const pythonAfter:Maps=JSON.parse(read(`${evidence}/observed-after.json`));
  if(directCurrent){assert.deepEqual(maps(before),pythonBefore);assert.deepEqual(maps(after),pythonAfter);}
  assert.deepEqual(maps(before).normalized,pythonBefore.normalized);assert.deepEqual(maps(after).normalized,pythonAfter.normalized);
  const rawInverse:Record<string,string>={},lfInverse:Record<string,string>={};
  for(const path of paths){
   const changed=path===BUILDER||path===PACK;
   if(!changed){assert.equal(m.beforeRawInputs[path],m.afterRawInputs[path]);assert.equal(m.beforeInputs[path],m.afterInputs[path]);}
   if(directCurrent){rawInverse[path]=changed?inverseStarterMediaMigrationRaw(m,path,after[path],read):after[path];assert.equal(rawInverse[path],before[path],path);}
   lfInverse[path]=changed?inverseStarterMediaMigrationNormalized(m,path,normalized(after[path]),read):normalized(after[path]);
   assert.equal(lfInverse[path],normalized(before[path]),path);
  }
  if(directCurrent)assert.deepEqual(maps(rawInverse),pythonBefore);
  assert.deepEqual(maps(lfInverse).normalized,pythonBefore.normalized);
  const unchanged='public/data/v1/media.json';
  assert.equal(inverseStarterMediaMigrationNormalized(m,unchanged,normalized(after[unchanged]),read),normalized(before[unchanged]));
  if(directCurrent)assert.equal(inverseStarterMediaMigrationRaw(m,unchanged,after[unchanged],read),before[unchanged]);
  // The published helper consumes LF. Raw forensic fixtures remain unmodified.
  for(const path of [BUILDER,PACK]){
   assert.throws(()=>inverseStarterMediaMigrationRaw(m,path,after[path]+' ',read));
   assert.throws(()=>inverseStarterMediaMigrationNormalized(m,path,normalized(after[path])+' ',read));
  }
  assert.throws(()=>inverseStarterMediaMigrationNormalized(m,'public/data/v1/media.json',normalized(after['public/data/v1/media.json'])+' ',read),/drift/);
  const historical:Record<string,Record<string,string>>={};
  if(mode==='candidate'){
   assert.throws(()=>lv3AfterUnitPublishedText(MIGRATION_ID,PACK,normalized(after[PACK])),/uncommitted checkpoint/);
   assert.throws(()=>lv3AfterUnitPublishedText('LV3-U05',PACK,normalized(after[PACK])),/drift/);
  }else{
   for(const unit of ['LV3-U05','LV3-U04','LV3-U02','LV3-U01']){
    const expected:Maps=JSON.parse(read(`${evidence}/projections/${unit}-observed.json`));
    assert.deepEqual(expected.normalized,expectedAt(unit),'Python evidence versus original guards');
    const hashes:Record<string,string>={};
    const changes=changedAfter(unit);
    for(const path of paths)hashes[path]=digest(changes.has(path)?lv3AfterUnitPublishedText(unit,path,normalized(current[path])):normalized(current[path]));
    assert.equal(digest(lv3AfterUnitPublishedText(unit,unchanged,normalized(current[unchanged]))),expected.normalized[unchanged]);
    assert.deepEqual(hashes,expected.normalized,unit);historical[unit]=hashes;
   }
   assert.throws(()=>lv3AfterUnitPublishedText('LV3-U05',PACK,normalized(current[PACK])+' '),/drift|bytes/);
   assert.throws(()=>lv3AfterUnitPublishedText('LV3-U01','public/data/v1/media.json',normalized(current['public/data/v1/media.json'])+' '),/drift/);
  }
  const output=`output/lv3-audit-20261107/starter-media-ts-${mode}`;mkdirSync(output,{recursive:true});
  writeFileSync(`${output}/observed.json`,JSON.stringify({state:mode,directCurrentRawVerified:directCurrent,manifestHash:auditHash(m),current:currentMaps,
   rawInverse:maps(rawInverse).raw,normalizedInverse:maps(lfInverse).normalized,historicalNormalized:historical},null,2)+'\n');
 },600000);
 it.skipIf(mode!=='committed')('rejects the actually applied migration when its registration is only prepared',async()=>{
  type ChainEntry={migrationId?:string;status:'prepared'|'committed'};
  type Chain={entries:ChainEntry[]};
  const original=read(`${docs}/chain.json`);
  const chain:Chain=JSON.parse(original);
  const migration=chain.entries.find(entry=>entry.migrationId===MIGRATION_ID);
  assert.ok(migration);assert.equal(migration.status,'committed');
  for(const entry of chain.entries.slice(chain.entries.indexOf(migration)))entry.status='prepared';
  const text=normalized(read(PACK));
  // Positive control uses the same real applied bytes, not a fixture.
  const sealed:StarterMediaMigration=JSON.parse(read(`${docs}/${MIGRATION_ID}-manifest.json`));
  assert.equal(digest(lv3AfterUnitPublishedText(MIGRATION_ID,PACK,text)),sealed.afterInputs[PACK]);
  vi.resetModules();
  vi.doMock('node:fs',async()=>{
   const actual=await vi.importActual<typeof import('node:fs')>('node:fs');
   return {...actual,readFileSync:(...args:Parameters<typeof readFileSync>)=>{
    const result=actual.readFileSync(...args);
    if(String(args[0]).replace(/\\/g,'/').endsWith('/docs/lv3-audit-20261107/chain.json'))
     return typeof result==='string'?JSON.stringify(chain):Buffer.from(JSON.stringify(chain));
    return result;
   }};
  });
  try{
   const helper=await import('./lv3Audit.testSupport');
   assert.equal(helper.loadLV3Chain().find(step=>step.entry.migrationId===MIGRATION_ID)?.entry.status,'prepared');
   assert.throws(()=>helper.lv3AfterUnitPublishedText(MIGRATION_ID,PACK,text),/uncommitted checkpoint/);
   assert.throws(()=>helper.lv3AfterUnitFile(MIGRATION_ID,PACK,JSON.parse(text)),/uncommitted checkpoint/);
   assert.throws(()=>helper.lv3AfterUnitPublishedText('LV3-U05',PACK,text),/drift/);
  }finally{vi.doUnmock('node:fs');vi.resetModules();}
  assert.equal(read(`${docs}/chain.json`),original,'mock must not mutate chain bytes');
 },60000);
});
