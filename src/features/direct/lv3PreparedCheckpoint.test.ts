import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {it,vi} from 'vitest';

it('rejects a registered prepared checkpoint for semantic and raw projections',async()=>{
 const original=JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8'));
 const chain=structuredClone(original);
 const committed=chain.entries.filter((e:{status:string})=>e.status==='committed');
 const last=committed[committed.length-1];
 assert.equal(last.status,'committed');assert.notEqual(last.unit,'LV3-U01');
 last.status='prepared';
 const target=last.unit as string;
 const notes=JSON.parse(readFileSync('public/data/v1/notes.json','utf8'));
 const meta=readFileSync('public/data/v1/meta.json','utf8').replace(/\r\n/g,'\n');
 const current=await import('./lv3Audit.testSupport');
 // Positive controls authenticate the exact same current inputs before mocking.
 // If prepared entries were selectable, both rejection assertions below fail.
 assert.deepEqual(current.lv3AfterUnitFile(target,'public/data/v1/notes.json',notes),notes);
 assert.equal(current.lv3AfterUnitPublishedText(target,'public/data/v1/meta.json',meta),meta);
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
  assert.equal(loaded.find(x=>x.entry.unit===target)?.entry.status,'prepared');
  assert.throws(()=>helper.lv3AfterUnitFile(target,'public/data/v1/notes.json',notes),/uncommitted checkpoint/);
  assert.throws(()=>helper.lv3AfterUnitPublishedText(target,'public/data/v1/meta.json',meta),/uncommitted checkpoint/);
 }finally{
  vi.doUnmock('node:fs');vi.resetModules();
 }
 assert.deepEqual(JSON.parse(readFileSync('docs/lv3-audit-20261107/chain.json','utf8')),original);
});
