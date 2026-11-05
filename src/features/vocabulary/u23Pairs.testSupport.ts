import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Reconstruct an earlier protected image snapshot only after validating the full
// exact U23 after row. This is test support, not a production image exception.
export function beforeU23Pairs<T extends {id:string}>(rows:T[],kind:'cards'|'approvals'):T[]{
 const bytes=readFileSync('docs/unit-audit-20261105/LV1-U23-exact-pair-review.json','utf8');
 const proof=JSON.parse(bytes);
 const digest=createHash('sha256').update(bytes).digest('hex');
 assert.deepEqual(proof.changes.map((c:{id:string})=>c.id),['LV1-U23-50','LV1-U23-84','LV1-U23-97']);
 const copy=structuredClone(rows);
 for(const change of proof.changes){
  const matches=copy.filter(r=>r.id===change.id);assert.equal(matches.length,1,'exact audited identity required');
  const expected=kind==='cards'?change.after.card:{...change.after.approval,approvalSha256:digest};
  assert.deepEqual(matches[0],expected,'exact U23 after pair or approval changed');
  const index=copy.findIndex(r=>r.id===change.id);
  copy[index]=structuredClone(kind==='cards'?change.before.card:change.before.approval);
 }
 return copy;
}
