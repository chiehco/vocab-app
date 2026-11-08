import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeLV3U07RegistryText, beforeLV3U07CaptionText } from '../../../scripts/lv3_u07_image_caption_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-U07-image-caption-repairs.json';
import { beforePersuasiveText } from './lv3PersuasiveImageRepair.testSupport';

export function beforeU07RegistryText(text: string): string {
  return beforeLV3U07RegistryText(beforePersuasiveText(text), proof);
}
export function beforeU07CaptionText(text: string): string {
  return beforeLV3U07CaptionText(text, proof);
}
export function beforeU07Images<T>(rows: readonly T[]): T[] {
  const text = readFileSync(proof.registry.path, 'utf8');
  const before = beforeU07RegistryText(text);
  assert.deepEqual(rows, JSON.parse(text), 'Imported registry differs from verified disk bytes');
  return JSON.parse(before) as T[];
}
