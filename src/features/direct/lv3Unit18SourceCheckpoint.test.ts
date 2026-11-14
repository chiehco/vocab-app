import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import rawManifest from '../../../docs/lv3-audit-20261107/U18-patches.json';

type Row=Record<string,unknown>;
type Source=Row&{related:Row[]};
type Entry={unit?:string;status:'committed'|'prepared'};
type Chain={entries:Entry[]};
type State='prepared'|'committed'|'absent';
type Helper=typeof import('./lv3Audit.testSupport');
const path='scripts/sources/LV3Unit18.json';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const originalChain=JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8')) as Chain;
const anchor=readFileSync('docs/lv3-audit-20261107/U01-checkpoint.json','utf8');
const observed=JSON.parse(readFileSync(path,'utf8')) as Source;
const patch=rawManifest.patches.find(p=>p.dataset==='source')!;
const before=structuredClone(observed),after=structuredClone(observed);
const beforeIndex=before.related.findIndex(r=>r.learningItemId===patch.id);
assert.ok(beforeIndex>=0);
before.related[beforeIndex]=structuredClone(patch.before);
after.related[beforeIndex]={...structuredClone(patch.before),...structuredClone(patch.after)};
const beforeText=JSON.stringify(before,null,2)+'\n',afterText=JSON.stringify(after,null,2)+'\n';
assert.equal(hash(beforeText),rawManifest.files[path].beforeByteHash);
assert.equal(hash(afterText),rawManifest.files[path].afterByteHash);

async function withSourceState(state:State,mutation:'none'|'raw'|'semantic'|'photos'|'other_row',check:(h:Helper,source:Source,text:string)=>void){
 const chain=structuredClone(originalChain),index=chain.entries.findIndex(e=>e.unit==='LV3-U18');
 assert.ok(index>0);assert.equal(chain.entries[index-1].unit,'LV3-U17');
 chain.entries=chain.entries.slice(0,state==='absent'?index:index+1);
 if(state!=='absent')chain.entries[index].status=state;
 const source=state==='committed'?after:before,text=state==='committed'?afterText:beforeText;
 let currentText=text;
 if(mutation==='raw')currentText=text+' ';
 else if(mutation!=='none'){
  const changed=structuredClone(source);
  if(mutation==='semantic')changed.unrecordedSourceRoot=true;
  else if(mutation==='photos')(changed.photos as Row[])[0].unrecordedPhotoField=true;
  else {const other=changed.related.find(r=>r.learningItemId!==patch.id);assert.ok(other);other.unrecordedOtherRow=true;}
  currentText=JSON.stringify(changed,null,2)+'\n';
 }
 vi.resetModules();
 vi.doMock('node:fs',async()=>{
  const actual=await vi.importActual<typeof import('node:fs')>('node:fs');
  return {...actual,readFileSync:(...args:Parameters<typeof readFileSync>)=>{
   const result=actual.readFileSync(...args),name=String(args[0]).replace(/\\/g,'/');
   const replacement=name.endsWith('/docs/lv3-audit-20261107/chain.json')?JSON.stringify(chain):name.endsWith('/'+path)?currentText:undefined;
   return replacement===undefined?result:typeof result==='string'?replacement:Buffer.from(replacement);
  }};
 });
 try{check(await import('./lv3Audit.testSupport'),source,text);}
 finally{vi.doUnmock('node:fs');vi.resetModules();}
 expect(readFileSync('docs/lv3-audit-20261107/U01-checkpoint.json','utf8')).toBe(anchor);
 expect(JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8'))).toEqual(originalChain);
}

it.each(['prepared','committed'] as const)('authenticates the exact U18 source in %s state without extending the anchor',async state=>{
 await withSourceState(state,'none',(h,source,text)=>{
  expect(h.lv3AfterUnitFile('LV3-U17',path,source)).toEqual(before);
  expect(h.lv3AfterUnitPublishedText('LV3-U17',path,text)).toBe(beforeText);
  expect(h.lv3AfterUnitFile('LV3-U01',path,source)).toEqual(before);
  expect(h.lv3AfterUnitPublishedText('LV3-U01',path,text)).toBe(beforeText);
  if(state==='committed'){
   expect(h.lv3AfterUnitFile('LV3-U18',path,source)).toEqual(after);
   expect(h.lv3AfterUnitPublishedText('LV3-U18',path,text)).toBe(afterText);
  }else{
   expect(()=>h.lv3AfterUnitFile('LV3-U18',path,source)).toThrow(/uncommitted/);
   expect(()=>h.lv3AfterUnitPublishedText('LV3-U18',path,text)).toThrow(/uncommitted/);
  }
 });
});
it.each(['prepared','committed'] as const)('rejects caller raw and semantic source drift in %s state',async state=>{
 await withSourceState(state,'none',(h,source,text)=>{
  const targets=state==='committed'?['LV3-U17','LV3-U18']:['LV3-U17'];
  for(const target of targets){
   expect(()=>h.lv3AfterUnitFile(target,path,{...source,unrecordedSourceRoot:true})).toThrow(/drift/);
   expect(()=>h.lv3AfterUnitPublishedText(target,path,text+' ')).toThrow(/drift/);
   expect(()=>h.lv3AfterUnitPublishedText(target,path,JSON.stringify({...source,unrecordedSourceRoot:true},null,2)+'\n')).toThrow(/drift/);
  }
 });
});
for(const state of ['prepared','committed'] as const)it.each(['raw','semantic','photos','other_row'] as const)(`rejects current source %s drift with a ${state} owner`,async mutation=>{
 await withSourceState(state,mutation,(h,source,text)=>{
  expect(()=>h.lv3AfterUnitFile('LV3-U17',path,source)).toThrow(/U18 source current checkpoint drift/);
  expect(()=>h.lv3AfterUnitPublishedText('LV3-U17',path,text)).toThrow(/U18 source current checkpoint drift/);
 });
});
it('rejects the supplementary source without its registered U18 owner',async()=>{
 await withSourceState('absent','none',(h,source,text)=>{
  expect(()=>h.lv3AfterUnitFile('LV3-U17',path,source)).toThrow(/unknown checkpoint path/);
  expect(()=>h.lv3AfterUnitPublishedText('LV3-U17',path,text)).toThrow(/unknown U18 supplementary checkpoint path/);
 });
});
