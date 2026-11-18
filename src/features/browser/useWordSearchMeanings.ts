import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentDb } from '../../db/contentDb';
import { recordedMeanings } from './meaningRecords';
import { normalizeDisplayChinese } from './wordDisplay';
import type { SenseRecord, WordRecord } from '../../db/types';

export function useWordSearchMeanings(words: WordRecord[] | undefined, searching: boolean) {
  const senses = useLiveQuery(() => contentDb.senses.toArray(), []);
  return useMemo(() => {
    const byWord = new Map<string, SenseRecord[]>();
    for (const sense of senses ?? []) {
      const rows = byWord.get(sense.wordId) ?? [];
      rows.push(sense);
      byWord.set(sense.wordId, rows);
    }
    const meanings = new Map<string, string>();
    for (const word of searching ? words ?? [] : []) {
      const rows = recordedMeanings(word, byWord.get(word.wordId) ?? []);
      meanings.set(word.wordId, rows.map(row => row.meaning).join(' '));
    }
    return { byWord, meanings, ready: !!words && !!senses };
  }, [words, senses, searching]);
}

export function normalizeWordQuery(value: string) {
  return normalizeDisplayChinese(value.normalize('NFKC')).toLowerCase();
}
