import { beforeU16ExampleImageSource } from './lv3U16ExampleImages.testSupport';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import proof from '../../../docs/lv3-audit-20261107/U15-example-images-resolver-integration.json';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function validateU15ExampleImageSourceProof(value: unknown = proof) {
  assert.equal(hash(JSON.stringify(value)), '1b9234d1a608f6c4b276328634e5c5e86465f108e84e9363224865ae25097295', 'Immutable U15 source proof drift');
}
export function beforeU15ExampleImageSource(path: string, value: string) {
  validateU15ExampleImageSourceProof();
  const row = proof.files.find(file => file.path === path);
  assert.ok(row, 'Unrecorded U15 source path');
  const normalized = beforeU16ExampleImageSource(path, value);
  assert.equal(hash(normalized), row.afterLfSha256, 'Unrecorded U15 source drift');
  assert.equal(normalized, row.afterText, 'Unrecorded U15 source bytes');
  assert.equal(hash(row.beforeText), row.beforeLfSha256, 'Historical U15 source proof drift');
  return row.beforeText;
}
