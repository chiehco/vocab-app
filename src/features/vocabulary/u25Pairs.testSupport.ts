import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Validate the entire exact current row before reconstructing the older fixture.
export function beforeU25Pairs<T extends {id:string}>(rows:T[],kind:'cards'|'approvals'):T[]{
 const bytes=readFileSync('docs/unit-audit-20261105/LV1-U25-exact-pair-review.json','utf8');
 const proof=JSON.parse(bytes),digest=createHash('sha256').update(bytes).digest('hex');
 assert.deepEqual(proof.changes.map((c:{id:string})=>c.id),['LV1-U25-31']);
 const copy=structuredClone(rows),change=proof.changes[0],matches=copy.filter(r=>r.id===change.id);
 assert.equal(matches.length,1,'exact audited identity required');
 assert.deepEqual(matches[0],kind==='cards'?change.after.card:{...change.after.approval,approvalSha256:digest},'exact U25 after pair or approval changed');
 copy[copy.findIndex(r=>r.id===change.id)]=structuredClone(kind==='cards'?change.before.card:change.before.approval);
 return copy;
}
