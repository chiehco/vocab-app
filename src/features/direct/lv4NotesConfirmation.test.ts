import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import source from '../../../scripts/sources/LV4Unit2.json';
import pack from './curriculumLV4Unit2.json';
import baseline from '../../../scripts/fixtures/lv4-u2-notes-confirmation-baseline.json';
import starter from '../../../public/data/v1/sa-pack.json';
import { findUnit, templateGroup } from './model';
import { groupWordIds } from './groupScope';
import { textbookUnits } from '../vocabulary/textbookCatalog';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(row).sort().map(key => [key, stable(row[key])]));
  }
  return value;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

it('records physical-book confirmation of blank p22 without claiming a new photo or textbook content', () => {
  expect(source.sourcePages).toEqual([11, 21]);
  expect(source.boundaryEvidence).toMatchObject({ notesPage: 22, nextUnitPage: 23,
    notesConfirmationStatus: 'confirmed_blank_notes_by_owner',
    notesConfirmationEvidence: {kind:'owner_physical_book_confirmation',confirmedAtUtc:'2026-10-29T14:18:00Z',pageType:'blank_notes',fullPagePhotograph:false},
  });
  expect(source.photos.map(photo => photo.page).sort((a,b)=>a-b)).toEqual(Array.from({length:11}, (_,i)=>i+11));
  expect(pack.learningItems.some(item => item.sourcePage === 22)).toBe(false);
  expect(hash(pack)).toBe(baseline.unitPackHash);
  const unit = findUnit(2, 'LV4')!;
  expect(unit.items.map(item => item.learningItemId)).toEqual(baseline.itemIds);
  expect(unit.items).toHaveLength(164);
  expect(unit.items.filter(item => item.kind === 'vocabulary')).toHaveLength(127);
  expect(unit.items.filter(item => item.kind === 'grammar')).toHaveLength(37);
  expect(unit.items.filter(item => item.kind === 'vocabulary' && !item.officialWordId)).toHaveLength(24);
  expect(unit.items.every(item => item.practiceMode === 'read_only' && !item.officialSenseId && !item.illustration && !item.originalExample)).toBe(true);
  expect(groupWordIds(templateGroup(2, 'LV4'))).toEqual(baseline.wordIds);
  expect(baseline.wordIds).toHaveLength(102);
  expect(baseline.wordIds.every(id => starter.words.some(word => word.wordId === id))).toBe(true);
  expect(textbookUnits.filter(unit => unit.level === 'LV4')).toHaveLength(24);
  expect(textbookUnits).toHaveLength(146);
});

it('keeps every public content dataset, including the5779-word starter, exactly unchanged', () => {
  for (const file of baseline.publicFiles) {
    expect(hash(JSON.parse(readFileSync(`public/data/v1/${file.name}`, 'utf8'))),file.name).toBe(file.payloadHash);
  }
  expect(starter.words).toHaveLength(5779);
});
