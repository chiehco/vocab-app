import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import baseline from '../../../scripts/fixtures/recovered-unit-integration-baseline.json';
import pack12 from './curriculumLV3Unit12.json';
import pack18 from './curriculumLV3Unit18.json';
import pack21 from './curriculumLV6Unit21.json';
import { findUnit, templateGroup, type LearningItem } from './model';
import { groupWordIds } from './groupScope';
import { textbookUnits } from '../vocabulary/textbookCatalog';
import { practiceIds } from '../vocabulary/model';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(key => [key, stable(row[key])]));
  }
  return value;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

it('retains every pre-integration curriculum payload and question identity', () => {
  const existing = new Map<string, {items: unknown[]; questions: unknown[]}>();
  const record = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(record); return; }
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    const template = row.template as {templateId: string} | undefined;
    if (template && Array.isArray(row.learningItems)) existing.set(template.templateId,
      {items: row.learningItems, questions: (row.questions ?? row.grammarQuestions ?? []) as unknown[]});
    else if (typeof row.templateId === 'string' && Array.isArray(row.items)) existing.set(row.templateId,
      {items: row.items, questions: (row.questions ?? []) as unknown[]});
  };
  const dir = new URL('./', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json'))) record(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
  expect(baseline.previousUnits).toHaveLength(124);
  for (const old of baseline.previousUnits) {
    const retained = existing.get(old.templateId)!;
    expect(retained, old.templateId).toBeDefined();
    expect(retained.items).toHaveLength(old.count);
    expect(hash(retained.items), old.templateId).toBe(old.itemsHash);
    expect(hash(retained.questions), old.templateId).toBe(old.questionsHash);
    expect(findUnit(old.templateId)?.items).toEqual(retained.items);
  }
});

it.each([
  {pack: pack12, vocabulary: 119, usage: 63, mapped: 96, unmapped: 22},
  {pack: pack18, vocabulary: 102, usage: 44, mapped: 85, unmapped: 16},
  {pack: pack21, vocabulary: 119, usage: 36, mapped: 74, unmapped: 44},
])('registers $pack.template.templateId as complete text with honest supplement and practice boundaries', ({pack, vocabulary, usage, mapped, unmapped}) => {
  const unit = findUnit(pack.template.templateId)!;
  const catalog = textbookUnits.find(u => u.level === unit.level && u.unit === unit.unit)!;
  expect(unit.items).toEqual(pack.learningItems);
  expect(catalog).toMatchObject({count: vocabulary, usageCount: usage, partial: false});
  expect(catalog.wordIds).toHaveLength(mapped);
  const group = templateGroup(unit.templateId);
  expect(group.itemIds).toEqual(unit.items.map(item => item.learningItemId));
  expect(group.itemIds).toHaveLength(vocabulary + usage);
  expect(groupWordIds(group)).toEqual(catalog.wordIds);
  expect(unit.items.filter(item => item.kind === 'vocabulary' && !item.officialWordId)).toHaveLength(unmapped);
  expect(unit.items.every(item => item.practiceMode === 'read_only' && !item.officialSenseId && !item.illustration && !item.originalExample)).toBe(true);
  expect(practiceIds(unit.items as LearningItem[])).toEqual([]);
  expect(unit.questions).toEqual([]);
  expect(pack.releaseReview).toMatchObject({requiresSeparateDataRelease: true, senseApprovalChange: false, artworkAdopted: false});
  const historical = JSON.parse(readFileSync(new URL(`../../../scripts/drafts/recovered-units/${unit.level}Unit${unit.unit}.curriculum.json`, import.meta.url), 'utf8'));
  expect(unit.items).toEqual(historical.learningItems);
});
