import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {it,vi} from 'vitest';

type Entry=({kind:'migration';migrationId:string;unit?:never}|{kind?:never;unit:string;migrationId?:never})&{status:'committed'|'prepared'};
type Chain={entries:Entry[]};
const identity=(entry:Entry)=>entry.kind==='migration'?entry.migrationId:entry.unit;
const registered:Chain=JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8'));
for(const selection of ['tail','unit','migration'] as const){
it.skipIf(selection==='migration'&&!registered.entries.some(e=>e.kind==='migration'&&e.status==='committed'))(`rejects a registered prepared ${selection} checkpoint for semantic and raw projections`,async()=>{
 const original:Chain=JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8'));
 const chain=structuredClone(original);
 const committed=chain.entries.filter(e=>e.status==='committed');
 const candidates=committed.filter(e=>selection==='tail'||(selection==='migration'?e.kind==='migration':e.kind!=='migration'));
 const last=candidates[candidates.length-1];
 assert.ok(last);
 assert.equal(last.status,'committed');assert.notEqual(last.unit,'LV3-U01');
 const target=identity(last);
 // Isolate the real prefix: a migration cannot retain an uncommitted predecessor.
 chain.entries=chain.entries.slice(0,chain.entries.indexOf(last)+1);
 last.status='prepared';
 const notes=JSON.parse(readFileSync('public/data/v1/notes.json','utf8'));
 const meta=readFileSync('public/data/v1/meta.json','utf8').replace(/\r\n/g,'\n');
 const current=await import('./lv3Audit.testSupport');
 // Positive controls authenticate the exact same current inputs before mocking.
 // If prepared entries were selectable, both rejection assertions below fail.
 const projectedNotes=current.lv3AfterUnitFile(target,'public/data/v1/notes.json',notes);
 const projectedMeta=current.lv3AfterUnitPublishedText(target,'public/data/v1/meta.json',meta);
 if(selection==='tail'){
  assert.deepEqual(projectedNotes,notes);
  assert.equal(projectedMeta,meta);
 }
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
  const loaded=helper.loadLV3Chain();
  assert.equal(loaded.find(x=>(x.entry.kind==='migration'?x.entry.migrationId:x.entry.unit)===target)?.entry.status,'prepared');
  assert.throws(()=>helper.lv3AfterUnitFile(target,'public/data/v1/notes.json',notes),/uncommitted checkpoint/);
  assert.throws(()=>helper.lv3AfterUnitPublishedText(target,'public/data/v1/meta.json',meta),/uncommitted checkpoint/);
 }finally{
  vi.doUnmock('node:fs');vi.resetModules();
 }
 assert.deepEqual(JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8')),original);
});
}
