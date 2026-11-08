import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforePersuasiveImageText } from '../../../scripts/lv3_persuasive_image_guard.mjs';
import proof from '../../../docs/image-repairs/20261108/W003733-persuasive-v2.integration.json';

export const beforePersuasiveText = (text: string) => beforePersuasiveImageText(text, proof);
export function beforePersuasiveImages<T>(rows: readonly T[]): T[] {
  const text = readFileSync(proof.registry.path, 'utf8');
  const before = beforePersuasiveText(text);
  assert.deepEqual(rows, JSON.parse(text), 'Imported registry differs from verified disk bytes');
  return JSON.parse(before) as T[];
}
