import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const confirmBytesHash=value=>createHash('sha256').update(value).digest('hex');
const semantic=value=>confirmBytesHash(JSON.stringify(value));
export function validateLV3ConfirmProof(proof){assert.equal(semantic(proof),'ffded71e7bfb416c381dba72b3fb00e0b3757f8275750d9a92c4c492c702508e','Exact immutable confirm image proof required');}
export function validateLV3ConfirmAsset(bytes,asset){assert.equal(confirmBytesHash(bytes),asset.sha256,'Image asset drift');}
export function beforeLV3ConfirmText(text,proof){
 validateLV3ConfirmProof(proof);
 const normalized=text.replace(/\r\n/g,'\n');
 // Hash before parsing: whitespace, duplicate keys, property order and all rows are evidence.
 assert.equal(confirmBytesHash(normalized),proof.afterLfSha256,'Unknown current image registry raw-byte drift');
 const rows=JSON.parse(normalized);
 assert.equal(semantic(rows),proof.afterHash,'Current image registry semantic drift');
 assert.deepEqual(rows,proof.after);assert.equal(rows.length,340);
 assert.equal(new Set(rows.map(r=>r.reviewId)).size,340);assert.equal(new Set(rows.map(r=>r.officialWordId)).size,340);
 assert.deepEqual(rows.at(-1),proof.row);
 const before=rows.slice(0,-1);assert.deepEqual(before,proof.before);
 assert.equal(semantic(before),proof.beforeHash);
 const output=JSON.stringify(before,null,2)+'\n';assert.equal(confirmBytesHash(output),proof.beforeLfSha256);
 return output;
}
