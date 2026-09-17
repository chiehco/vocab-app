import { learningItems, type CustomGroup } from './model';
import { groupWords } from './groupWords';
import type { WordRecord } from '../../db/types';

// Lives apart from groupWords.ts because model.ts already imports that file; importing model here would loop.
const officialWordIdByItemId = new Map(
  learningItems.flatMap(i => i.officialWordId ? [[i.learningItemId, i.officialWordId] as const] : []),
);

/** 群組成員展開成主表 wordId：Unit 項目經 officialWordId 對回主表，文法項與主表未收的字略過；保留群組順序、去重。 */
export function groupWordIds(group: Pick<CustomGroup, 'itemIds' | 'wordIds'>): string[] {
  const fromItems = group.itemIds.flatMap(id => { const w = officialWordIdByItemId.get(id); return w ? [w] : []; });
  return [...new Set([...fromItems, ...(group.wordIds ?? [])])];
}

export function resolveGroupWords(group: Pick<CustomGroup, 'itemIds' | 'wordIds'>, words: WordRecord[]): WordRecord[] {
  return groupWords(groupWordIds(group), words);
}
