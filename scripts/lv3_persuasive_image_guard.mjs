import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const persuasiveImageHash = value => createHash('sha256').update(value).digest('hex');
export function validatePersuasiveImageProof(proof) {
  assert.equal(persuasiveImageHash(JSON.stringify(proof)),
    '6a746eb642a66163585a4277b9f5295934aaf72dbdee073a852e5990d5132b89', 'Exact immutable persuasive image proof required');
}

// Accept the recorded current bytes only, not arbitrary parsed rows or subsets.
// CRLF normalization is the sole portable transformation before authentication.
export function beforePersuasiveImageText(text, proof) {
  validatePersuasiveImageProof(proof);
  const delta = proof.registry;
  const normalized = text.replace(/\r\n/g, '\n');
  assert.equal(persuasiveImageHash(normalized), delta.afterLfSha256,
    'Unknown current persuasive registry raw-byte drift');
  const rows = JSON.parse(normalized);
  assert.equal(rows.length, delta.beforeCount + 1);
  assert.deepEqual(rows.at(-1), delta.added);
  assert.equal(rows.filter(row => row.officialWordId === delta.added.officialWordId).length, 1);
  assert.equal(normalized.split(delta.afterToken).length, 2, 'Unique exact appended token required');
  const before = normalized.replace(delta.afterToken, delta.beforeToken);
  assert.equal(persuasiveImageHash(before), delta.beforeLfSha256, 'Wrong original persuasive raw-byte inverse');
  assert.deepEqual(rows.slice(0, -1), JSON.parse(before));
  return before;
}
