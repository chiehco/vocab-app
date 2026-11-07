import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const lv3ImageHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateLV3ImageProof(proof){assert.equal(lv3ImageHash(proof),'79316aacfa05e1d9fa800c2449c21821d431f0f78477930f9c2364d1ca1cdc3b','Exact immutable image integration proof required');}
export function beforeLV3GeneralImages(rows,proof){
 validateLV3ImageProof(proof);
 assert.equal(rows.length,338);assert.equal(new Set(rows.map(r=>r.reviewId)).size,338);assert.equal(new Set(rows.map(r=>r.officialWordId)).size,338);
 assert.equal(lv3ImageHash(rows),proof.afterHash,'Unrecorded current row/order drift');
 assert.deepEqual(rows.at(-1),proof.permissible);
 assert.deepEqual(rows.filter(r=>r.officialWordId==='W000061'),[proof.bankAfter]);
 const copy=structuredClone(rows.slice(0,-1));copy[copy.findIndex(r=>r.reviewId===proof.bankAfter.reviewId)]=structuredClone(proof.bankBefore);
 assert.equal(lv3ImageHash(copy),proof.beforeHash,'Unrecorded historical registry drift');return copy;
}
