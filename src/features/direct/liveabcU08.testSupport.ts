import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** LiveABC Basic U08 (photo-checked 2026-11-22) was appended after every sealed checkpoint. */
const PATH = 'src/features/direct/liveabcBasic.json';
const MARKER = ',\n  {\n    "templateId": "TEXTBOOK-LIVEABC_BASIC-U08"';
const SUFFIX_SHA256 = 'f33f31d13daf991d585b77ca1eb510aca14207331cdb8b3dfb6f7bc1d2156433';

/** Reverse only the exact authenticated U08 append; any other drift throws. */
export function beforeLiveabcU08Text(path: string, text: string): string {
  if (path !== PATH) return text;
  const at = text.indexOf(MARKER);
  if (at < 0) return text;
  const suffix = text.slice(at);
  assert.equal(createHash('sha256').update(suffix).digest('hex'), SUFFIX_SHA256, 'LiveABC U08 append drift');
  return text.slice(0, at) + '\n]\n';
}
