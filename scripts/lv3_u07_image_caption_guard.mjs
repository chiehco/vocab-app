import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const u07ImageBytesHash = value => createHash('sha256').update(value).digest('hex');
export function validateLV3U07ImageProof(proof) {
  assert.equal(u07ImageBytesHash(JSON.stringify(proof)),
    'c05db0cdf1af09f8573527020798f0782661a1dad498e3fbf0a83403ab98e535',
    'Exact immutable U07 image/caption proof required');
}

// Authenticate every current byte before parsing. Only CRLF normalization is
// portable; unknown whitespace, duplicate keys, ordering or other edits fail.
function inverseExact(text, proof, key) {
  validateLV3U07ImageProof(proof);
  const delta = proof[key];
  const normalized = text.replace(/\r\n/g, '\n');
  assert.equal(u07ImageBytesHash(normalized), delta.afterLfSha256,
    'Unknown current U07 ' + key + ' raw-byte drift');
  const rows = JSON.parse(normalized);
  assert.equal(rows.length, delta.rowCount);
  assert.deepEqual(rows[delta.index], delta.after);
  assert.equal(normalized.split(delta.afterToken).length, 2, 'Unique exact after token required');
  const before = normalized.replace(delta.afterToken, delta.beforeToken);
  assert.equal(u07ImageBytesHash(before), delta.beforeLfSha256, 'Wrong original U07 raw-byte inverse');
  const oldRows = JSON.parse(before);
  assert.deepEqual(oldRows[delta.index], delta.before);
  assert.deepEqual(rows.filter((_, index) => index !== delta.index),
    oldRows.filter((_, index) => index !== delta.index));
  return before;
}

export function beforeLV3U07RegistryText(text, proof) {
  return inverseExact(text, proof, 'registry');
}
export function beforeLV3U07CaptionText(text, proof) {
  return inverseExact(text, proof, 'captions');
}
