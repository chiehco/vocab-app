import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

/** LiveABC Basic units photo-checked 2026-11-22, appended after every sealed checkpoint. */
const PATH = 'src/features/direct/liveabcBasic.json';
const APPENDS = [
  { unit: 'U08', sha256: 'f33f31d13daf991d585b77ca1eb510aca14207331cdb8b3dfb6f7bc1d2156433' },
  { unit: 'U10', sha256: '515d26851c01be267dc7c0c8f4820367cf451c8f24f5302fd451e365ab772534' },
];

/** Reverse only the exact authenticated appends, newest first; any other drift throws. */
const U09_BLOCK_SHA256 = '057e2c947b26745289195d7c2e6a7753d45a2474df813218545b80157523735f';
const marker = (unit: string) => `,\n  {\n    "templateId": "TEXTBOOK-LIVEABC_BASIC-${unit}"`;

export function beforeLiveabcU08Text(path: string, text: string): string {
  if (path !== PATH) return text;
  let out = text;
  // U09 was inserted last, between U08 and U10.
  const u09 = out.indexOf(marker('U09'));
  if (u09 >= 0) {
    const end = out.indexOf(marker('U10'), u09);
    assert.ok(end > u09, 'LiveABC U09 block boundary drift');
    assert.equal(createHash('sha256').update(out.slice(u09, end)).digest('hex'), U09_BLOCK_SHA256, 'LiveABC U09 block drift');
    out = out.slice(0, u09) + out.slice(end);
  }
  for (const { unit, sha256 } of [...APPENDS].reverse()) {
    const at = out.indexOf(marker(unit));
    if (at < 0) continue;
    const suffix = out.slice(at);
    assert.equal(createHash('sha256').update(suffix).digest('hex'), sha256, `LiveABC ${unit} append drift`);
    out = out.slice(0, at) + '\n]\n';
  }
  return out;
}
