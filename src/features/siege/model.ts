import type { WordRecord } from '../../db/types';
import { curriculumUnits } from '../direct/model';
import { lv1ReviewedGroups } from '../direct/lv1ReviewedGroups';

export type SiegeWord = [word: string, meaning: string];

/** Keep original spellings: phrases, optional endings and punctuation are not silently rewritten. */
export function eligibleWords(rows: SiegeWord[]): SiegeWord[] {
  const seen = new Set<string>();
  return rows.flatMap(([word, meaning]) => {
    const spelling = word.trim().toUpperCase();
    if (!/^[A-Z]{2,16}$/.test(spelling) || !meaning.trim() || seen.has(spelling)) return [];
    seen.add(spelling);
    return [[spelling, meaning.trim()] as SiegeWord];
  });
}

export function siegeUnitWords(level: string, unit: number, dictionary: WordRecord[]): SiegeWord[] {
  if (level === 'LV1') {
    const group = lv1ReviewedGroups.find(g => g.unit === unit);
    const ids = new Set(group?.wordIds ?? []);
    return eligibleWords(dictionary.filter(w => ids.has(w.wordId)).map(w => [w.word, w.meaningZh ?? '']));
  }
  const source = curriculumUnits.find(u => u.level === level && u.unit === unit);
  return eligibleWords((source?.items ?? []).filter(i => i.kind === 'vocabulary')
    .map(i => [i.displayWord ?? '', i.targetMeaningZh ?? '']));
}

/** Only used inside a script element; never interpolate raw curriculum text into executable HTML. */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
