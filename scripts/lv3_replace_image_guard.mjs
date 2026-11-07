import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const replaceBytesHash=value=>createHash('sha256').update(value).digest('hex');
const semantic=value=>replaceBytesHash(JSON.stringify(value));
export function validateLV3ReplaceProof(proof){assert.equal(semantic(proof),'db566766a714d2c4e4755394cc37e3292b7f6d8f8949aa1a23c276d20bfa76a8','Exact immutable replace image proof required');}
export function validateLV3ReplaceAsset(bytes,asset){assert.equal(replaceBytesHash(bytes),asset.sha256,'Image asset drift');}
export function beforeLV3ReplaceText(text,proof){
 validateLV3ReplaceProof(proof);
 const normalized=text.replace(/\r\n/g,'\n');
 // Hash before parsing: whitespace, duplicate keys, property order and all rows are evidence.
 assert.equal(replaceBytesHash(normalized),proof.afterLfSha256,'Unknown current image registry raw-byte drift');
 const rows=JSON.parse(normalized);
 assert.equal(semantic(rows),proof.afterHash,'Current image registry semantic drift');
 assert.deepEqual(rows,proof.after);assert.equal(rows.length,339);
 assert.equal(new Set(rows.map(r=>r.reviewId)).size,339);assert.equal(new Set(rows.map(r=>r.officialWordId)).size,339);
 assert.deepEqual(rows.at(-1),proof.row);
 const before=rows.slice(0,-1);assert.deepEqual(before,proof.before);
 assert.equal(semantic(before),proof.beforeHash);
 const output=JSON.stringify(before,null,2)+'\n';assert.equal(replaceBytesHash(output),proof.beforeLfSha256);
 return output;
}
