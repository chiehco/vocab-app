import { expect, it } from 'vitest';
import type { WordRecord } from '../../db/types';
import { practiceIds } from '../vocabulary/model';
import source from './curriculumLV6Unit21.json';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { wordCatalog } from './groupWords';
import { findUnit, templateGroup, unitItems } from './model';

const templateId = 'TEXTBOOK-LV6-U21';
const sharedWordId = 'W005860';

function catalogRecord(entry: (typeof wordCatalog)[number]): WordRecord {
  return {
    wordId: entry.wordId, word: entry.word, wordVariants: entry.variants,
    level: 'LV6', pos: null, posAll: [], meaningZh: null, meaningEn: null,
    usagePattern: null, syllables: null, stressPattern: null, phoneticUs: null,
    familyKey: null, isCore: false, sourceNote: null, status: 'test',
  };
}

it('LV6 U21 keeps textbook identity while resolving the 74 distinct general-vocabulary IDs in source order', () => {
  const group = templateGroup(templateId);
  const items = unitItems(templateId);
  const vocabulary = source.learningItems.filter(item => item.kind === 'vocabulary');
  const mapped = vocabulary.flatMap(item => item.officialWordId ? [item.officialWordId] : []);
  const expected = [...new Set(mapped)];
  expect(items.map(item => item.learningItemId)).toEqual(source.learningItems.map(item => item.learningItemId));
  expect(group.itemIds).toHaveLength(155);
  expect(new Set(group.itemIds).size).toBe(155);
  expect(vocabulary).toHaveLength(119);
  expect(mapped).toHaveLength(75);
  expect(expected).toHaveLength(74);
  expect(groupWordIds(group)).toEqual(expected);
  const records = wordCatalog.map(catalogRecord);
  expect(resolveGroupWords(group, records).map(word => word.wordId)).toEqual(expected);
  expect(groupWordIds({ ...group, wordIds: [sharedWordId, expected[0]] })).toEqual(expected);
});

it('keeps sportsman and sportswoman as distinct cards but one general practice record', () => {
  const cards = unitItems(templateId).filter(item => item.officialWordId === sharedWordId);
  expect(cards.map(item => item.learningItemId)).toEqual([
    'LI-LV6U21-P201-sportsman', 'LI-LV6U21-P201-sportswoman',
  ]);
  expect(cards.map(item => item.displayWord)).toEqual(['sportsman', 'sportswoman']);
  const pair = { itemIds: cards.map(item => item.learningItemId), wordIds: [sharedWordId] };
  expect(groupWordIds(pair)).toEqual([sharedWordId]);
  const record = wordCatalog.find(word => word.wordId === sharedWordId)!;
  expect(record.word).toBe('sportsman/sportswoman');
  expect(record.variants).toEqual(['sportsman', 'sportswoman']);
  expect(resolveGroupWords(pair, [catalogRecord(record)])).toEqual([catalogRecord(record)]);
});

it('does not turn a recovered read-only unit into textbook questions or promote unmapped items', () => {
  expect(source.learningItems.every(item => item.practiceMode === 'read_only')).toBe(true);
  expect(source.questions).toEqual([]);
  expect(findUnit(templateId)?.questions).toEqual([]);
  expect(practiceIds(unitItems(templateId))).toEqual([]);
  const unmapped = source.learningItems.filter(item => !item.officialWordId);
  expect(unmapped.filter(item => item.kind === 'vocabulary')).toHaveLength(44);
  expect(groupWordIds({ itemIds: unmapped.map(item => item.learningItemId) })).toEqual([]);
});
