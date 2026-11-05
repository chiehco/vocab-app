import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import u1 from '../../docs/unit-audit-20261105/LV1-U01-patches.json';
import u2 from '../../docs/unit-audit-20261105/LV1-U02-patches.json';
import u3 from '../../docs/unit-audit-20261105/LV1-U03-patches.json';
import pig from '../../docs/unit-audit-20261105/LV1-U01-definition-supplement.json';
import u3Remaining from '../../docs/unit-audit-20261105/LV1-U03-remaining-patches.json';
import u4 from '../../docs/unit-audit-20261105/LV1-U04-patches.json';

type Row = Record<string, unknown>;
type Patch = {dataset:string; key:string; id:string; before:Row; after:Row; reason:string; evidence:string};
const patches:Patch[]=[...u1.patches,...u2.patches,...pig.patches,...u3.patches,...u3Remaining.patches,...u4.patches];

// Keep the historical payload hashes intact. Check each explicitly recorded new
// field before reversing only that field for the old-release comparison.
export function beforeUnitAudit<T>(dataset:string, value:T):T {
  const name=dataset.replace(/\.json$/,'');
  const copy=structuredClone(value);
  if(name==='meta'){
    const row=copy as Row;
    const data=(file:string)=>readFileSync(new URL(`../../public/data/v1/${file}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
    const digest=createHash('sha256');
    for(const file of ['words','senses','examples','relations','morphemes','notes','exam_priority','hooks','media'])digest.update(data(file+'.json'));
    assert.equal(row.contentHash,digest.digest('hex'),'audit contentHash must describe the saved full payload');
    assert.equal(row.wordsHash,createHash('sha256').update(data('words.json')).digest('hex'),'audit wordsHash must describe saved words');
    Object.assign(row,{generatedAt:'2026-10-26T06:21:08Z',wordsHash:'0b4f19bc11039dd0c70b630461418e124225f870ac576748993df1481bb3ecad',contentHash:'26fdedbbc0e5e8e8f61976120ec57093ef3399856cdeba79542358d083c64008'});
    return copy;
  }
  if(!Array.isArray(copy))return copy;
  for(const patch of patches.filter(p=>p.dataset===name).reverse()){
    assert.ok(patch.reason&&patch.evidence,'each audit correction needs recorded evidence');
    const rows=copy.filter((r:Row)=>r[patch.key]===patch.id);
    assert.ok(rows.length<=1,'audit cannot conceal duplicate identities');
    if(!rows.length)continue; // A starter subset can omit full-dictionary rows.
    const row=rows[0] as Row;
    for(const [key,after]of Object.entries(patch.after))assert.deepEqual(row[key],after,`${name}:${patch.id}:${key}`);
    for(const key of Object.keys(patch.after)){
      assert.ok(Object.hasOwn(patch.before,key),'old value must be explicit');
      row[key]=patch.before[key];
    }
  }
  return copy;
}
