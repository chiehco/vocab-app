import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../db/contentDb';
import { getLogicalCardStates } from '../db/progressIdentity';
import { unitKey, type TextbookUnit } from '../features/vocabulary/textbookCatalog';

/** 每個單元已建卡（學過）的字數，以單元 key 對應。卡片以英文拼字為鍵，所以經主表把 wordId 換成拼字。 */
export function useUnitProgress(units: TextbookUnit[]) {
  return useLiveQuery(async () => {
    const [cards, words] = await Promise.all([getLogicalCardStates(), contentDb.words.bulkGet([...new Set(units.flatMap(u => u.wordIds))])]);
    const learned = new Set(cards.map(c => c.word));
    const spelling = new Map(words.flatMap(w => w ? [[w.wordId, w.word] as const] : []));
    return new Map(units.map(u => [unitKey(u), u.wordIds.filter(id => learned.has(spelling.get(id) ?? '')).length]));
  }, [units.map(unitKey).join('|')]);
}
