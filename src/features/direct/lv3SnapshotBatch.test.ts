import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import * as candidate from './lv3Audit.testSupport';
import * as baseline from './lv3Audit.preBatch.testSupport';
import type {AuditManifest,AuditScope} from './lv3Audit.testSupport';
import {BUILDER,PACK,MIGRATION_ID,type StarterMediaMigration} from './starterMediaMigration.testSupport';
type Row=Record<string,unknown>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const json=(v:unknown)=>JSON.stringify(v,null,2)+'\n';
const BASE='99883751926bd6cb4feff70daff56c07afc130cb',path='public/data/v1/words.json';
function step(unit:string,before:Row,after:Row,beforeText=json([before]),afterText=json([after])){
 const collections={words:{path,key:'wordId',rowsField:null}};
 const patch={dataset:'words',path,key:'wordId',id:'W1',before,after:{meaningZh:after.meaningZh},reason:'Fixture',evidence:[],fieldEvidence:{meaningZh:[{sources:['Fixture'],reason:'Fixture',proposal:'Fixture'}]}};
 const scope:AuditScope={schemaVersion:1,unit,baseline:BASE,collections,rows:[{dataset:'words',id:'W1',beforeHash:hash(before),after:patch.after}]};
 const manifest:AuditManifest={schemaVersion:2,unit,baseline:BASE,parentManifestHash:'a'.repeat(64),readiness:'ready',scope:unit+'-fixture-scope.json',scopeHash:hash(scope),collections,files:{[path]:{beforeHash:hash([before]),afterHash:hash([after]),beforeByteHash:digest(beforeText),afterByteHash:digest(afterText)}},patches:[patch],unchangedInputs:{},derivedBefore:{},derivedAfter:{},beforeMeta:{},beforePackMeta:{},afterMeta:{}};
 return {manifest,scope};
}
const oldSteps=(steps:ReturnType<typeof step>[],p:string,text:string)=>{for(const {manifest,scope}of [...steps].reverse())text=baseline.inversePublishedAuditStep(manifest,scope,p,text);return text;};
for(const [name,number,canonical,raw]of [['negative zero',-0,0,'-0'],['positive overflow',Infinity,null,'1e999'],['negative overflow',-Infinity,null,'-1e999']] as const){
 it('preserves complete JSON round-trip semantics for '+name,()=>{
  const first={wordId:'W1',word:'fixture',meaningZh:'one',score:canonical},middle={...first,meaningZh:'two'},unusual={...middle,score:number},last={...unusual,meaningZh:'three'};
  const input=json([last]).replace(/"score": (?:0|null)/,'"score": '+raw);
  const steps=[step('LV3-U06',first,middle),step('LV3-U07',unusual,last,json([unusual]),input)];
  const expected=oldSteps(steps,path,input);
  assert.equal(candidate.inversePublishedAuditSteps(steps,path,input),expected);assert.equal(expected,json([first]));
 });
}
it('preserves structuredClone rejection of a function hidden by an accepted replacement',()=>{
 const before={wordId:'W1',word:'fixture',meaningZh:{invalid:()=>42}},after={...before,meaningZh:'accepted'};
 const steps=[step('LV3-U06',before,after)];
 assert.throws(()=>oldSteps(steps,path,json([after])),/clone|could not be cloned/i);
 assert.throws(()=>candidate.inversePublishedAuditSteps(steps,path,json([after])),/clone|could not be cloned/i);
});
it('preserves structuredClone rejection of a symbol hidden by an accepted replacement',()=>{
 const before={wordId:'W1',word:'fixture',meaningZh:{invalid:Symbol('bad')}},after={...before,meaningZh:'accepted'};
 const steps=[step('LV3-U06',before,after)];
 assert.throws(()=>oldSteps(steps,path,json([after])),/clone|could not be cloned/i);
 assert.throws(()=>candidate.inversePublishedAuditSteps(steps,path,json([after])),/clone|could not be cloned/i);
});
it('rejects intermediate raw guard drift instead of trusting the prior semantic hash',()=>{
 const first={wordId:'W1',word:'fixture',meaningZh:'one'},middle={...first,meaningZh:'two'},last={...first,meaningZh:'three'};
 const steps=[step('LV3-U06',first,middle),step('LV3-U07',middle,last)];steps[0].manifest.files![path].afterByteHash='0'.repeat(64);
 assert.throws(()=>candidate.inversePublishedAuditSteps(steps,path,json([last])),/raw after drift/);
 assert.throws(()=>oldSteps(steps,path,json([last])),/raw after drift/);
});
it('rejects intermediate semantic guard drift even when raw bytes agree',()=>{
 const first={wordId:'W1',word:'fixture',meaningZh:'one'},middle={...first,meaningZh:'two'},last={...first,meaningZh:'three'};
 const steps=[step('LV3-U06',first,middle),step('LV3-U07',middle,last)];steps[0].manifest.files![path].afterHash='0'.repeat(64);
 assert.throws(()=>candidate.inversePublishedAuditSteps(steps,path,json([last])));assert.throws(()=>oldSteps(steps,path,json([last])));
});
function legacy(before:unknown,after:unknown,patches:AuditManifest['patches'],p='fixture.json',key='id',rowsField:string|null=null):AuditManifest{return {schemaVersion:1,unit:'LV3-U01',baseline:BASE,datasets:{media:{path:p,key,rowsField,beforeHash:hash(before),afterHash:hash(after)}},patches};}
it('keeps row indexes correct when multiple legacy patches change keys',()=>{
 const before=[{id:'A',value:1}],after=[{id:'C',value:3}];
 const patches=[{dataset:'media',path:'fixture.json',key:'id',id:'B',before:before[0],after:{id:'B',value:2},reason:'Fixture'},{dataset:'media',path:'fixture.json',key:'id',id:'C',before:{id:'B',value:2},after:{id:'C',value:3},reason:'Fixture'}];
 const steps=[{manifest:legacy(before,after,patches)}];
 assert.deepEqual(candidate.reverseFileAuditSteps(steps,'fixture.json',after),baseline.reverseFileAuditSteps(steps,'fixture.json',after));assert.deepEqual(after,[{id:'C',value:3}]);
});
it('detects duplicates introduced by a prior legacy key restoration',()=>{
 const after=[{id:'C',value:3},{id:'B',value:2}],before=[{id:'A',value:1}];
 const patches=[{dataset:'media',path:'fixture.json',key:'id',id:'B',before:before[0],after:{id:'B',value:2},reason:'Fixture'},{dataset:'media',path:'fixture.json',key:'id',id:'C',before:{id:'B',value:2},after:{id:'C',value:3},reason:'Fixture'}];
 const steps=[{manifest:legacy(before,after,patches)}];
 assert.throws(()=>candidate.reverseFileAuditSteps(steps,'fixture.json',after),/nonunique/);assert.throws(()=>baseline.reverseFileAuditSteps(steps,'fixture.json',after),/nonunique/);
});
it('preserves sparse array holes during semantic projection',()=>{
 const after=[,{id:'C',value:3}],before=[,{id:'A',value:1}];
 const patches=[{dataset:'media',path:'fixture.json',key:'id',id:'C',before:before[1]!,after:{id:'C',value:3},reason:'Fixture'}];
 const steps=[{manifest:legacy(before,after,patches)}],actual=candidate.reverseFileAuditSteps(steps,'fixture.json',after);
 assert.deepEqual(actual,baseline.reverseFileAuditSteps(steps,'fixture.json',after));assert.equal(0 in actual,false);
});
function migrationFixture(){
 const media=[{targetWord:'dog',status:'pending'},{targetWord:'cat',status:'pending'},{targetWord:'outside',status:'approved'}];
 const meta={contentHash:'full:source',wordsHash:'source',counts:{media:3}},words=[{wordId:'W1',word:'cat'},{wordId:'W2',word:'dog'}];
 const pack=(rows:typeof media)=>{const datasets={words,media:rows};return {meta:{counts:{words:2,media:rows.length},wordsHash:'unchanged',contentHash:'sa:'+hash({sourceHash:meta.contentHash,datasets})},...datasets};};
 const before=pack([media[1]]),after=pack(media.slice(0,2)),builder='media = [row for row in source if row.get("targetWord") in selected_names]\n';
 const docs:Record<string,string>={'public/data/v1/media.json':JSON.stringify(media)+'\n','public/data/v1/exam_priority.json':JSON.stringify([{word:'cat',priorityTier:'S'}])+'\n','public/data/v1/meta.json':json(meta)};
 const m:StarterMediaMigration={schemaVersion:3,kind:'starter-media-actual-names',migrationId:MIGRATION_ID,baseline:BASE,parentManifestHash:'a'.repeat(64),readiness:'ready',beforeInputs:{},afterInputs:{},beforeRawInputs:{},afterRawInputs:{},fixtures:{} as StarterMediaMigration['fixtures'],delta:[{sourceIndex:0,afterIndex:0,row:media[0]}],sourceMediaHash:digest(docs['public/data/v1/media.json']),beforeMeta:meta,beforePackMeta:before.meta,afterPackMeta:after.meta};
 const values={beforeBuilder:builder,afterBuilder:builder.replace('in selected_names','in actual_names'),beforePack:JSON.stringify(before)+'\n',afterPack:JSON.stringify(after)+'\n'};
 for(const [k,text]of Object.entries(values)){const key=k as keyof typeof values,side=k.startsWith('before')?'before':'after',p=k.endsWith('Builder')?BUILDER:PACK,filename=k.replace(/(before|after)(Builder|Pack)/,(_,a:string,b:string)=>a+'-'+b.toLowerCase()+(b==='Builder'?'.py':'.json')),fixturePath=`docs/lv3-audit-20261107/${MIGRATION_ID}/${filename}`;docs[fixturePath]=text;m.fixtures[key]={path:fixturePath,sha256:digest(text)};(side==='before'?m.beforeInputs:m.afterInputs)[p]=digest(text);(side==='before'?m.beforeRawInputs:m.afterRawInputs)[p]=digest(text);}
 for(const [p,text]of Object.entries(docs).filter(([p])=>!p.startsWith('docs/')))for(const map of [m.beforeInputs,m.afterInputs,m.beforeRawInputs,m.afterRawInputs])map[p]=digest(text);
 for(let i=0;i<139;i++)for(const map of [m.beforeInputs,m.afterInputs,m.beforeRawInputs,m.afterRawInputs])map[`other/${i}.json`]=digest('same');
 return {m,before,after,load:(p:string)=>docs[p]};
}
it('invalidates row indexes when a migration splice shifts surviving media',()=>{
 const f=migrationFixture(),patch={dataset:'media',path:PACK,key:'targetWord',id:'cat',before:{targetWord:'cat',status:'pending'},after:{},reason:'Fixture'};
 const steps=[{manifest:legacy(f.before,f.before,[patch],PACK,'targetWord','media')},{manifest:f.m},{manifest:legacy(f.after,f.after,[patch],PACK,'targetWord','media')}];
 assert.deepEqual(candidate.reverseFileAuditSteps(steps,PACK,f.after,f.load),baseline.reverseFileAuditSteps(steps,PACK,f.after,f.load));
 assert.deepEqual(candidate.reverseFileAuditSteps(steps,PACK,f.after,f.load),f.before);
});
it('reparses a noncanonical beforeFixture before the next strict row comparison',async()=>{
 const first={wordId:'W1',word:'fixture',meaningZh:'one',score:-0},middle={...first,meaningZh:'two'},last={...first,meaningZh:'three'};
 const fixturePath='docs/lv3-audit-20261107/snapshot-negative-zero-fixture.json';
 const fixture=JSON.stringify([middle]).replace('"score":0','"score":-0')+'\n',input=json([last]).replace('"score": 0','"score": -0');
 const steps=[step('LV3-U06',first,middle,json([first]),fixture),step('LV3-U07',middle,last,fixture,input)];steps[1].manifest.files![path].beforeFixture=fixturePath;
 vi.resetModules();vi.doMock('node:fs',async()=>{const actual=await vi.importActual<typeof import('node:fs')>('node:fs');return {...actual,readFileSync:(...args:Parameters<typeof readFileSync>)=>{const name=String(args[0]).replace(/\\/g,'/');if(name.endsWith('/'+fixturePath)){const option=args[1];return typeof option==='string'?fixture:Buffer.from(fixture);}return actual.readFileSync(...args);}};});
 try{
  const h=await import('./lv3Audit.testSupport');
  const old=await import('./lv3Audit.preBatch.testSupport');
  let expected=input;for(const {manifest,scope}of [...steps].reverse())expected=old.inversePublishedAuditStep(manifest,scope,path,expected);
  assert.equal(h.inversePublishedAuditSteps(steps,path,input),expected);assert.equal(expected,json([first]));
 }finally{vi.doUnmock('node:fs');vi.resetModules();}
});
for(const [name,number,canonical]of [['negative zero',-0,0],['positive overflow',Infinity,null],['negative overflow',-Infinity,null]] as const){
 it('normalizes a restored '+name+' only at a canonical=true serialization boundary',()=>{
  const first={wordId:'W1',word:'fixture',meaningZh:'one'},earlierAfter={...first,meaningZh:canonical},unusual={...first,meaningZh:number},middle={...first,meaningZh:'two'},last={...first,meaningZh:'three'};
  const steps=[step('LV3-U06',first,earlierAfter),step('LV3-U07',unusual,middle),step('LV3-U08',middle,last)];
  const expected=oldSteps(steps,path,json([last]));assert.equal(expected,json([first]));assert.equal(candidate.inversePublishedAuditSteps(steps,path,json([last])),expected);
 });
}
for(const [name,bad]of [['function',()=>42],['symbol',Symbol('bad')]] as const){
 it('keeps structuredClone '+name+' rejection after the proof is canonical=true',()=>{
  const before={wordId:'W1',word:'fixture',meaningZh:{invalid:bad}},middle={...before,meaningZh:'two'},last={...middle,meaningZh:'three'};
  const steps=[step('LV3-U07',before,middle),step('LV3-U08',middle,last)];
  assert.throws(()=>oldSteps(steps,path,json([last])),/clone|could not be cloned/i);
  assert.throws(()=>candidate.inversePublishedAuditSteps(steps,path,json([last])),/clone|could not be cloned/i);
 });
}
it('keeps metadata structuredClone rejection in a warm derived-pack snapshot',()=>{
 const first={wordId:'W1',word:'fixture',meaningZh:'one'},middle={...first,meaningZh:'two'},last={...first,meaningZh:'three'};
 const badMeta={marker:{invalid:()=>42}},middleMeta={marker:'middle'},lastMeta={marker:'last'};
 const pack=(row:Row,meta:Row)=>({words:[row],examples:[],notes:[],meta});
 const p1=pack(first,badMeta),p2=pack(middle,middleMeta),p3=pack(last,lastMeta);
 const steps=[step('LV3-U07',first,middle),step('LV3-U08',middle,last)];
 for(const [s,before,after,meta]of [[steps[0],p1,p2,badMeta],[steps[1],p2,p3,middleMeta]] as const){s.manifest.beforePackMeta=meta;s.manifest.derivedBefore={[PACK]:digest(JSON.stringify(before)+'\n')};s.manifest.derivedAfter={[PACK]:digest(JSON.stringify(after)+'\n')};}
 const text=JSON.stringify(p3)+'\n';assert.throws(()=>oldSteps(steps,PACK,text),/clone|could not be cloned/i);assert.throws(()=>candidate.inversePublishedAuditSteps(steps,PACK,text),/clone|could not be cloned/i);
});
