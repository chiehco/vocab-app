import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import extension from '../../../docs/lv3-u03-recovery-20261122/starter-extension.json';

const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
type Pack={meta:unknown;[dataset:string]:unknown};

/** Restore the exact published 5779-word fixture for historical tests only. */
export function beforeU03StarterText(text:string):string {
  assert.equal(digest(JSON.stringify(extension)),'9356a7533c440303716999e0e45fa3be5fa0e93c7d1ecbb2b4d9c7a909a76db0','U03 extension manifest drift');
  assert.equal(digest(text),extension.afterByteHash,'U03 current starter byte drift');
  const pack=JSON.parse(text) as Pack;
  assert.deepEqual(pack.meta,extension.afterMeta,'U03 current starter metadata drift');
  for(const [dataset,added] of Object.entries(extension.addedRows)) {
    const rows=pack[dataset] as unknown[];
    assert.ok(Array.isArray(rows));
    for(const entry of [...added].reverse()) {
      assert.deepEqual(rows[entry.index],entry.row,'U03 added starter row drift');
      rows.splice(entry.index,1);
    }
  }
  pack.meta=structuredClone(extension.beforeMeta);
  const result=JSON.stringify(pack)+'\n';
  assert.equal(digest(result),extension.beforeByteHash,'U03 complete historical starter drift');
  return result;
}

export function beforeU03Starter<T>(pack:T):T {
  return JSON.parse(beforeU03StarterText(JSON.stringify(pack)+'\n')) as T;
}

export function beforeU03DirectNames(names:string[]):string[] {
  assert.equal(names.filter(name=>name==='curriculumLV3Unit3.json').length,1,'U03 direct file identity drift');
  for(const [path,expected] of Object.entries({
    'src/features/direct/curriculumLV3Unit3.json':'c7bbf7549fe0ee8377a87a6a6def39c8b0c6f64f96c46110de8865d8f906b3dc',
    'scripts/sources/LV3Unit3.json':'0aa5aa15a0a9984dcb538a4436afb2e999c175fea41aefe5eb919e7beb172e3e',
  }))assert.equal(digest(readFileSync(path,'utf8').replace(/\r\n/g,'\n')),expected,'U03 source drift');
  return names.filter(name=>name!=='curriculumLV3Unit3.json');
}
