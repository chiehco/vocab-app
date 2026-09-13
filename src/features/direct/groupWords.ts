import catalog from './wordCatalog.json';
import type { WordRecord } from '../../db/types';

// Snapshot of the existing LV1–LV6 catalogue, not a claim that 7,000 cards are ready.
export const wordCatalog = catalog;
export const catalogWordIds = new Set(catalog.map(w => w.wordId));
export function groupWords(ids: string[], words: WordRecord[]): WordRecord[] {
  const byId = new Map(words.map(w => [w.wordId, w]));
  return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
}
export const normalizeImportWord = (word: string) => word.trim().normalize('NFKC').toLowerCase()
  .replace(/[’‘]/g, "'").replace(/[‐‑–]/g, '-').replace(/\s+/g, ' ');
