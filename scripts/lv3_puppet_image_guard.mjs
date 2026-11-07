import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const puppetBytesHash=value=>createHash('sha256').update(value).digest('hex');
const semantic=value=>puppetBytesHash(JSON.stringify(value));
export function validateLV3PuppetProof(proof){assert.equal(semantic(proof),'cc9acb25d6e0f984ac26d79eafa0785dff4fe38b0b03edb31561a6fa453b11b6','Exact immutable puppet image proof required');}
export function validateLV3PuppetAsset(bytes,asset){assert.equal(puppetBytesHash(bytes),asset.sha256,'Image asset drift');}
export function beforeLV3PuppetText(text,proof){
 validateLV3PuppetProof(proof);
 const normalized=text.replace(/\r\n/g,'\n');
 // Hash before parsing: whitespace, duplicate keys, property order and all rows are evidence.
 assert.equal(puppetBytesHash(normalized),proof.afterLfSha256,'Unknown current image registry raw-byte drift');
 const rows=JSON.parse(normalized);
 assert.equal(semantic(rows),proof.afterHash,'Current image registry semantic drift');
 assert.deepEqual(rows,proof.after);assert.equal(rows.length,341);
 assert.equal(new Set(rows.map(r=>r.reviewId)).size,341);assert.equal(new Set(rows.map(r=>r.officialWordId)).size,341);
 assert.deepEqual(rows.at(-1),proof.row);
 const before=rows.slice(0,-1);assert.deepEqual(before,proof.before);
 assert.equal(semantic(before),proof.beforeHash);
 const output=JSON.stringify(before,null,2)+'\n';assert.equal(puppetBytesHash(output),proof.beforeLfSha256);
 return output;
}
