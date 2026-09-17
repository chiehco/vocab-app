import { expect, it } from 'vitest';
import { groupWordIds, resolveGroupWords } from './groupScope';
import { wordCatalog } from './groupWords';
import { templateGroup, unitItems } from './model';
import type { WordRecord } from '../../db/types';

function word(wordId: string): WordRecord {
  const c = wordCatalog.find(w => w.wordId === wordId)!;
  return { ...c, level:'LV4', pos:'n.',posAll:['n.'],meaningZh:'字義',meaningEn:null,usagePattern:null,syllables:null,stressPattern:null,phoneticUs:null,familyKey:null,isCore:false,sourceNote:null,status:'reviewed' };
}
const allWords = wordCatalog.map(w => word(w.wordId));

it('resolves a template group through officialWordId, skipping grammar items and words missing from the master table', () => {
  const group = templateGroup('LV4-U17');
  const vocab = unitItems('LV4-U17').filter(i => i.kind === 'vocabulary');
  const expected = vocab.filter(i => i.officialWordId).map(i => i.officialWordId as string);
  expect(vocab).toHaveLength(46);
  expect(groupWordIds(group)).toEqual(expected);
  expect(groupWordIds(group)).toHaveLength(43);
  const words = resolveGroupWords(group, allWords);
  expect(words.map(w => w.word)).not.toContain('reluctance');
  expect(words[0].word).toBe('elementary');
});

it('returns wordIds as-is for a blank group and dedupes overlap with unit items', () => {
  const blank = { itemIds: [], wordIds: ['W000002', 'W002618'] };
  expect(groupWordIds(blank)).toEqual(['W000002', 'W002618']);
  const group = templateGroup('LV4-U17');
  const first = groupWordIds(group)[0];
  const merged = groupWordIds({ ...group, wordIds: [first, 'W000002'] });
  expect(merged.filter(id => id === first)).toHaveLength(1);
  expect(merged.at(-1)).toBe('W000002');
  expect(resolveGroupWords({ itemIds: [], wordIds: ['W999999'] }, allWords)).toEqual([]);
});
