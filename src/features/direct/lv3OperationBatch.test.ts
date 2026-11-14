import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {afterAll,describe,it,vi} from 'vitest';
import * as current from './lv3Audit.testSupport';
import * as baseline from './lv3Audit.preBatch.testSupport';
type Row=Record<string,unknown>;
const read=(path:string)=>readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const parse=(path:string)=>JSON.parse(read(path));
const unit='LV3-U06';
const step=current.loadLV3Chain().filter(current.isAuditUnitStep).find(x=>x.entry.unit===unit)!;
const paths=[...Object.keys(step.manifest.files!),...Object.keys(step.manifest.derivedAfter!)];
// Exact pre-optimization helper is retained as an independent regression fixture.
const stagedPaths=['public/data/v1/words.json','public/data/v1/sa-pack.json'];
it.each(paths.filter(path=>!stagedPaths.includes(path)))('matches the entire pre-batch semantic output: %s',path=>{
 const input=parse(path),original=structuredClone(input);
 const expected=baseline.lv3AfterUnitFile(unit,path,input);
 const actual=current.lv3AfterUnitFiles(unit,{[path]:input})[path];
 assert.deepEqual(actual,expected);assert.deepEqual(input,original);
});
// Authorized v6 timing contract: these two cases now use two independently
// timed stages. This does not retroactively pass the original combined v5 cases.
type StagedSnapshot={bytes:Buffer;expected:unknown};
type StageSlot={value?:StagedSnapshot};
function consumeStage(slot:StageSlot,bytes:Buffer):StagedSnapshot {
 try{
  assert.ok(slot.value,'staged baseline is missing; both stages must run');
  assert.ok(bytes.equals(slot.value.bytes),'input bytes changed between equivalence stages');
  return slot.value;
 }finally{slot.value=undefined;}
}
for(const path of stagedPaths)describe.sequential('staged complete semantic equivalence: '+path,{shuffle:false},()=>{
 const slot:StageSlot={};
 afterAll(()=>{slot.value=undefined;});
 it('stage 1: complete original projection and input integrity',({onTestFailed})=>{
  slot.value=undefined;onTestFailed(()=>{slot.value=undefined;});
  const bytes=readFileSync(path),input=JSON.parse(bytes.toString('utf8')),original=structuredClone(input);
  const expected=baseline.lv3AfterUnitFile(unit,path,input);
  assert.deepEqual(input,original);
  slot.value={bytes,expected};
 },5000);
 it('stage 2: fresh projection, full equality and input integrity',()=>{
  try{
   const bytes=readFileSync(path),snapshot=consumeStage(slot,bytes);
   const input=JSON.parse(bytes.toString('utf8')),original=structuredClone(input);
   const actual=current.lv3AfterUnitFiles(unit,{[path]:input})[path];
   assert.deepEqual(actual,snapshot.expected);assert.deepEqual(input,original);
  }finally{slot.value=undefined;}
 },5000);
});
it.each(stagedPaths)('rejects missing or changed staged input and accepts restoration: %s',path=>{
 const bytes=readFileSync(path),text=bytes.toString('utf8'),expected={fixture:true},slot:StageSlot={};
 assert.throws(()=>consumeStage(slot,bytes),/baseline is missing/);assert.equal(slot.value,undefined);
 const value=JSON.parse(text);if(Array.isArray(value))value[0].unrecorded=true;else value.unrecorded=true;
 const newlineChange=text.includes('\r\n')?text.replace(/\r\n/g,'\n'):text.replace(/\n/g,'\r\n');
 assert.notEqual(newlineChange,text,'fixture must include a newline');
 for(const changed of [JSON.stringify(value),text+' ',newlineChange]){
  slot.value={bytes,expected};assert.throws(()=>consumeStage(slot,Buffer.from(changed)),/bytes changed/);assert.equal(slot.value,undefined);
  slot.value={bytes,expected};assert.deepEqual(consumeStage(slot,bytes),{bytes,expected});assert.equal(slot.value,undefined);
 }
},5000);
it.each(paths)('matches all pre-batch published bytes: %s',path=>{
 const input=read(path),expected=baseline.lv3AfterUnitPublishedText(unit,path,input);
 assert.equal(current.lv3AfterUnitPublishedTexts(unit,{[path]:input})[path],expected);
});
const starter=parse('public/data/v1/sa-pack.json') as Row;
const datasets=['words','senses','examples','relations','morphemes','notes','examPriorities','media'];
it.each(datasets)('matches the entire pre-batch historical dataset: %s',name=>{
 const input=starter[name],original=structuredClone(input);
 assert.deepEqual(current.lv3BeforeAuditDatasets({[name]:input},{allowMissing:true})[name],baseline.lv3BeforeAudit(name,input,{allowMissing:true}));
 assert.deepEqual(input,original);
});
it('retains all batch entries, original inputs and independent output ownership',()=>{
 const inputs={'scripts/sources/LV3Unit18.json':parse('scripts/sources/LV3Unit18.json'),'scripts/sources/LV3Unit19.json':parse('scripts/sources/LV3Unit19.json')};
 const original=structuredClone(inputs),out=current.lv3AfterUnitFiles('LV3-U19',inputs);
 assert.deepEqual(out,inputs);assert.deepEqual(inputs,original);
 (out['scripts/sources/LV3Unit19.json'] as Row).unrecorded=true;
 assert.deepEqual(inputs,original);assert.deepEqual(current.lv3AfterUnitFiles('LV3-U19',inputs),original);
});
it.each(['semantic','raw'] as const)('rejects a later corrupt batch entry and recovers: %s',api=>{
 const first='scripts/sources/LV3Unit18.json',last='scripts/sources/LV3Unit19.json';
 if(api==='semantic'){
  const input={[first]:parse(first),[last]:parse(last)},original=structuredClone(input);
  assert.throws(()=>current.lv3AfterUnitFiles('LV3-U19',{...input,[last]:{...input[last],unrecorded:true}}),/drift/);
  assert.deepEqual(input,original);assert.deepEqual(current.lv3AfterUnitFiles('LV3-U19',input),original);
 }else{
  const input={[first]:read(first),[last]:read(last)};
  assert.throws(()=>current.lv3AfterUnitPublishedTexts('LV3-U19',{...input,[last]:input[last]+' '}),/drift/);
  assert.deepEqual(current.lv3AfterUnitPublishedTexts('LV3-U19',input),input);
 }
});
const migration='docs/lv3-audit-20261107/starter-media-actual-names-v1/';
const authenticatedPaths=['docs/lv3-audit-20261107/chain.json','docs/lv3-audit-20261107/U19-patches.json','docs/lv3-audit-20261107/U19-scope.json',...['before-builder.py','after-builder.py','before-pack.json','after-pack.json'].map(p=>migration+p),'public/data/v1/media.json','public/data/v1/exam_priority.json','scripts/sources/LV3Unit18.json','scripts/sources/LV3Unit19.json'];
const cases=authenticatedPaths.flatMap(path=>['semantic','raw','rows'].map(api=>({path,api})));
it.each(cases)('reauthenticates and recovers on every public batch: $api $path',async({path,api})=>{
 const original=readFileSync(path),target='scripts/sources/LV3Unit19.json',targetValue=parse(target),targetText=read(target);
 let override:Buffer|undefined;const counts=new Map<string,number>();
 vi.resetModules();
 vi.doMock('node:fs',async()=>{
  const actual=await vi.importActual<typeof import('node:fs')>('node:fs');
  return {...actual,readFileSync:(...args:Parameters<typeof readFileSync>)=>{
   const name=String(args[0]).replace(/\\/g,'/'),key=authenticatedPaths.find(p=>name===p||name.endsWith('/'+p));
   if(key)counts.set(key,(counts.get(key)??0)+1);
   if(key!==path||override===undefined)return actual.readFileSync(...args);
   const option=args[1] as unknown,encoded=typeof option==='string'||(option!==null&&typeof option==='object'&&'encoding' in option&&Boolean(option.encoding));
   return encoded?override.toString('utf8'):Buffer.from(override);
  }};
 });
 try{
  const h=await import('./lv3Audit.testSupport');
  const call=()=>api==='semantic'?h.lv3AfterUnitFiles('LV3-U19',{[target]:targetValue}):api==='raw'?h.lv3AfterUnitPublishedTexts('LV3-U19',{[target]:targetText}):h.lv3BeforeAuditDatasets({media:starter.media},{allowMissing:true});
  const expected=call();
  for(const p of authenticatedPaths)assert.ok((counts.get(p)??0)>0,`first call authenticates ${p}`);
  const firstCount=counts.get(path)!;
  if(path.endsWith('/chain.json')){const value=JSON.parse(original.toString('utf8'));value.baseline='unrecognized';override=Buffer.from(JSON.stringify(value));}
  else if(path.endsWith('/U19-patches.json')||path.endsWith('/U19-scope.json')){const value=JSON.parse(original.toString('utf8'));value.unrecorded=true;override=Buffer.from(JSON.stringify(value));}
  else override=Buffer.concat([original,Buffer.from(' ')]);
  assert.throws(call);assert.ok(counts.get(path)!>firstCount,'second call rereads changed bytes');
  override=undefined;assert.deepEqual(call(),expected,'restoration is accepted with no stale failure or success');
 }finally{vi.doUnmock('node:fs');vi.resetModules();}
 assert.deepEqual(readFileSync(path),original,'no actual on-disk data changed');
});
it('reads the six migration inputs once per batch and again in the next call',async()=>{
 const counts=new Map<string,number>();
 const watched=authenticatedPaths.filter(p=>p.startsWith(migration)||p.endsWith('/media.json')||p.endsWith('/exam_priority.json'));
 vi.resetModules();vi.doMock('node:fs',async()=>{const actual=await vi.importActual<typeof import('node:fs')>('node:fs');return {...actual,readFileSync:(...args:Parameters<typeof readFileSync>)=>{const name=String(args[0]).replace(/\\/g,'/'),key=watched.find(p=>name===p||name.endsWith('/'+p));if(key)counts.set(key,(counts.get(key)??0)+1);return actual.readFileSync(...args);}};});
 try{
  const h=await import('./lv3Audit.testSupport');
  const inputs=Object.fromEntries(['scripts/sources/LV3Unit18.json','scripts/sources/LV3Unit19.json'].map(p=>[p,parse(p)]));
  h.lv3AfterUnitFiles('LV3-U19',inputs);for(const p of watched)assert.equal(counts.get(p),1,p);
  h.lv3AfterUnitFiles('LV3-U19',inputs);for(const p of watched)assert.equal(counts.get(p),2,p);
 }finally{vi.doUnmock('node:fs');vi.resetModules();}
});
it.each(['request','nested','options','proxy'] as const)('rejects executable batch input without invoking it: %s',kind=>{
 let invoked=0;const getter=()=>{invoked++;return true;};
 const path='scripts/sources/LV3Unit19.json',value=parse(path);
 if(kind==='request'){
  const request=Object.defineProperty({},path,{enumerable:true,get:getter});
  assert.throws(()=>current.lv3AfterUnitFiles('LV3-U19',request),/accessor/);
  assert.throws(()=>current.lv3AfterUnitPublishedTexts('LV3-U19',request),/accessor/);
  assert.throws(()=>current.lv3BeforeAuditDatasets(request),/accessor/);
 }else if(kind==='nested'){
  Object.defineProperty(value,'bad',{enumerable:true,get:getter});
  assert.throws(()=>current.lv3AfterUnitFiles('LV3-U19',{[path]:value}),/accessor/);
  assert.throws(()=>current.lv3BeforeAuditDatasets({words:[value]}),/accessor/);
 }else if(kind==='options'){
  const options=Object.defineProperty({},'allowMissing',{enumerable:true,get:getter});
  assert.throws(()=>current.lv3BeforeAuditDatasets({media:[]},options),/accessor/);
 }else{
  const proxy=new Proxy({[path]:value},{ownKeys(){invoked++;return [path];},get(){invoked++;return value;},getPrototypeOf(){invoked++;return Object.prototype;}});
  assert.throws(()=>current.lv3AfterUnitFiles('LV3-U19',proxy),/proxy/);
  assert.throws(()=>current.lv3BeforeAuditDatasets(proxy),/proxy/);
 }
 assert.equal(invoked,0);
});
it('retains strict checking of extra array properties before any cloning',()=>{
 const path='public/data/v1/senses.json',value=parse(path) as unknown[]&{extra?:boolean};value.extra=true;
 assert.throws(()=>current.lv3AfterUnitFiles('LV3-U19',{[path]:value}),/strict semantic drift/);
});
